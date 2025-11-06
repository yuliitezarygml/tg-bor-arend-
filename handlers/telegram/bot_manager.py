"""Инициализация и управление Telegram ботом"""
import telebot
from core.config import TELEGRAM_BOT_TOKEN
from utils.logger import logger

# Инициализируем бота
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)

def get_bot() -> telebot.TeleBot:
    """Получить экземпляр бота"""
    return bot

def start_polling():
    """Запустить polling бота"""
    logger.info("🤖 Запуск Telegram бота...")
    try:
        bot.polling(none_stop=True, interval=0, timeout=20)
    except Exception as e:
        logger.error(f"❌ Ошибка бота: {e}")
        start_polling()  # Перезапуск при ошибке

# Здесь будут зарегистрированы обработчики из commands.py
