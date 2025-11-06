"""Клавиатуры и кнопки для бота"""
from telebot import types

def get_main_keyboard():
    """Главная клавиатура бота"""
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add('🎮 Консоли', '📊 Мой кабинет')
    markup.add('📝 Арендовать', '💰 Купить')
    markup.add('⏰ Мои аренды', '⚙️ Помощь')
    return markup

def get_console_keyboard():
    """Клавиатура для выбора консоли"""
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton('Вернуться', callback_data='back_to_menu'))
    return markup

def get_confirmation_keyboard():
    """Клавиатура подтверждения"""
    markup = types.InlineKeyboardMarkup()
    markup.add(
        types.InlineKeyboardButton('✅ Да', callback_data='confirm'),
        types.InlineKeyboardButton('❌ Нет', callback_data='cancel')
    )
    return markup
