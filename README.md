# Shusha Delivery — Backend / Technical Doc

## Архитектура
- **Приложение**: Node.js 20, Express, `server.js` как единая точка входа. Тип модуля — ESM.
- **Статика**: раздаётся самим Express из корня (`index.html`, `catalog.html`, `assets/**`).
- **Интеграция с iikoCloud**: REST вызовы через `node-fetch`. При недоступности iiko падаем в локальный фоллбэк `static-menu.json`.
- **Контейнеры**: `docker-compose.yml` описывает два сервиса: `app` (Node) и `traefik` (reverse-proxy + TLS). Порт приложения внутри контейнера 3000; наружу трафик идёт через Traefik по 80/443.
- **Оркестрация**: Traefik берёт правила из docker labels (`traefik.http.routers.shusha-rest.*`), использует entrypoints `web`→`websecure` (redir) и `websecure` (TLS). Сертификаты монтируются из `traefik/certs/` (см. `traefik/dynamic/self-signed.yml`).
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
- `traefik/dynamic/self-signed.yml` — динамическая TLS-конфигурация (пути к сертификатам). Сами сертификаты ожидаются в `traefik/certs/`.
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
