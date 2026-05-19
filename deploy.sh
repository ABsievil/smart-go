#!/usr/bin/env bash
# Deploy on VPS after CI pushed image to GHCR.
# Required: IMAGE_NAME, IMAGE_TAG
# Optional: APP_DIR, BRANCH, REGISTRY_HOST, REGISTRY_USERNAME, REGISTRY_TOKEN

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$APP_DIR"

BRANCH="${BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"

if [[ -z "${IMAGE_NAME:-}" || -z "${IMAGE_TAG:-}" ]]; then
  echo "IMAGE_NAME and IMAGE_TAG are required"
  exit 1
fi

if [[ -n "${REGISTRY_HOST:-}" && -n "${REGISTRY_USERNAME:-}" && -n "${REGISTRY_TOKEN:-}" ]]; then
  echo "$REGISTRY_TOKEN" | docker login "$REGISTRY_HOST" -u "$REGISTRY_USERNAME" --password-stdin
fi

# VPS deploy dir must match remote; discard local edits to tracked files.
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git reset --hard "$REMOTE/$BRANCH"

export API_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

docker compose pull api
docker compose up -d --no-build --remove-orphans

echo "Deploy OK: ${API_IMAGE} ($(git rev-parse --short HEAD))"
