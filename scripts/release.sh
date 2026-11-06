#!/bin/sh
# Publishes a new Bitgrove version: bumps package.json, commits, tags v<version>
# and pushes. The tag triggers .github/workflows/release.yml.
#
#   bun run release:patch | release:minor | release:major
set -eu

RELEASE_BRANCH="main"

fail() {
  echo "release: $*" >&2
  exit 1
}

main() {
  bump="${1:-}"

  case "$bump" in
    patch | minor | major) ;;
    *) fail "usage: release.sh patch|minor|major" ;;
  esac

  branch=$(git rev-parse --abbrev-ref HEAD)
  [ "$branch" = "$RELEASE_BRANCH" ] ||
    fail "releases are cut from '$RELEASE_BRANCH' (you are on '$branch')."

  [ -z "$(git status --porcelain)" ] ||
    fail "commit or stash your changes first."

  git fetch --quiet origin "$RELEASE_BRANCH"
  [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$RELEASE_BRANCH")" ] ||
    fail "'$RELEASE_BRANCH' is not in sync with origin: pull or push first."

  npm version "$bump" -m "chore(release): v%s"
  git push --follow-tags origin "$RELEASE_BRANCH"

  echo "Tagged and pushed. Follow the release in GitHub Actions."
}

main "$@"
