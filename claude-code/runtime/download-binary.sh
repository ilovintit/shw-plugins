#!/bin/sh
set -eu
name=$1
version=${SHW_PLUGIN_VERSION:-7.8.3}
base=${SHW_PLUGIN_RELEASE_BASE_URL:-https://github.com/ilovintit/shw-plugins/releases/download/v$version}
cache_root=${XDG_CACHE_HOME:-${HOME:-/tmp/.cache}}/shw-plugins/$version
target=$cache_root/$name
mkdir -p "$cache_root"
if [ ! -x "$target" ]; then
  tmp=$(mktemp "$cache_root/.${name}.download.XXXXXX")
  sums=$(mktemp "$cache_root/.SHA256SUMS.XXXXXX")
  trap 'rm -f "$tmp" "$sums"' EXIT
  command -v curl >/dev/null 2>&1 || { echo "shw-plugins: curl is required to download $name" >&2; exit 1; }
  curl -fsSL "$base/$name" -o "$tmp"
  curl -fsSL "$base/SHA256SUMS" -o "$sums"
  expected=$(awk -v n="$name" '$2==n || $2=="*"n {print $1; exit}' "$sums")
  [ -n "$expected" ] || { echo "shw-plugins: checksum missing for $name" >&2; exit 1; }
  if command -v sha256sum >/dev/null 2>&1 && actual=$(sha256sum "$tmp"); then
    actual=${actual%% *}
  elif command -v shasum >/dev/null 2>&1; then
    actual=$(shasum -a 256 "$tmp")
    actual=${actual%% *}
  else
    echo "shw-plugins: sha256sum or shasum is required to verify $name" >&2
    exit 1
  fi
  [ "$actual" = "$expected" ] || { echo "shw-plugins: checksum mismatch for $name" >&2; exit 1; }
  chmod 755 "$tmp"
  mv "$tmp" "$target"
  trap - EXIT
fi
printf '%s\n' "$target"
