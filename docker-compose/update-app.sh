#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT_TIMEOUT=90

(
  cd ${SCRIPT_DIR}

  # Record image IDs before pull (used both for the "anything changed" check
  # and, for the app image specifically, as the rollback target)
  BEFORE=$(docker compose config --images | sort | xargs -I{} docker image inspect --format='{{.Id}}' {} 2>/dev/null | sort | md5sum)
  APP_IMAGE_REF=$(docker compose config --images app)
  PREVIOUS_APP_IMAGE_ID=$(docker image inspect --format='{{.Id}}' "${APP_IMAGE_REF}" 2>/dev/null || true)

  if ! docker compose --progress plain pull; then
    echo "Error: docker compose pull failed. Aborting update." >&2
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
    exit 1
  fi

  echo "Rolling back app to previous image ${PREVIOUS_APP_IMAGE_ID}." >&2
  docker tag "${PREVIOUS_APP_IMAGE_ID}" "${APP_IMAGE_REF}"
  docker compose --progress plain down app

  if docker compose --progress plain up -d --wait --wait-timeout "${WAIT_TIMEOUT}"; then
    echo "Rollback successful: app restored on previous image." >&2
  else
    echo "Error: rollback also failed to become healthy. Manual intervention required." >&2
  fi

  exit 1
)
