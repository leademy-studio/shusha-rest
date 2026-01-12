# Shusha Delivery — Backend / Technical Doc

## Архитектура
- **Приложение**: Node.js 20, Express, `server.js` как единая точка входа. Тип модуля — ESM.
- **Статика**: раздаётся самим Express из корня (`index.html`, `catalog.html`, `assets/**`).
- **Интеграция с iikoCloud**: REST вызовы через `node-fetch`. При недоступности iiko падаем в локальный фоллбэк `static-menu.json`.
- **Контейнеры**: `docker-compose.yml` описывает два сервиса: `app` (Node) и `traefik` (reverse-proxy + TLS). Порт приложения внутри контейнера 3000; наружу трафик идёт через Traefik по 80/443.
- **Оркестрация**: Traefik берёт правила из docker labels (`traefik.http.routers.shusha-rest.*`), использует entrypoints `web`→`websecure` (redir) и `websecure` (TLS). TLS-файлы и динамическая конфигурация хранятся вне репозитория на хосте: `/etc/traefik/shusha/certs` и `/etc/traefik/shusha/dynamic`.
- **Развёртывание**: `deploy.sh` — SSH на сервер, установка Docker/Compose при отсутствии, клонирование/обновление репо, автосоздание `.env` при отсутствии, `docker compose up -d --build`.

## Логика приложения
1) `server.js` запускает Express на `PORT` (по умолчанию 3000).
2) Роуты:
   - `/` → `index.html` (лендинг).
   - `/catalog` → `catalog.html` (каталог).
   - `/api/catalog` → попытка достать меню из iiko:
     - `fetchAccessToken` → `fetchOrganizations` → `fetchTerminalGroups` → `fetchNomenclature`.
     - `simplifyNomenclature` нормализует товары (id/price/name/category/image/description) и возвращает JSON.
     - При любой ошибке или отсутствии `IIKO_API_LOGIN` возвращается содержимое `static-menu.json` (если есть), иначе 500.
3) Статика (`assets/**`) раздаётся отдельно под `/assets`.

## Файлы и взаимодействие
- `server.js` — сервер, роутинг, интеграция с iiko, фоллбэк на статику.
- `static-menu.json` — резервное меню, используется, если iiko недоступен или нет `IIKO_API_LOGIN`.
- `index.html`, `catalog.html`, `assets/` — фронтовая часть, отдаётся Express.
- `docker-compose.yml` — описывает `app` и `traefik`, подключает `.env` в `app`, монтирует конфиги Traefik.
- `traefik/traefik.yml` — статическая конфигурация (entrypoints, providers).
- `traefik/dynamic/middlewares.yml` — шаблон middleware для Traefik (нужно копировать в `/etc/traefik/shusha/dynamic/middlewares.yml`).
- `/etc/traefik/shusha/dynamic/certs.yml` — динамическая TLS-конфигурация на хосте (пути к сертификатам).
- `/etc/traefik/shusha/certs/` — директория с сертификатами на хосте (вне репозитория).
- `/etc/traefik/shusha/acme.json` — хранилище ACME на хосте (вне репозитория).
- `Dockerfile` — сборка образа Node-приложения (npm install, копирование кода, `npm start`).
- `deploy.sh` — автоматизация деплоя на сервер (SSH → git fetch/reset → docker compose up). Создаёт `.env`, если нет (на основе `.env.example` или минимальный шаблон).

## Переменные окружения
- `IIKO_API_LOGIN` — API-ключ iikoCloud (обязателен для онлайн-меню).
- `IIKO_BASE_URL` — URL iiko (по умолчанию https://api-ru.iiko.services).
- `PORT` — порт приложения (3000 по умолчанию).
- `NODE_ENV` — production по умолчанию в Dockerfile и compose.

## Запуск локально
```sh
git clone https://github.com/leademy-studio/shusha-rest.git
cd shusha-rest
cp .env.example .env   # если файла нет — создайте вручную по образцу
npm install
npm start               # http://localhost:3000
```

## Запуск в Docker
```sh
docker compose up -d --build
```
Требуется файл `.env` рядом с `docker-compose.yml`. Traefik слушает 80/443, приложение — 3000 внутри.

## Деплой (сервер с Docker)
```sh
./deploy.sh
```
Скрипт сам поставит docker/docker-compose при отсутствии, склонирует/обновит репо в `/root/shusha-rest`, создаст `.env` при необходимости и выполнит `docker compose up -d --build`. После первого запуска заполните `IIKO_API_LOGIN` в `/root/shusha-rest/.env`.

## TLS/Traefik — важные тонкости
- TLS и динамические файлы живут вне репозитория в `/etc/traefik/shusha/` и не должны затираться `git reset --hard`.
- `docker-compose.yml` монтирует `/etc/traefik/shusha/dynamic` и `/etc/traefik/shusha/certs` внутрь контейнера Traefik.
- `middlewares.yml` обязателен (middleware `redirect-www` и `strip-html` используются в labels). Если его нет в `/etc/traefik/shusha/dynamic`, роутер падает и сайт может отдавать 404.
- Метка `tls.certresolver=letsencrypt` не используется, чтобы избежать лишних выпусков и rate limit. Сертификаты применяются как статические из `/etc/traefik/shusha/certs`.

## Восстановление последнего валидного сертификата Let's Encrypt
Если сертификат в `/etc/traefik/shusha/certs` потерялся или стал невалидным, можно извлечь последний выпуск из слоев Docker и восстановить его:

```sh
ssh root@85.239.35.153 'python3 - <<\"PY\"
import base64
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

domains = {\"shusha72.ru\", \"www.shusha72.ru\"}
cert_path = \"/etc/traefik/shusha/certs/cert.pem\"
key_path = \"/etc/traefik/shusha/certs/key.pem\"

def ensure_pem(raw, kind):
    if raw.startswith(b\"-----BEGIN\"):
        return raw
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    out_path = tmp_path + \".pem\"
    try:
        cmd = [\"openssl\", \"x509\", \"-inform\", \"der\", \"-in\", tmp_path, \"-out\", out_path] if kind == \"cert\" else [\"openssl\", \"pkey\", \"-inform\", \"der\", \"-in\", tmp_path, \"-out\", out_path]
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return Path(out_path).read_bytes()
    finally:
        for p in (tmp_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass

def end_ts_from_pem(pem_bytes):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(pem_bytes)
        tmp_path = tmp.name
    try:
        out = subprocess.check_output([\"openssl\", \"x509\", \"-noout\", \"-enddate\", \"-in\", tmp_path], text=True).strip()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    date_str = out.split(\"=\", 1)[1].strip()
    dt = datetime.strptime(date_str, \"%b %d %H:%M:%S %Y %Z\")
    return int(dt.replace(tzinfo=timezone.utc).timestamp())

best_ts = 0
best_cert = None
best_key = None

for dirpath, _, filenames in os.walk(\"/var/lib/docker/overlay2\"):
    if \"acme.json\" not in filenames:
        continue
    path = os.path.join(dirpath, \"acme.json\")
    try:
        if os.path.getsize(path) < 100:
            continue
        data = json.loads(Path(path).read_text())
    except Exception:
        continue
    for resolver in data.values():
        if not isinstance(resolver, dict):
            continue
        for cert in resolver.get(\"Certificates\") or []:
            domain = cert.get(\"domain\", {})
            main = domain.get(\"main\")
            sans = domain.get(\"sans\") or []
            domain_set = set([d for d in ([main] + sans) if d])
            if not domain_set.intersection(domains):
                continue
            cert_raw = base64.b64decode(cert.get(\"certificate\") or b\"\")
            key_raw = base64.b64decode(cert.get(\"key\") or b\"\")
            if not cert_raw or not key_raw:
                continue
            cert_pem = ensure_pem(cert_raw, \"cert\")
            key_pem = ensure_pem(key_raw, \"key\")
            end_ts = end_ts_from_pem(cert_pem)
            if end_ts > best_ts:
                best_ts = end_ts
                best_cert = cert_pem
                best_key = key_pem

if not best_cert or not best_key:
    raise SystemExit(\"no valid LE cert found in overlay2 acme.json files\")

Path(\"/etc/traefik/shusha/certs\").mkdir(parents=True, exist_ok=True)
stamp = time.strftime(\"%Y%m%d%H%M%S\")
for path in (cert_path, key_path):
    p = Path(path)
    if p.exists():
        p.rename(f\"{path}.bak-{stamp}\")

Path(cert_path).write_bytes(best_cert)
Path(key_path).write_bytes(best_key)
os.chmod(cert_path, 0o644)
os.chmod(key_path, 0o600)
print(\"restored cert and key\") 
PY'
ssh root@85.239.35.153 'docker compose -f /root/shusha-rest/docker-compose.yml restart traefik'
```

## Поведение без iiko
- Если `IIKO_API_LOGIN` пуст или iiko недоступен, `/api/catalog` отдаёт `static-menu.json` при его наличии.
- Если `static-menu.json` отсутствует, возвращается 500.

## Безопасность и секреты
- `.env` и реальные ключи не коммитятся (см. `.gitignore`).
- API-ключ iiko должен задаваться через переменные окружения/секреты платформы или вручную на сервере.

## Полезные команды
- Проверка compose-конфига: `docker compose config`
- Логи приложения: `docker compose logs app`
- Логи Traefik: `docker compose logs traefik`
