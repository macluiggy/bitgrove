#!/bin/sh
# Bitgrove installer.
#
#   curl -fsSL https://raw.githubusercontent.com/macluiggy/bitgrove/main/install.sh | sh
#
# Downloads the Bitgrove bundle from GitHub Releases and runs `bitgrove init`,
# which copies it to ~/.bitgrove/bin and configures Claude Code hooks.
# Running it again updates Bitgrove; your grove in ~/.bitgrove is kept.
#
# Environment:
#   BITGROVE_VERSION       install a specific version (e.g. 0.2.0); default: latest
#   BITGROVE_DOWNLOAD_URL  full URL of bitgrove.mjs; overrides BITGROVE_VERSION
set -eu

REPO_URL="https://github.com/macluiggy/bitgrove"
MIN_NODE_MAJOR=20

fail() {
  echo "bitgrove: $*" >&2
  exit 1
}

has() {
  command -v "$1" >/dev/null 2>&1
}

pick_runtime() {
  if has bun; then
    echo bun
    return
  fi

  if has node; then
    node_major=$(node -p 'process.versions.node.split(".")[0]')
    if [ "$node_major" -lt "$MIN_NODE_MAJOR" ]; then
      fail "Node $MIN_NODE_MAJOR+ is required (found $(node --version)). Install a newer Node or Bun."
    fi
    echo node
    return
  fi

  fail "Node $MIN_NODE_MAJOR+ or Bun is required. Install one of them and run this again."
}

download_url() {
  if [ -n "${BITGROVE_DOWNLOAD_URL:-}" ]; then
    echo "$BITGROVE_DOWNLOAD_URL"
  elif [ -n "${BITGROVE_VERSION:-}" ]; then
    echo "$REPO_URL/releases/download/v${BITGROVE_VERSION#v}/bitgrove.mjs"
  else
    echo "$REPO_URL/releases/latest/download/bitgrove.mjs"
  fi
}

main() {
  has curl || fail "curl is required."

  runtime=$(pick_runtime)
  url=$(download_url)
  version=${BITGROVE_VERSION:-latest}

  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT

  echo "Installing Bitgrove ($version)..."
  curl -fsSL "$url" -o "$tmp/bitgrove.mjs" || fail "Could not download $url"

  "$runtime" "$tmp/bitgrove.mjs" init
}

main "$@"
