#!/usr/bin/env python3
"""
Скрипт инициализации администратора
Использует только MongoDB
"""

import os
from datetime import datetime
from core.mongodb import get_mongodb_manager
from utils.logger import logger

def init_admin():
    """Создает администратора по умолчанию если его нет"""
    
    mongo = get_mongodb_manager()
    
    if not mongo.is_connected():
        logger.error("❌ MongoDB не подключена!")
        return
    
    # Проверяем есть ли админы
    try:
        admin_count = mongo.count('admins')
        if admin_count > 0:
            logger.info("✅ Администраторы уже существуют")
            return
    except:
        pass
    
    # Создаем администратора по умолчанию
    default_admin = {
        "_id": "admin",
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "created_at": datetime.now().isoformat(),
        "created_by": "system"
    }
    
    try:
        mongo.insert_one('admins', default_admin)
        logger.info("✅ Создан администратор по умолчанию")
        logger.info("   Логин: admin")
        logger.info("   Пароль: admin123")
        logger.warning("⚠️ ОБЯЗАТЕЛЬНО смените пароль после первого входа!")
    except Exception as e:
        logger.warning(f"Admin уже существует: {e}")

def init_data_files():
    """Инициализация коллекций MongoDB (JSON больше не используется)"""
    
    mongo = get_mongodb_manager()
    
    if not mongo.is_connected():
        logger.error("❌ MongoDB не подключена!")
        return
    
    logger.info("✅ MongoDB коллекции готовы")

def init_passport_dir():
    """Создает папку для документов"""
    passport_dir = 'passport'
    if not os.path.exists(passport_dir):
        os.makedirs(passport_dir)
        logger.info(f"📁 Создана папка: {passport_dir}")

if __name__ == "__main__":
    logger.info("🚀 Инициализация MongoDB...")
    
    # Инициализация
    init_data_files()
    init_passport_dir() 
    init_admin()
    
    logger.info("✅ Инициализация завершена!")
    logger.info("🌐 Запустите проект: python run.py")


def init_passport_dir():
    """Создает папку для документов"""
    passport_dir = 'passport'
    if not os.path.exists(passport_dir):
        os.makedirs(passport_dir)
        logger.info(f"Created directory: {passport_dir}")

if __name__ == "__main__":
    logger.info("Initializing project...")
    
    # Инициализация
    init_data_files()
    init_passport_dir() 
    init_admin()
    
    logger.info("Initialization complete!")
    logger.info("Run: python run.py")
    logger.info("Web panel: http://0.0.0.0:5000")
