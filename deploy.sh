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

# Гарантируем наличие статической конфигурации сертификатов
COMPOSE_FILE="/root/shusha-rest/docker-compose.yml"
STATIC_CERT_CONFIG="/root/shusha-rest/traefik/dynamic/certs.yml"
cat > "$STATIC_CERT_CONFIG" <<'YAML'
tls:
  certificates:
    - certFile: /etc/traefik/certs/cert.pem
      keyFile: /etc/traefik/certs/key.pem
YAML

GUARD_SCRIPT="/root/shusha-rest/scripts/renew_on_last_day.sh"
if [ -f "$GUARD_SCRIPT" ]; then
  chmod +x "$GUARD_SCRIPT"
else
  echo "!!! cert guard script not found at $GUARD_SCRIPT"
fi

CRON_FILE="/etc/cron.d/shusha-cert-guard"
if [ -f "$GUARD_SCRIPT" ]; then
  cat > "$CRON_FILE" <<'CRON'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 * * * * root /root/shusha-rest/scripts/renew_on_last_day.sh >> /var/log/shusha-cert-guard.log 2>&1
CRON
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

if [ -x "$GUARD_SCRIPT" ]; then
  echo '--- apply cert last-day policy ---'
  "$GUARD_SCRIPT"
fi

echo '--- done ---'
EOF

echo "Deploy complete."
