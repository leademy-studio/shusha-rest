#!/bin/bash

# Быстрый деплой: клонировать/обновить репо на сервере и поднять docker-compose
set -euo pipefail

ssh root@85.239.35.153 'bash -s' <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  echo '--- install docker ---'
  apt-get update -y
  apt-get install -y docker.io
  systemctl enable --now docker
fi

# Устанавливаем docker compose v2 (plugin). Если пакета нет в репо — добавляем официальный docker repo.
if ! docker compose version >/dev/null 2>&1; then
  echo '--- install docker compose plugin (v2) ---'
  if ! apt-get install -y docker-compose-plugin; then
    echo '--- add Docker APT repo and retry compose plugin ---'
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-compose-plugin
  fi
fi

# Определяем доступную команду compose
COMPOSE="docker compose"

if [ ! -d "/root/shusha-rest/.git" ]; then
  echo '--- clone repo ---'
  rm -rf "/root/shusha-rest"
  git clone "https://github.com/leademy-studio/shusha-rest.git" "/root/shusha-rest"
fi

cd "/root/shusha-rest"
echo '--- git fetch/reset main ---'
git fetch origin main
git reset --hard origin/main

if [ ! -f .env ]; then
  echo '--- create .env (fill IIKO_API_LOGIN manually) ---'
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo '!.env.example not found, writing minimal .env'
    cat > .env <<'ENVEOF'
IIKO_API_LOGIN=
IIKO_BASE_URL=https://api-ru.iiko.services
PORT=3000
ENVEOF
  fi
fi

APP_IMAGE="shusha-rest-app"
PREV_IMAGE="${APP_IMAGE}:previous"

if docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  docker tag "$APP_IMAGE" "$PREV_IMAGE"
fi

echo '--- docker compose build (app) ---'
if ! ${COMPOSE} build app; then
  echo '!!! build failed, keeping existing containers'
  exit 1
fi

echo '--- docker compose up (no down/rm) ---'
if ! ${COMPOSE} up -d; then
  echo '!!! compose up failed, attempting rollback'
  if docker image inspect "$PREV_IMAGE" >/dev/null 2>&1; then
    docker tag "$PREV_IMAGE" "$APP_IMAGE"
    ${COMPOSE} up -d --force-recreate app || true
  fi
  exit 1
fi

if ! ${COMPOSE} ps --status=running --services | grep -qx 'app'; then
  echo '!!! app not running, attempting rollback'
  if docker image inspect "$PREV_IMAGE" >/dev/null 2>&1; then
    docker tag "$PREV_IMAGE" "$APP_IMAGE"
    ${COMPOSE} up -d --force-recreate app || true
  fi
  exit 1
fi

echo '--- done ---'
EOF

echo "Deploy complete."
