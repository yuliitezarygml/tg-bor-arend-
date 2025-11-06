"""Модель консоли и репозиторий"""
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from core.database import get_db_manager
from utils.exceptions import ConsoleNotFound, ValidationError
from utils.validators import validate_console_data

@dataclass
class Console:
    """Модель консоли"""
    id: str
    name: str
    model: str
    games: List[str]
    rental_price: int
    sale_price: int = 0
    status: str = 'available'
    created_at: str = None

class ConsoleRepository:
    """Репозиторий консолей"""
    
    FILENAME = 'consoles.json'
    
    def __init__(self):
        self.db = get_db_manager()
    
    def get_all(self) -> Dict[str, dict]:
        """Получить все консоли"""
        return self.db.load(self.FILENAME)
    
    def get_by_id(self, console_id: str) -> dict:
        """Получить консоль по ID"""
        consoles = self.get_all()
        if console_id not in consoles:
            raise ConsoleNotFound(f"Консоль {console_id} не найдена")
        return consoles[console_id]
    
    def create(self, console: dict) -> bool:
        """Создать новую консоль"""
        validate_console_data(console)
        consoles = self.get_all()
        consoles[console['id']] = console
        return self.db.save(self.FILENAME, consoles)
    
    def update(self, console_id: str, data: dict) -> bool:
        """Обновить консоль"""
        consoles = self.get_all()
        if console_id not in consoles:
            raise ConsoleNotFound(f"Консоль {console_id} не найдена")
        
        consoles[console_id].update(data)
        return self.db.save(self.FILENAME, consoles)
    
    def delete(self, console_id: str) -> bool:
        """Удалить консоль"""
        consoles = self.get_all()
        if console_id not in consoles:
            raise ConsoleNotFound(f"Консоль {console_id} не найдена")
        
        del consoles[console_id]
        return self.db.save(self.FILENAME, consoles)
    
    def set_status(self, console_id: str, status: str) -> bool:
        """Установить статус консоли"""
        return self.update(console_id, {'status': status})
