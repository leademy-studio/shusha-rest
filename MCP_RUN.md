Для запуска MCP используйте:

# Пример команды (замените на вашу утилиту)
python mcp_client.py --config mcp.config.json

# Или через Docker, если есть образ
# docker run --rm -v "$PWD/mcp.config.json:/app/mcp.config.json" mcp-image --config /app/mcp.config.json
