#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  cd ${SCRIPT_DIR}

  # Record image IDs before pull
  BEFORE=$(docker compose config --images | sort | xargs -I{} docker image inspect --format='{{.Id}}' {} 2>/dev/null | sort | md5sum)

  if ! docker compose pull; then
    echo "Error: docker compose pull failed. Aborting update." >&2
    exit 1
  fi

  # Record image IDs after pull
  AFTER=$(docker compose config --images | sort | xargs -I{} docker image inspect --format='{{.Id}}' {} 2>/dev/null | sort | md5sum)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "Images are up to date. Skipping restart."
    exit 0
  fi

  docker compose down app
  docker compose up -d
)
