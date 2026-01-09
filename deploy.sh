#!/bin/bash

# Быстрый деплой: обновить репозиторий на сервере и поднять контейнеры
set -e

REMOTE_USER="root"
REMOTE_HOST="85.239.35.153"
# Путь к проекту на сервере (измените при необходимости)
REMOTE_PATH="/root/shusha-rest"

REMOTE_COMMANDS="
  set -e
  cd ${REMOTE_PATH}
  echo '--- git fetch/reset main ---'
  git fetch origin main
  git reset --hard origin/main
  echo '--- docker compose up --build (all services) ---'
  docker compose up -d --build
  echo '--- done ---'
"

ssh "${REMOTE_USER}@${REMOTE_HOST}" "${REMOTE_COMMANDS}"

echo "Deploy complete."
