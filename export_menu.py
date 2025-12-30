#!/usr/bin/env python3
"""
Скрипт для экспорта меню из iiko API
Использование: python3 export_menu.py
"""

import requests
import json
import os
from datetime import datetime

# Конфигурация
API_BASE_URL = "https://api-ru.iiko.services"
API_KEY = "e9ad012531bb4025b90db78200528f54"  # из api.txt

def get_access_token():
    """Получить access token от iiko API"""
    url = f"{API_BASE_URL}/api/1/access_token"
    payload = {"apiLogin": API_KEY}
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    data = response.json()
    return data.get('token') or data.get('accessToken') or data

def get_organizations(token):
    """Получить список организаций"""
    url = f"{API_BASE_URL}/api/1/organizations"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.post(url, headers=headers, json={})
    response.raise_for_status()
    
    data = response.json()
    return data.get('organizations', [])

def get_nomenclature(token, organization_id):
    """Получить номенклатуру (меню)"""
    url = f"{API_BASE_URL}/api/1/nomenclature"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    payload = {"organizationId": organization_id}
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    return response.json()

def main():
    try:
        print("🔑 Получаю access token...")
        token = get_access_token()
        print("✅ Token получен")
        
        print("\n🏢 Получаю список организаций...")
        organizations = get_organizations(token)
        
        if not organizations:
            print("❌ Организации не найдены")
            return
        
        print(f"✅ Найдено организаций: {len(organizations)}")
        for idx, org in enumerate(organizations):
            print(f"   {idx + 1}. {org.get('name')} (ID: {org.get('id')})")
        
        # Используем первую организацию
        org_id = organizations[0]['id']
        org_name = organizations[0]['name']
        
        print(f"\n📋 Получаю меню для организации: {org_name}...")
        nomenclature = get_nomenclature(token, org_id)
        
        # Сохранение в файл
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"menu_export_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(nomenclature, f, ensure_ascii=False, indent=2)
        
        file_size = os.path.getsize(filename) / 1024  # в KB
        print(f"✅ Меню успешно экспортировано в {filename}")
        print(f"   Размер файла: {file_size:.1f} KB")
        
        # Статистика
        groups = nomenclature.get('groups', [])
        products = nomenclature.get('products', [])
        print(f"\n📊 Статистика:")
        print(f"   Категорий: {len(groups)}")
        print(f"   Продуктов: {len(products)}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка при запросе к API: {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()
