#!/bin/sh
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -n "${XDG_CONFIG_HOME:-}" ]; then
  config_root=$XDG_CONFIG_HOME
elif [ -n "${HOME:-}" ]; then
  config_root=$HOME/.config
else
  config_root=
fi
config=$config_root/shw-plugins/kubernetes.env
if [ -n "${SHW_K8S_PROFILE:-}" ]; then
  config=$config_root/shw-plugins/kubernetes.${SHW_K8S_PROFILE}.env
fi
if [ -z "$config_root" ] || [ ! -f "$config" ]; then
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
