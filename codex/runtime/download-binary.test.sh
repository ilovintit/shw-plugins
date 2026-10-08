#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
tmp=$(mktemp -d "${TMPDIR:-/tmp}/shw-download-test.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/cache"
printf 'fixture binary\n' > "$tmp/binary"
hasher=$(command -v sha256sum)
sum=$("$hasher" "$tmp/binary" | awk '{print $1}')
printf '%s  shw-worktree-linux-amd64\n' "$sum" > "$tmp/SHA256SUMS"

cat > "$tmp/bin/curl" <<'EOF'
#!/bin/sh
set -eu
out=
url=
for arg in "$@"; do
  if [ "${previous:-}" = -o ]; then out=$arg; fi
  previous=$arg
  case "$arg" in http://*|https://*) url=$arg ;; esac
done
case "$url" in
  */SHA256SUMS) cp "$SHW_TEST_SUMS" "$out" ;;
  *) cp "$SHW_TEST_BINARY" "$out" ;;
esac
EOF
chmod 755 "$tmp/bin/curl"
cat > "$tmp/bin/sha256sum" <<'EOF'
#!/bin/sh
exit 127
EOF
cat > "$tmp/bin/shasum" <<'EOF'
#!/bin/sh
set -eu
test "$1" = -a && test "$2" = 256
exec "$SHW_TEST_SHA256SUM" "$3"
EOF
chmod 755 "$tmp/bin/sha256sum" "$tmp/bin/shasum"

env PATH="$tmp/bin:/usr/bin:/bin" XDG_CACHE_HOME="$tmp/cache" SHW_TEST_SHA256SUM="$hasher" SHW_TEST_BINARY="$tmp/binary" SHW_TEST_SUMS="$tmp/SHA256SUMS" SHW_PLUGIN_VERSION=test SHW_PLUGIN_RELEASE_BASE_URL=https://example.invalid/release \
  sh "$root/src/plugin/runtime/download-binary.sh" shw-worktree-linux-amd64 > "$tmp/result"
test "$(cat "$tmp/result")" = "$tmp/cache/shw-plugins/test/shw-worktree-linux-amd64"
test -x "$(cat "$tmp/result")"

printf '%064d  shw-worktree-linux-amd64\n' 0 > "$tmp/SHA256SUMS"
rm -f "$(cat "$tmp/result")"
if env PATH="$tmp/bin:/usr/bin:/bin" XDG_CACHE_HOME="$tmp/cache" SHW_TEST_SHA256SUM="$hasher" SHW_TEST_BINARY="$tmp/binary" SHW_TEST_SUMS="$tmp/SHA256SUMS" SHW_PLUGIN_VERSION=test SHW_PLUGIN_RELEASE_BASE_URL=https://example.invalid/release \
  sh "$root/src/plugin/runtime/download-binary.sh" shw-worktree-linux-amd64 >/dev/null 2>&1; then
  echo "checksum mismatch was accepted" >&2
  exit 1
fi

# Marketplace installs can strip script execute bits. Both launchers must still
# invoke the shared downloader when their bundled binary is absent.
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) platform=darwin-arm64 ;;
  Darwin/x86_64) platform=darwin-amd64 ;;
  Linux/x86_64|Linux/amd64) platform=linux-amd64 ;;
  *) echo 'unsupported test platform' >&2; exit 77 ;;
esac
mkdir -p "$tmp/plugin/runtime" "$tmp/plugin/worktree-mcp" "$tmp/plugin/mcp-shim" "$tmp/cache/shw-plugins/test"
cp "$root/src/plugin/runtime/download-binary.sh" "$tmp/plugin/runtime/download-binary.sh"
cp "$root/src/plugin/worktree-mcp/launch.sh" "$tmp/plugin/worktree-mcp/launch.sh"
cp "$root/src/plugin/mcp-shim/launch.sh" "$tmp/plugin/mcp-shim/launch.sh"
chmod 644 "$tmp/plugin/runtime/download-binary.sh"
for name in "shw-worktree-$platform" "gitea-mcp-shim-$platform"; do
  cat > "$tmp/cache/shw-plugins/test/$name" <<'EOF'
#!/bin/sh
printf 'launcher reached binary\n'
EOF
  chmod 755 "$tmp/cache/shw-plugins/test/$name"
done
for launcher in worktree-mcp mcp-shim; do
  output=$(XDG_CACHE_HOME="$tmp/cache" XDG_CONFIG_HOME="$tmp/config" SHW_MCP_WORKDIR="$tmp" SHW_PLUGIN_VERSION=test \
    sh "$tmp/plugin/$launcher/launch.sh")
  test "$output" = 'launcher reached binary'
done
