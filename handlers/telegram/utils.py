"""Утилиты для Telegram бота"""
import telebot
from utils.logger import logger

def safe_send_message(bot: telebot.TeleBot, user_id: int, message: str, 
                      parse_mode: str = 'Markdown', reply_markup=None) -> bool:
    """Безопасная отправка сообщения пользователю"""
    try:
        bot.send_message(user_id, message, parse_mode=parse_mode, reply_markup=reply_markup)
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка отправки сообщения пользователю {user_id}: {e}")
        return False

def safe_edit_message(bot: telebot.TeleBot, call, text: str, 
                     parse_mode: str = 'Markdown', reply_markup=None) -> bool:
    """Безопасное редактирование сообщения"""
    try:
        if call.message.photo:
            # Если сообщение с фото, удаляем его и отправляем новое
            bot.delete_message(call.message.chat.id, call.message.message_id)
            bot.send_message(call.message.chat.id, text, parse_mode=parse_mode, 
                           reply_markup=reply_markup)
        else:
            # Обычное текстовое сообщение - просто редактируем
            bot.edit_message_text(text, call.message.chat.id, call.message.message_id, 
                                parse_mode=parse_mode, reply_markup=reply_markup)
        return True
    except Exception as e:
        logger.error(f"❌ Ошибка редактирования сообщения: {e}")
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except:
            pass
        bot.send_message(call.message.chat.id, text, parse_mode=parse_mode, 
                       reply_markup=reply_markup)
        return False
