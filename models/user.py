"""Модель пользователя и репозиторий"""
from dataclasses import dataclass
from typing import Dict, Optional
from core.database import get_db_manager
from utils.exceptions import UserNotFound, ValidationError
from utils.validators import validate_user_data

@dataclass
class User:
    """Модель пользователя"""
    id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    full_name: Optional[str] = None
    is_banned: bool = False
    bot_blocked: bool = False
    total_spent: int = 0
    joined_at: Optional[str] = None

class UserRepository:
    """Репозиторий пользователей"""
    
    FILENAME = 'users.json'
    
    def __init__(self):
        self.db = get_db_manager()
    
    def get_all(self) -> Dict[str, dict]:
        """Получить всех пользователей"""
        return self.db.load(self.FILENAME)
    
    def get_by_id(self, user_id: str) -> dict:
        """Получить пользователя по ID"""
        users = self.get_all()
        if user_id not in users:
            raise UserNotFound(f"Пользователь {user_id} не найден")
        return users[user_id]
    
    def create(self, user: dict) -> bool:
        """Создать пользователя"""
        validate_user_data(user)
        users = self.get_all()
        users[user['id']] = user
        return self.db.save(self.FILENAME, users)
    
    def update(self, user_id: str, data: dict) -> bool:
        """Обновить пользователя"""
        users = self.get_all()
        if user_id not in users:
            raise UserNotFound(f"Пользователь {user_id} не найден")
        
        users[user_id].update(data)
        return self.db.save(self.FILENAME, users)
    
    def delete(self, user_id: str) -> bool:
        """Удалить пользователя"""
        users = self.get_all()
        if user_id not in users:
            raise UserNotFound(f"Пользователь {user_id} не найден")
        
        del users[user_id]
        return self.db.save(self.FILENAME, users)
    
    def ban(self, user_id: str) -> bool:
        """Забанить пользователя"""
        return self.update(user_id, {'is_banned': True})
    
    def unban(self, user_id: str) -> bool:
        """Разбанить пользователя"""
        return self.update(user_id, {'is_banned': False})
    
    def is_banned(self, user_id: str) -> bool:
        """Проверить, забанен ли пользователь"""
        try:
            user = self.get_by_id(user_id)
            return user.get('is_banned', False)
        except UserNotFound:
            return False
