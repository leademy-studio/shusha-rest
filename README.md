# Shusha Delivery — Backend

## Описание

Это репозиторий для приложения доставки Shusha, использующего Node.js, Express и интеграцию с iikoCloud API.

## Быстрый старт

1. Клонируйте репозиторий:
   ```sh
git clone https://github.com/leademy-studio/shusha-rest.git
cd shusha-rest
```

2. Установите зависимости:
   ```sh
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
   ```sh
cp .env.example .env
```
   Заполните переменные в `.env`:
   - `IIKO_API_LOGIN` — ваш API-ключ iikoCloud
   - `IIKO_BASE_URL` — URL для API (по умолчанию https://api-ru.iiko.services)
   - `PORT` — порт для запуска сервера (по умолчанию 3000)

4. Запустите приложение:
   ```sh
npm start
```

## Docker и Timeweb Cloud

- Для деплоя используйте файлы `docker-compose.yml` и `.env.example`.
- В облаке переменные окружения можно задать через интерфейс или загрузить `.env` вручную.
- В файле `.dockerignore` указаны файлы, которые не попадают в Docker-образ.

## Структура проекта
- `server.js` — основной сервер Express
- `index.html` — главная страница
- `assets/` — статические файлы (CSS, JS)
- `.env.example` — пример переменных окружения
- `docker-compose.yml` — конфигурация для Docker Compose

## Важно
- Не храните реальные секреты в `.env.example`.
- Файл `.env` не попадает в репозиторий (см. `.gitignore`).
- Для деплоя на Timeweb Cloud убедитесь, что все необходимые файлы доступны в корне репозитория.

## Контакты
Для вопросов и поддержки обращайтесь к разработчикам проекта.
