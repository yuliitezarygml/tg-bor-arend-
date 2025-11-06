"""
Точка входа для запуска системы
Запускает Flask и Telegram бот в отдельных потоках
"""
import threading
import time
import signal
import sys
import os
import atexit
from app import app
from bot import run_bot
from init_admin import init_admin, init_data_files, init_passport_dir
from rental_scheduler import start_rental_scheduler, stop_rental_scheduler
from core.config import WEB_CONFIG
from utils.logger import logger

# Глобальные переменные для управления процессами
flask_thread = None
bot_thread = None
scheduler_thread = None

def cleanup():
    """Очистка при выходе"""
    logger.info("🧹 Очистка ресурсов...")
    try:
        stop_rental_scheduler()
    except Exception as e:
        logger.debug(f"Ошибка при очистке: {e}")

def signal_handler(sig, frame):
    """Обработчик сигнала SIGINT (CTRL+C)"""
    logger.info("\n🛑 Получен сигнал завершения (CTRL+C)...")
    cleanup()
    logger.info("👋 Система полностью остановлена")
    # Немедленный выход
    os._exit(0)

def run_flask():
    """Запуск Flask приложения"""
    logger.info(f"🌐 Запуск Flask приложения на http://{WEB_CONFIG['host']}:{WEB_CONFIG['port']}")
    try:
        # Отключаем встроенный логгер Flask
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        
        app.run(host=WEB_CONFIG['host'], port=WEB_CONFIG['port'], 
                debug=WEB_CONFIG['debug'], use_reloader=False, threaded=True)
    except Exception as e:
        logger.debug(f"Flask завершился: {e}")

def run_bot_thread():
    """Запуск Telegram бота"""
    try:
        run_bot()
    except Exception as e:
        logger.debug(f"Бот завершился: {e}")

def run_scheduler_thread():
    """Запуск планировщика"""
    try:
        start_rental_scheduler()
    except Exception as e:
        logger.debug(f"Планировщик завершился: {e}")

if __name__ == '__main__':
    logger.info("🎮 Запуск системы аренды PlayStation консолей...")
    logger.info("=" * 50)
    
    # Регистрация обработчиков сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup)
    
    # Инициализация при первом запуске
    logger.info("🔧 Инициализация системы...")
    init_data_files()
    init_passport_dir()
    init_admin()
    logger.info("✅ Инициализация завершена")
    
    try:
        # Запуск Flask в отдельном потоке (daemon)
        flask_thread = threading.Thread(target=run_flask, daemon=True)
        flask_thread.start()
        logger.info("✅ Flask запущен в отдельном потоке")
        
        # Запуск планировщика в отдельном потоке (daemon)
        scheduler_thread = threading.Thread(target=run_scheduler_thread, daemon=True)
        scheduler_thread.start()
        logger.info("✅ Планировщик запущен")
        
        # Небольшая задержка
        time.sleep(2)
        
        # Запуск Telegram бота в отдельном потоке (daemon)
        bot_thread = threading.Thread(target=run_bot_thread, daemon=True)
        bot_thread.start()
        logger.info("✅ Telegram бот запущен")
        
        logger.info("=" * 50)
        logger.info("💚 Система готова к работе! Нажмите CTRL+C для выхода...")
        logger.info("=" * 50)
        
        # Основной поток ждет сигнал завершения
        # Используем время, чтобы проверять периодически
        while True:
            time.sleep(1)
        
    except KeyboardInterrupt:
        logger.info("\n🛑 Получен сигнал завершения...")
        cleanup()
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}", exc_info=True)
        cleanup()
        sys.exit(1)
