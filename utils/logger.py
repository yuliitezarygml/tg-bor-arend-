"""Логирование приложения"""
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from core.config import LOGGING_CONFIG

def setup_logging() -> logging.Logger:
    """Настроить логирование для приложения"""
    logs_dir = LOGGING_CONFIG['log_file'].split('/')[0]
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    logger = logging.getLogger('tg_rental')
    logger.setLevel(getattr(logging, LOGGING_CONFIG['level']))
    
    # Обработчик файла с ротацией
    file_handler = RotatingFileHandler(
        LOGGING_CONFIG['log_file'],
        maxBytes=LOGGING_CONFIG['max_bytes'],
        backupCount=LOGGING_CONFIG['backup_count'],
        encoding='utf-8'
    )
    file_handler.setLevel(getattr(logging, LOGGING_CONFIG['level']))
    
    # Обработчик консоли
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Формат
    formatter = logging.Formatter(LOGGING_CONFIG['format'], datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Очищаем старые обработчики если они есть
    if logger.handlers:
        logger.handlers.clear()
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Глобальный логгер
logger = setup_logging()
