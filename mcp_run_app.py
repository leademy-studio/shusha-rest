import requests
import json

CONFIG_PATH = "mcp.config.json"
APP_ID = "142679"

# Загрузка конфигурации
with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

API_URL = config.get("api_url", "https://api.timeweb.cloud/api/v1/")
API_KEY = config["api_key"]

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Пример запроса для запуска приложения
run_url = f"{API_URL}apps/{APP_ID}/start"
response = requests.post(run_url, headers=headers)

if response.status_code == 200:
    print(f"Приложение {APP_ID} успешно запущено!")
    print(response.json())
else:
    print(f"Ошибка запуска приложения {APP_ID}: {response.status_code}")
    print(response.text)
