#!/bin/sh
set -eu
name=$1
version=${SHW_PLUGIN_VERSION:-7.5.7}
base=${SHW_PLUGIN_RELEASE_BASE_URL:-https://github.com/ilovintit/shw-plugins/releases/download/v$version}
cache_root=${XDG_CACHE_HOME:-${HOME:-/tmp/.cache}}/shw-plugins/$version
target=$cache_root/$name
mkdir -p "$cache_root"
if [ ! -x "$target" ]; then
  tmp=$target.tmp
  trap 'rm -f "$tmp"' EXIT
  command -v curl >/dev/null 2>&1 || { echo "shw-plugins: curl is required to download $name" >&2; exit 1; }
  curl -fsSL "$base/$name" -o "$tmp"
  sums=$cache_root/SHA256SUMS
  curl -fsSL "$base/SHA256SUMS" -o "$sums"
  expected=$(awk -v n="$name" '$2==n || $2=="*"n {print $1; exit}' "$sums")
  [ -n "$expected" ] || { echo "shw-plugins: checksum missing for $name" >&2; exit 1; }
  actual=$(sha256sum "$tmp" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$tmp" | awk '{print $1}')
  [ "$actual" = "$expected" ] || { echo "shw-plugins: checksum mismatch for $name" >&2; exit 1; }
  chmod 755 "$tmp"
  mv "$tmp" "$target"
  trap - EXIT
fi
printf '%s\n' "$target"
