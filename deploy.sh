#!/bin/bash

# Быстрый деплой: обновить репозиторий на сервере и поднять контейнеры
set -e

REMOTE_USER="root"
REMOTE_HOST="85.239.35.153"
REMOTE_PATH="/root/shusha-rest"       # Путь к проекту на сервере
GIT_REPO="https://github.com/leademy-studio/shusha-rest.git"

REMOTE_COMMANDS="
  set -e
  if [ ! -d "${REMOTE_PATH}/.git" ]; then
    echo '--- clone repo ---'
    rm -rf ${REMOTE_PATH}
    git clone ${GIT_REPO} ${REMOTE_PATH}
  fi
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
