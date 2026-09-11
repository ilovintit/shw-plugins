#!/bin/sh
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) target=darwin-arm64 ;;
  Darwin/x86_64) target=darwin-amd64 ;;
  Linux/x86_64|Linux/amd64) target=linux-amd64 ;;
  *) echo 'shw-worktree: unsupported platform (darwin arm64/amd64, linux amd64)' >&2; exit 1 ;;
esac
exec "$dir/bin/shw-worktree-$target"
