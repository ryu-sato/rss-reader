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

# app を止めて新しいイメージで起動し、ヘルシーになるまで待つ。
# 初回のアップデートとロールバックの両方で使う。
restart_app() {
  docker compose --progress plain down app
  docker compose --progress plain up -d --wait --wait-timeout "${WAIT_TIMEOUT}"
}

cd "${SCRIPT_DIR}"

APP_IMAGE_REF=$(docker compose config --images app)
PREVIOUS_APP_IMAGE_ID=$(docker image inspect --format='{{.Id}}' "${APP_IMAGE_REF}" 2>/dev/null || true)

if ! docker compose --progress plain pull; then
  echo "Error: docker compose pull failed. Aborting update." >&2
  notify "rss-reader: docker compose pull failed, update aborted."
  exit 1
fi

# app イメージだけで判定する (tunnel 側だけが更新された場合に無駄な再起動・通知をしないため)
NEW_APP_IMAGE_ID=$(docker image inspect --format='{{.Id}}' "${APP_IMAGE_REF}" 2>/dev/null || true)

if [ "${PREVIOUS_APP_IMAGE_ID}" = "${NEW_APP_IMAGE_ID}" ]; then
  echo "App image is up to date. Skipping restart."
  exit 0
fi

echo "New app image detected (${NEW_APP_IMAGE_ID}). Restarting and verifying health..."

if restart_app; then
  echo "Update complete: app is healthy."
  notify "rss-reader: updated to ${NEW_APP_IMAGE_ID} and healthy."
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

if restart_app; then
  echo "Rollback successful: app restored on previous image." >&2
  notify "rss-reader: new image (${NEW_APP_IMAGE_ID}) failed its health check and was rolled back to ${PREVIOUS_APP_IMAGE_ID}. Investigate the latest push."
else
  echo "Error: rollback also failed to become healthy. Manual intervention required." >&2
  notify "rss-reader: CRITICAL - new image failed health check AND rollback also failed to become healthy. App may be down. Manual intervention required now."
fi

exit 1
