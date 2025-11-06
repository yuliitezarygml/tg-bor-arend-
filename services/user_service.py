"""Сервис управления пользователями"""
from datetime import datetime
from models.user import UserRepository
from utils.exceptions import UserNotFound, UserBanned
from utils.logger import logger

class UserService:
    """Сервис для управления пользователями"""
    
    def __init__(self):
        self.repo = UserRepository()
    
    def get_all_users(self) -> dict:
        """Получить всех пользователей"""
        return self.repo.get_all()
    
    def get_user(self, user_id: str) -> dict:
        """Получить пользователя по ID"""
        return self.repo.get_by_id(user_id)
    
    def register_user(self, user_id: str, username: str = None, 
                     first_name: str = None) -> dict:
        """Зарегистрировать пользователя"""
        user = {
            'id': str(user_id),
            'username': username,
            'first_name': first_name,
            'full_name': first_name,
            'is_banned': False,
            'bot_blocked': False,
            'total_spent': 0,
            'rentals': [],
            'joined_at': datetime.now().isoformat()
        }
        
        self.repo.create(user)
        logger.info(f"✅ Зарегистрирован пользователь: {user_id}")
        return user
    
    def ban_user(self, user_id: str) -> bool:
        """Забанить пользователя"""
        self.repo.ban(user_id)
        logger.warning(f"⛔ Забанен пользователь: {user_id}")
        return True
    
    def unban_user(self, user_id: str) -> bool:
        """Разбанить пользователя"""
        self.repo.unban(user_id)
        logger.info(f"✅ Разбанен пользователь: {user_id}")
        return True
    
    def check_banned(self, user_id: str) -> bool:
        """Проверить, забанен ли пользователь"""
        return self.repo.is_banned(user_id)
    
    def update_user(self, user_id: str, **kwargs) -> dict:
        """Обновить пользователя"""
        self.repo.update(user_id, kwargs)
        logger.info(f"✅ Обновлен пользователь: {user_id}")
        return self.repo.get_by_id(user_id)
    
    def delete_user(self, user_id: str) -> bool:
        """Удалить пользователя"""
        self.repo.delete(user_id)
        logger.info(f"✅ Удален пользователь: {user_id}")
        return True
    
    def add_spent(self, user_id: str, amount: int) -> dict:
        """Добавить потраченные средства"""
        user = self.repo.get_by_id(user_id)
        total_spent = user.get('total_spent', 0) + amount
        self.repo.update(user_id, {'total_spent': total_spent})
        return self.repo.get_by_id(user_id)
