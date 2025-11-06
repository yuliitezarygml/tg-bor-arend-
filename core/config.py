"""
Центральная конфигурация приложения
Все настройки в одном месте для новой модульной архитектуры
"""
import os
import secrets
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# ========== TELEGRAM BOT CONFIGURATION ==========
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '8075876142:AAHDux8b_HScd73Vq_pHtwFCR4KDlBauPP4')
ADMIN_TELEGRAM_ID = os.getenv('ADMIN_TELEGRAM_ID', '762139684')

# ========== FLASK CONFIGURATION ==========
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')

# Генерируем случайный ключ если используется дефолтный
if SECRET_KEY == 'your-secret-key-here':
    SECRET_KEY = secrets.token_hex(32)

# Flask сессия
FLASK_SESSION_CONFIG = {
    'PERMANENT_SESSION_LIFETIME': 86400,  # 24 часа
    'SESSION_TYPE': 'filesystem',
}

# ========== DATABASE CONFIGURATION ==========
DATA_DIR = 'data'
DATABASE_CONFIG = {
    'consoles_file': os.path.join(DATA_DIR, 'consoles.json'),
    'users_file': os.path.join(DATA_DIR, 'users.json'),
    'rentals_file': os.path.join(DATA_DIR, 'rentals.json'),
    'rental_requests_file': os.path.join(DATA_DIR, 'rental_requests.json'),
    'admins_file': os.path.join(DATA_DIR, 'admins.json'),
    'blocked_dates_file': os.path.join(DATA_DIR, 'blocked_dates.json'),
    'discounts_file': os.path.join(DATA_DIR, 'discounts.json'),
    'ratings_file': os.path.join(DATA_DIR, 'ratings.json'),
    'temp_reservations_file': os.path.join(DATA_DIR, 'temp_reservations.json'),
    'calendar_file': os.path.join(DATA_DIR, 'calendar.json'),
    'admin_settings_file': os.path.join(DATA_DIR, 'admin_settings.json'),
}

# ========== RENTAL CONFIGURATION ==========
RENTAL_CONFIG = {
    'default_hours': 2,
    'min_hours': 1,
    'max_hours': 24,
    'price_per_hour': 150,  # руб/час
    'deposit_required': 1000,  # руб
}

# ========== SCHEDULER CONFIGURATION ==========
SCHEDULER_CONFIG = {
    'interval': 60,  # проверять каждые 60 секунд
    'check_type': 'interval',  # или 'cron'
}

# ========== LOGGING CONFIGURATION ==========
LOGGING_CONFIG = {
    'level': 'INFO',
    'log_file': 'logs/app.log',
    'max_bytes': 10485760,  # 10MB
    'backup_count': 5,
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
}

# ========== WEB UI CONFIGURATION ==========
WEB_CONFIG = {
    'host': '0.0.0.0',
    'port': 5000,
    'debug': False,
}

# ========== TELEGRAM UI CONFIGURATION ==========
TELEGRAM_CONFIG = {
    'use_polling': True,
    'skip_pending': True,
    'timeout': 30,
}

# ========== RATING SYSTEM CONFIGURATION ==========
RATING_CONFIG = {
    'min_rating': 1,
    'max_rating': 5,
    'enable_feedback': True,
}

# ========== VALIDATION CONFIGURATION ==========
VALIDATION_CONFIG = {
    'min_username_length': 2,
    'max_username_length': 50,
    'min_password_length': 6,
    'max_password_length': 100,
}

# ========== FILE PATHS ==========
TEMPLATE_DIR = 'templates'
STATIC_DIR = 'static'
LOGS_DIR = 'logs'

# Убедимся, что директории существуют
for dir_path in [DATA_DIR, LOGS_DIR, TEMPLATE_DIR, STATIC_DIR]:
    os.makedirs(dir_path, exist_ok=True)
