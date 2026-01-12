#!/bin/bash

# Быстрый деплой: клонировать/обновить репо на сервере и поднять docker-compose
set -euo pipefail

REMOTE_HOST="root@85.239.35.153"
REMOTE_CERT_DIR="/root/shusha-rest/traefik/certs"
LOCAL_CERT="traefik/certs/cert.pem"
LOCAL_KEY="traefik/certs/key.pem"

for file in "$LOCAL_CERT" "$LOCAL_KEY"; do
  if [ ! -f "$file" ]; then
    echo "Missing TLS artifact: $file"
    exit 1
  fi
done

echo '--- upload TLS certificates ---'
ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_CERT_DIR'"
scp "$LOCAL_CERT" "$REMOTE_HOST:$REMOTE_CERT_DIR/cert.pem"
scp "$LOCAL_KEY" "$REMOTE_HOST:$REMOTE_CERT_DIR/key.pem"

ssh "$REMOTE_HOST" 'bash -s' <<'EOF'
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

# Ensure TLS certificates are in place before touching containers
CERT_DIR="/root/shusha-rest/traefik/certs"
mkdir -p "$CERT_DIR"
if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
  cat <<'CERTMSG'
!!! TLS certificates not found in traefik/certs.
Please upload your existing cert.pem and key.pem before deploying to avoid triggering new issuance.
CERTMSG
  exit 1
fi

chmod 644 "$CERT_DIR/cert.pem" || true
chmod 600 "$CERT_DIR/key.pem" || true

STATIC_CERT_CONFIG="/root/shusha-rest/traefik/dynamic/certs.yml"
if [ ! -f "$STATIC_CERT_CONFIG" ]; then
  echo '--- ERROR: traefik/dynamic/certs.yml must exist locally and contain the static certificate mapping ---'
  exit 1
fi

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

# Обрабатываем известный баг docker-compose v1 с ContainerConfig:
# перед подъёмом чистим старые контейнеры, затем поднимаем заново.
echo '--- compose down (remove orphans) ---'
${COMPOSE} down --remove-orphans || true

# Workaround docker-compose v1 ContainerConfig bug: force-remove app/traefik before up
echo '--- compose rm app/traefik (force) ---'
${COMPOSE} rm -f -v app traefik || true

# Правим права на acme.json для Traefik/ACME, если файл есть
if [ -f traefik/acme.json ]; then
  chmod 600 traefik/acme.json || true
fi

echo '--- docker compose up --build (all services) ---'
${COMPOSE} up -d --build

echo '--- done ---'
EOF

echo "Deploy complete."
