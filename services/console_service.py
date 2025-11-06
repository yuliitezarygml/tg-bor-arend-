"""Сервис управления консолями"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from models.console import ConsoleRepository
from utils.exceptions import ConsoleNotFound, ValidationError
from utils.logger import logger

class ConsoleService:
    """Сервис для управления консолями"""
    
    def __init__(self):
        self.repo = ConsoleRepository()
    
    def get_all_consoles(self) -> Dict[str, dict]:
        """Получить все консоли"""
        return self.repo.get_all()
    
    def get_available_consoles(self) -> Dict[str, dict]:
        """Получить доступные консоли"""
        all_consoles = self.get_all_consoles()
        return {k: v for k, v in all_consoles.items() if v.get('status') == 'available'}
    
    def get_console(self, console_id: str) -> dict:
        """Получить консоль по ID"""
        return self.repo.get_by_id(console_id)
    
    def create_console(self, name: str, model: str, games: List[str], 
                      rental_price: int, sale_price: int = 0) -> dict:
        """Создать новую консоль"""
        console_id = str(uuid.uuid4())
        console = {
            'id': console_id,
            'name': name,
            'model': model,
            'games': games,
            'rental_price': rental_price,
            'sale_price': sale_price,
            'status': 'available',
            'created_at': datetime.now().isoformat()
        }
        
        self.repo.create(console)
        logger.info(f"✅ Создана консоль: {name} ({console_id})")
        return console
    
    def update_console(self, console_id: str, **kwargs) -> dict:
        """Обновить консоль"""
        console = self.repo.get_by_id(console_id)
        console.update(kwargs)
        self.repo.update(console_id, kwargs)
        logger.info(f"✅ Обновлена консоль: {console_id}")
        return console
    
    def delete_console(self, console_id: str) -> bool:
        """Удалить консоль"""
        self.repo.delete(console_id)
        logger.info(f"✅ Удалена консоль: {console_id}")
        return True
    
    def set_available(self, console_id: str) -> bool:
        """Установить консоль как доступную"""
        self.repo.set_status(console_id, 'available')
        return True
    
    def set_rented(self, console_id: str) -> bool:
        """Установить консоль как арендованную"""
        self.repo.set_status(console_id, 'rented')
        return True
