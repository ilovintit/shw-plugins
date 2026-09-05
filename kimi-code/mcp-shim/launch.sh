#!/bin/sh
# gitea-mcp-shim 平台选择与通用 env 配置启动器（POSIX sh）。
#
# 职责：
# 1. 统一读取用户级与当前工作区的 gitea env 文件；只接受简单赋值，
#    不 source 用户文件，避免项目配置文件获得任意 shell 执行权。
# 2. 按 uname -s / uname -m 把调用方引到同目录 bin/ 下的平台二进制
#    gitea-mcp-shim-<os>-<arch>（darwin/arm64、darwin/amd64、linux/amd64 三选一），
#    规避各客户端 MCP 配置无法感知平台的差异；未支持平台向 stderr 打一行
#    明确错误后 exit 1。
set -u

# 只加载 KEY=value 形式的 GITEA_* 变量；不执行文件中的 shell 命令。
# 加载顺序：用户级文件先读，工作区文件后读；同名 key 由后者覆盖前者。
# 用户文件可配置全部 GITEA_*；工作区文件只允许 HOST / ACCESS_TOKEN。
# 文件中的同名 key 也会覆盖调用方已注入的 env，从而保证
# 工作区 > 用户级 > 调用方兜底 env 的可预测配置链。
load_gitea_env_file() {
  file=$1
  allow_advanced=${2:-}
  # 在文件存在检查之前初始化：确保 set -u 下无文件（提前 return）路径也安全。
  loaded_host=
  loaded_token=
  [ -f "$file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%"$(printf '\r')"}
    case "$line" in
      '' | '#'*) continue ;;
    esac
    case "$line" in
      'export '*) line=${line#'export '} ;;
    esac
    case "$line" in
      [A-Za-z_]*=*) ;;
      *) continue ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    # 严格 key 校验：畸形 key（含特殊字符 / 空）直接跳过，不让 export 因 dash 兼容性整体退出。
    case "$key" in
      [A-Za-z_][A-Za-z0-9_]*) ;;
      *) continue ;;
    esac

    # 工作区可能来自不可信仓库：只允许 host/token 两个业务变量。
    # GITEA_MCP_BIN / CACHE_DIR / DOWNLOAD_BASE 等执行链变量只留给用户级配置。
    case "$key" in
      GITEA_HOST | GITEA_ACCESS_TOKEN) ;;
      GITEA_[A-Za-z0-9_]*[A-Za-z0-9_]|GITEA_?)
        [ "$allow_advanced" = "advanced" ] || continue
        ;;
      *) continue ;;
    esac

    # 仅支持整段单引号/双引号；不做 shell 展开，避免配置文件变成可执行入口。
    case "$value" in
      '"'*'"')
        value=${value#\"}
        value=${value%\"}
        ;;
      "'"*"'" )
        value=${value#\'}
        value=${value%\'}
        ;;
    esac
    export "$key=$value"
    case "$key" in
      GITEA_HOST) loaded_host=$value ;;
      GITEA_ACCESS_TOKEN) loaded_token=1 ;;
    esac
  done <<EOF
$(tr -d '\r' < "$file"; printf '\n')
EOF
}

if [ -n "${XDG_CONFIG_HOME:-}" ]; then
  load_gitea_env_file "$XDG_CONFIG_HOME/shw-plugins/gitea.env" advanced
elif [ -n "${HOME:-}" ]; then
  load_gitea_env_file "$HOME/.config/shw-plugins/gitea.env" advanced
fi
original_host=${GITEA_HOST:-}
load_gitea_env_file "${SHW_MCP_WORKDIR:-$PWD}/.shw-plugins/gitea.env"

# 工作区文件若换到不同 HOST 却未给项目 token，绝不能把旧 token 发到新 HOST。
# 这是防止克隆不可信仓库后凭据外泄的硬闸；合法项目级实例必须自带完整凭证。
if [ -n "$loaded_host" ] && [ -z "$loaded_token" ] && [ "$loaded_host" != "$original_host" ]; then
  unset GITEA_ACCESS_TOKEN
fi

dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
os=$(uname -s)
arch=$(uname -m)

case "$os" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *)
    echo "gitea-mcp-shim: 不支持的平台 $os（仅支持 darwin / linux）" >&2
    exit 1
    ;;
esac

case "$arch" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=amd64 ;;
  *)
    echo "gitea-mcp-shim: 不支持的架构 $arch（仅支持 arm64 / amd64）" >&2
    exit 1
    ;;
esac

bin="$dir/bin/gitea-mcp-shim-$os-$arch"

# 发行物可能缺执行位：补一次（容忍失败，如只读安装场景）；失败则由 exec 自然报错。
chmod +x "$bin" 2>/dev/null || true

exec "$bin" "$@"
