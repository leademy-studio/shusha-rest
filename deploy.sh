#!/bin/bash

# Быстрый деплой: клонировать/обновить репо на сервере и поднять docker-compose
set -euo pipefail

ssh root@85.239.35.153 'bash -s' <<'EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

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

echo '--- docker compose up --build (all services) ---'
${COMPOSE} up -d --build

echo '--- done ---'
EOF

echo "Deploy complete."
