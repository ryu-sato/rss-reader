#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT_TIMEOUT=90

# デプロイ通知先の設定 (任意)。NTFY_TOPIC を .env.deploy に書けば有効化される。
# 例: NTFY_TOPIC=rss-reader-deploy-<ランダム文字列>
# 別の通知先 (Slack/Discord等) に切り替える場合はここだけ差し替えればよい。
if [ -f "${SCRIPT_DIR}/.env.deploy" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/.env.deploy"
  set +a
fi

notify() {
  if [ -z "${NTFY_TOPIC:-}" ]; then
    return 0
  fi
  curl -fsS -d "$1" "https://ntfy.sh/${NTFY_TOPIC}" >/dev/null 2>&1 || \
    echo "Warning: failed to send notification." >&2
}

(
  cd ${SCRIPT_DIR}

  # Record image IDs before pull (used both for the "anything changed" check
  # and, for the app image specifically, as the rollback target)
  BEFORE=$(docker compose config --images | sort | xargs -I{} docker image inspect --format='{{.Id}}' {} 2>/dev/null | sort | md5sum)
  APP_IMAGE_REF=$(docker compose config --images app)
  PREVIOUS_APP_IMAGE_ID=$(docker image inspect --format='{{.Id}}' "${APP_IMAGE_REF}" 2>/dev/null || true)

  if ! docker compose --progress plain pull; then
    echo "Error: docker compose pull failed. Aborting update." >&2
    notify "rss-reader: docker compose pull failed, update aborted."
    exit 1
  fi

  # Record image IDs after pull
  AFTER=$(docker compose config --images | sort | xargs -I{} docker image inspect --format='{{.Id}}' {} 2>/dev/null | sort | md5sum)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "Images are up to date. Skipping restart."
    exit 0
  fi

  echo "New image(s) detected. Restarting and verifying health..."

  docker compose --progress plain down app

  if docker compose --progress plain up -d --wait --wait-timeout "${WAIT_TIMEOUT}"; then
    echo "Update complete: app is healthy."
    exit 0
  fi

  echo "Error: app failed to become healthy within ${WAIT_TIMEOUT}s." >&2

  if [ -z "${PREVIOUS_APP_IMAGE_ID}" ]; then
    echo "Error: no previous app image recorded, cannot roll back automatically. Manual intervention required." >&2
    notify "rss-reader: new image is unhealthy and there is no previous image to roll back to. Manual intervention required."
    exit 1
  fi

  echo "Rolling back app to previous image ${PREVIOUS_APP_IMAGE_ID}." >&2
  docker tag "${PREVIOUS_APP_IMAGE_ID}" "${APP_IMAGE_REF}"
  docker compose --progress plain down app

  if docker compose --progress plain up -d --wait --wait-timeout "${WAIT_TIMEOUT}"; then
    echo "Rollback successful: app restored on previous image." >&2
    notify "rss-reader: new image failed its health check and was rolled back to the previous image. Investigate the latest push."
  else
    echo "Error: rollback also failed to become healthy. Manual intervention required." >&2
    notify "rss-reader: CRITICAL - new image failed health check AND rollback also failed to become healthy. App may be down. Manual intervention required now."
  fi

  exit 1
)
