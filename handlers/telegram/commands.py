"""Команды Telegram бота"""
from telebot import types
from handlers.telegram.bot_manager import get_bot
from handlers.telegram.keyboards import get_main_keyboard, get_confirmation_keyboard
from handlers.telegram.messages import (
    get_welcome_message, get_consoles_message, get_console_details_message,
    get_user_stats_message, get_rental_info_message
)
from handlers.telegram.utils import safe_send_message, safe_edit_message
from services.user_service import UserService
from services.console_service import ConsoleService
from services.rental_service import RentalService
from utils.exceptions import UserBanned
from utils.logger import logger

bot = get_bot()
user_service = UserService()
console_service = ConsoleService()
rental_service = RentalService()

# ===== КОМАНДЫ =====

@bot.message_handler(commands=['start'])
def handle_start(message: types.Message):
    """Обработчик команды /start"""
    user_id = str(message.from_user.id)
    
    try:
        # Проверяем, не забанен ли пользователь
        if user_service.check_banned(user_id):
            raise UserBanned(f"Пользователь {user_id} забанен")
        
        # Проверяем, зарегистрирован ли пользователь
        try:
            user = user_service.get_user(user_id)
        except:
            # Регистрируем нового пользователя
            user = user_service.register_user(
                user_id,
                message.from_user.username,
                message.from_user.first_name
            )
        
        welcome_msg = get_welcome_message(user.get('first_name', 'Пользователь'))
        safe_send_message(bot, message.chat.id, welcome_msg, reply_markup=get_main_keyboard())
        
    except UserBanned:
        safe_send_message(bot, message.chat.id, "❌ Вы заблокированы в системе.")
    except Exception as e:
        logger.error(f"Ошибка в /start: {e}")
        safe_send_message(bot, message.chat.id, f"❌ Ошибка: {str(e)}")

@bot.message_handler(commands=['help'])
def handle_help(message: types.Message):
    """Обработчик команды /help"""
    help_text = """
    🆘 Справка по командам:
    
    /start - Запуск бота
    /help - Эта справка
    /end <rental_id> - Завершить аренду
    /stats - Ваша статистика
    
    Кнопки меню:
    🎮 Консоли - Просмотр доступных консолей
    📊 Мой кабинет - Ваша статистика
    📝 Арендовать - Забронировать консоль
    💰 Купить - Приобрести консоль
    ⏰ Мои аренды - Активные аренды
    """
    safe_send_message(bot, message.chat.id, help_text, reply_markup=get_main_keyboard())

@bot.message_handler(regexp="🎮 Консоли")
def handle_consoles(message: types.Message):
    """Показать список консолей"""
    try:
        consoles = console_service.get_available_consoles()
        msg = get_consoles_message(len(consoles))
        
        markup = types.InlineKeyboardMarkup()
        for console_id, console in list(consoles.items())[:10]:
            markup.add(
                types.InlineKeyboardButton(
                    f"🎮 {console['name']} - {console['rental_price']} лей/ч",
                    callback_data=f"console_{console_id}"
                )
            )
        markup.add(types.InlineKeyboardButton("🔙 Назад", callback_data="back_to_menu"))
        
        safe_send_message(bot, message.chat.id, msg, reply_markup=markup)
    except Exception as e:
        logger.error(f"Ошибка в handle_consoles: {e}")
        safe_send_message(bot, message.chat.id, f"❌ Ошибка: {str(e)}")

@bot.message_handler(regexp="📊 Мой кабинет")
def handle_profile(message: types.Message):
    """Показать статистику пользователя"""
    try:
        user_id = str(message.from_user.id)
        user = user_service.get_user(user_id)
        rentals = rental_service.get_user_rentals(user_id)
        
        stats = {
            'rentals': rentals,
            'status': 'Обычный пользователь'
        }
        
        msg = get_user_stats_message(user, stats)
        safe_send_message(bot, message.chat.id, msg, reply_markup=get_main_keyboard())
    except Exception as e:
        logger.error(f"Ошибка в handle_profile: {e}")
        safe_send_message(bot, message.chat.id, f"❌ Ошибка: {str(e)}")

@bot.callback_query_handler(func=lambda call: call.data.startswith("console_"))
def handle_console_selection(call: types.CallbackQuery):
    """Обработка выбора консоли"""
    try:
        console_id = call.data.replace("console_", "")
        console = console_service.get_console(console_id)
        msg = get_console_details_message(console)
        
        markup = types.InlineKeyboardMarkup()
        if console['status'] == 'available':
            markup.add(types.InlineKeyboardButton("📝 Арендовать", 
                                                 callback_data=f"rent_{console_id}"))
        markup.add(types.InlineKeyboardButton("🔙 Назад", callback_data="back_consoles"))
        
        safe_edit_message(bot, call, msg, reply_markup=markup)
    except Exception as e:
        logger.error(f"Ошибка в handle_console_selection: {e}")
        safe_send_message(bot, call.message.chat.id, f"❌ Ошибка: {str(e)}")

@bot.callback_query_handler(func=lambda call: call.data == "back_to_menu")
def handle_back_to_menu(call: types.CallbackQuery):
    """Вернуться в главное меню"""
    try:
        msg = "👈 Вернулись в главное меню"
        safe_edit_message(bot, call, msg, reply_markup=get_main_keyboard())
    except:
        safe_send_message(bot, call.message.chat.id, msg, reply_markup=get_main_keyboard())
