#!/usr/bin/env python3
"""
Скрипт миграции данных из JSON в MongoDB
Использование: python migrate_to_mongodb.py
"""

import os
import json
from core.mongodb import get_mongodb_manager
from core.config import DATABASE_CONFIG, DATA_DIR
from utils.logger import logger

def migrate_json_to_mongodb():
    """Мигрировать все данные из JSON в MongoDB"""
    
    mongo = get_mongodb_manager()
    
    if not mongo.is_connected():
        logger.error("❌ MongoDB не подключена!")
        logger.info("Установите MongoDB и попробуйте снова")
        return False
    
    logger.info("=" * 60)
    logger.info("🔄 МИГРАЦИЯ ДАННЫХ JSON → MongoDB")
    logger.info("=" * 60)
    
    files_to_migrate = [
        ('consoles.json', 'consoles'),
        ('users.json', 'users'),
        ('rentals.json', 'rentals'),
        ('rental_requests.json', 'rental_requests'),
        ('admin_settings.json', 'admin_settings'),
        ('discounts.json', 'discounts'),
        ('temp_reservations.json', 'temp_reservations'),
        ('calendar.json', 'calendar'),
        ('ratings.json', 'ratings'),
        ('blocked_dates.json', 'blocked_dates'),
        ('admins.json', 'admins'),
    ]
    
    total_migrated = 0
    
    for json_file, collection_name in files_to_migrate:
        filepath = os.path.join(DATA_DIR, json_file)
        
        if not os.path.exists(filepath):
            logger.warning(f"⏭️  Пропущен (не существует): {json_file}")
            continue
        
        try:
            # Загружаем JSON
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not data:
                logger.info(f"⏭️  {json_file} пуст - пропускаем")
                continue
            
            # Очищаем коллекцию
            mongo.drop_collection(collection_name)
            
            # Вставляем документы
            count = 0
            
            # Проверяем структуру данных
            if isinstance(data, dict):
                # Если это словарь, пробуем вставить как документы с ID
                for doc_id, doc_data in data.items():
                    if isinstance(doc_data, dict):
                        # Это документ
                        doc_data['_id'] = doc_id
                        mongo.insert_one(collection_name, doc_data)
                        count += 1
                    else:
                        # Это может быть значение, пропускаем странные структуры
                        pass
            elif isinstance(data, list):
                # Если это список, вставляем каждый элемент
                for item in data:
                    if isinstance(item, dict):
                        mongo.insert_one(collection_name, item)
                        count += 1
            
            logger.info(f"✅ {json_file}: {count} документов перенесено")
            total_migrated += count
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Ошибка JSON в {json_file}: {e}")
        except Exception as e:
            logger.error(f"❌ Ошибка при миграции {json_file}: {e}")
    
    logger.info("=" * 60)
    logger.info(f"✅ МИГРАЦИЯ ЗАВЕРШЕНА: {total_migrated} документов")
    logger.info("=" * 60)
    logger.info("💾 Данные теперь в MongoDB")
    logger.info("📋 JSON файлы можно удалить (рекомендуется создать бэкап)")
    
    return True

def backup_json_data():
    """Создать бэкап JSON данных"""
    
    backup_dir = os.path.join(DATA_DIR, f'backup_{os.urandom(4).hex()}')
    os.makedirs(backup_dir, exist_ok=True)
    
    files = ['consoles.json', 'users.json', 'rentals.json', 'admins.json']
    
    for filename in files:
        src = os.path.join(DATA_DIR, filename)
        dst = os.path.join(backup_dir, filename)
        
        if os.path.exists(src):
            with open(src, 'r') as f_in:
                data = f_in.read()
            with open(dst, 'w') as f_out:
                f_out.write(data)
            logger.info(f"📦 Бэкап: {filename}")
    
    logger.info(f"💾 Бэкап создан в: {backup_dir}")
    return backup_dir

def verify_migration():
    """Проверить результаты миграции"""
    
    mongo = get_mongodb_manager()
    
    if not mongo.is_connected():
        return False
    
    logger.info("\n📊 ПРОВЕРКА ДАННЫХ В MongoDB:")
    logger.info("=" * 60)
    
    collections = [
        'consoles', 'users', 'rentals', 'admins', 'discounts'
    ]
    
    for collection_name in collections:
        try:
            count = mongo.count(collection_name)
            logger.info(f"  {collection_name:20s}: {count:5d} документов")
        except Exception as e:
            logger.warning(f"  {collection_name:20s}: Ошибка - {e}")
    
    logger.info("=" * 60)

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("МИГРАЦИЯ ДАННЫХ В MongoDB")
    logger.info("=" * 60)
    
    # Проверяем подключение
    mongo = get_mongodb_manager()
    
    if not mongo.is_connected():
        logger.error("MongoDB не подключена!")
        logger.info("Установите MongoDB:")
        logger.info("  1. Локально: https://www.mongodb.com/try/download/community")
        logger.info("  2. Docker: docker run -d -p 27017:27017 mongo:latest")
        logger.info("  3. Atlas: https://www.mongodb.com/cloud/atlas")
        exit(1)
    
    # Создаем бэкап
    logger.info("Создание бэкапа JSON данных...")
    backup_json_data()
    
    # Мигрируем данные
    logger.info("Начало миграции...")
    if migrate_json_to_mongodb():
        # Проверяем результаты
        verify_migration()
        logger.info("Миграция успешна!")
        logger.info("Совет: Запустите приложение как обычно: python run.py")
    else:
        logger.error("Миграция не удалась")
        exit(1)
