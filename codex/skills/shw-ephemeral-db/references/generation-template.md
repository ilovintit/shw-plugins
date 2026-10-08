# 生成容器模板

采用 shell 模板时先读本文件及[入口](../SKILL.md)的前置条件、清理和凭据边界。此模板用于代码生成，不运行自动测试。

### 参考模板（按项目实际命令替换标注处）

```bash
set -euo pipefail

IMAGE="<内部已验证的 postgres:18 引用或 @sha256 digest>"   # 口径见 shw-backend-stack
NAME="shw-gen-${ISSUE:-local}-$RANDOM"
PASS="$(openssl rand -hex 16)"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD="$PASS" -e POSTGRES_DB=app \
  -p 127.0.0.1::5432 \
  --tmpfs /var/lib/postgresql/data \
  "$IMAGE" >/dev/null

PORT="$(docker port "$NAME" 5432/tcp | head -1 | sed 's/.*://')"

for i in $(seq 1 60); do
  docker exec "$NAME" pg_isready -U postgres -d app >/dev/null 2>&1 && break
  [ "$i" = 60 ] && { echo "数据库 60s 未就绪，放弃"; exit 1; }
  sleep 1
done

export DB_HOST=127.0.0.1 DB_PORT="$PORT" DB_USER=postgres DB_PASS="$PASS" DB_NAME=app

<项目的全量迁移命令>       # 例：go run main.go migrate
<生成命令>                 # 例：gf gen dao
```
