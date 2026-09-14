#!/bin/sh
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
config=${SHW_K8S_PROFILE:-${XDG_CONFIG_HOME:-${HOME:-}/shw-plugins/kubernetes.env}}
if [ -z "${SHW_K8S_PROFILE:-}" ] && [ ! -f "$config" ]; then
  echo "shw-kubernetes: missing user Kubernetes configuration" >&2
  exit 1
fi
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) target=darwin-arm64 ;;
  Darwin/x86_64) target=darwin-amd64 ;;
  Linux/x86_64|Linux/amd64) target=linux-amd64 ;;
  *) echo 'shw-kubernetes: unsupported platform (darwin arm64/amd64, linux amd64)' >&2; exit 1 ;;
esac
bin="$dir/bin/shw-kubernetes-$target"
[ -x "$bin" ] || bin=$("$dir/../runtime/download-binary.sh" "shw-kubernetes-$target") || exit $?
exec "$bin"
