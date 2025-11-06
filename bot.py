"""
Telegram бот приложения
Использует модульную архитектуру
"""
import signal
import sys
from handlers.telegram.bot_manager import get_bot, start_polling
from handlers.telegram import commands
from utils.logger import logger

def handle_signal(sig, frame):
    """Обработчик сигнала завершения"""
    logger.info("🛑 Получен сигнал завершения бота")
    sys.exit(0)

def run_bot():
    """Запустить Telegram бота"""
    # Регистрируем обработчик сигнала
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    logger.info("🤖 Запуск Telegram бота...")
    bot = get_bot()
    
    try:
        # Все обработчики уже зарегистрированы в commands.py
        start_polling()
    except KeyboardInterrupt:
        logger.info("🛑 Бот остановлен")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Ошибка бота: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run_bot()
