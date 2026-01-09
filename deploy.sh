#!/bin/bash

# Быстрый деплой: клонировать/обновить репо на сервере и поднять docker-compose
set -euo pipefail

REMOTE_USER="root"
REMOTE_HOST="85.239.35.153"
REMOTE_PATH="/root/shusha-rest"
GIT_REPO="https://github.com/leademy-studio/shusha-rest.git"

ssh "${REMOTE_USER}@${REMOTE_HOST}" 'bash -s' <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

REMOTE_PATH="/root/shusha-rest"
GIT_REPO="https://github.com/leademy-studio/shusha-rest.git"

if ! command -v docker >/dev/null 2>&1; then
  echo '--- install docker & compose ---'
  apt-get update -y
  # Если plugin недоступен, ставим docker-compose (v1)
  if ! apt-get install -y docker.io docker-compose-plugin; then
    apt-get install -y docker.io docker-compose
  fi
  systemctl enable --now docker
fi

# Определяем доступную команду compose
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo 'Compose not installed. Exiting.'
  exit 1
fi

if [ ! -d "${REMOTE_PATH}/.git" ]; then
  echo '--- clone repo ---'
  rm -rf "${REMOTE_PATH}"
  git clone "${GIT_REPO}" "${REMOTE_PATH}"
fi

cd "${REMOTE_PATH}"
echo '--- git fetch/reset main ---'
git fetch origin main
git reset --hard origin/main

if [ ! -f .env ]; then
  echo '--- create .env from .env.example (fill IIKO_API_LOGIN manually) ---'
  cp .env.example .env
fi

echo '--- docker compose up --build (all services) ---'
${COMPOSE} up -d --build

echo '--- done ---'
EOF

echo "Deploy complete."
