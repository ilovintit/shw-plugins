#!/bin/sh
# gitea-mcp-shim 平台选择启动器（POSIX sh）。
#
# 职责：按 uname -s / uname -m 把调用方引到同目录 bin/ 下的平台二进制
# gitea-mcp-shim-<os>-<arch>（darwin/arm64、darwin/amd64、linux/amd64 三选一），
# 规避各客户端 MCP 配置无法感知平台的差异；未支持平台向 stderr 打一行
# 明确错误后 exit 1。
set -u

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
