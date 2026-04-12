#!/usr/bin/env bash
# Biến tùy chọn:
#   DEPLOY_BRANCH   — nhánh cần deploy (mặc định: master)
#   DEPLOY_REMOTE   — remote git (mặc định: origin)
#   BUILD_NO_CACHE  — đặt 1 để chạy docker compose build --no-cache

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${DEPLOY_BRANCH:-master}"
REMOTE="${DEPLOY_REMOTE:-origin}"

export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1

git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git pull "$REMOTE" "$BRANCH"

if [[ "${BUILD_NO_CACHE:-0}" == "1" ]]; then
  docker compose build --no-cache
else
  docker compose build --pull
fi

docker compose up -d --remove-orphans

echo "Deploy OK: $(git rev-parse --short HEAD) ($(git log -1 --format='%ci'))"
