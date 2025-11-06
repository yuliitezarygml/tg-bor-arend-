"""Модель аренды и репозиторий"""
from dataclasses import dataclass
from typing import Dict, Optional
from core.database import get_db_manager
from utils.exceptions import RentalNotFound, ValidationError
from utils.validators import validate_rental_data

@dataclass
class Rental:
    """Модель аренды"""
    id: str
    user_id: str
    console_id: str
    start_time: str
    end_time: Optional[str] = None
    status: str = 'active'
    total_cost: int = 0

class RentalRepository:
    """Репозиторий аренд"""
    
    FILENAME = 'rentals.json'
    
    def __init__(self):
        self.db = get_db_manager()
    
    def get_all(self) -> Dict[str, dict]:
        """Получить все аренды"""
        return self.db.load(self.FILENAME)
    
    def get_by_id(self, rental_id: str) -> dict:
        """Получить аренду по ID"""
        rentals = self.get_all()
        if rental_id not in rentals:
            raise RentalNotFound(f"Аренда {rental_id} не найдена")
        return rentals[rental_id]
    
    def get_active_by_user(self, user_id: str) -> list:
        """Получить активные аренды пользователя"""
        rentals = self.get_all()
        return [r for r in rentals.values() 
                if r.get('user_id') == user_id and r.get('status') == 'active']
    
    def get_active_by_console(self, console_id: str) -> Optional[dict]:
        """Получить активную аренду консоли"""
        rentals = self.get_all()
        for rental in rentals.values():
            if (rental.get('console_id') == console_id and 
                rental.get('status') == 'active'):
                return rental
        return None
    
    def create(self, rental: dict) -> bool:
        """Создать аренду"""
        validate_rental_data(rental)
        rentals = self.get_all()
        rentals[rental['id']] = rental
        return self.db.save(self.FILENAME, rentals)
    
    def update(self, rental_id: str, data: dict) -> bool:
        """Обновить аренду"""
        rentals = self.get_all()
        if rental_id not in rentals:
            raise RentalNotFound(f"Аренда {rental_id} не найдена")
        
        rentals[rental_id].update(data)
        return self.db.save(self.FILENAME, rentals)
    
    def delete(self, rental_id: str) -> bool:
        """Удалить аренду"""
        rentals = self.get_all()
        if rental_id not in rentals:
            raise RentalNotFound(f"Аренда {rental_id} не найдена")
        
        del rentals[rental_id]
        return self.db.save(self.FILENAME, rentals)
