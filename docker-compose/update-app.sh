#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

(
  cd ${SCRIPT_DIR}
  docker compose pull
  docker compose down app
  docker compose up -d
)
