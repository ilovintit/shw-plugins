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
