"""Сервис управления арендами"""
import uuid
from datetime import datetime, timedelta
from models.rental import RentalRepository
from models.console import ConsoleRepository
from models.user import UserRepository
from core.config import RENTAL_CONFIG
from utils.exceptions import RentalNotFound, ConsoleNotAvailable
from utils.logger import logger

class RentalService:
    """Сервис для управления арендами"""
    
    def __init__(self):
        self.rental_repo = RentalRepository()
        self.console_repo = ConsoleRepository()
        self.user_repo = UserRepository()
    
    def start_rental(self, user_id: str, console_id: str, hours: int = None) -> dict:
        """Начать аренду"""
        # Проверяем, доступна ли консоль
        console = self.console_repo.get_by_id(console_id)
        if console['status'] != 'available':
            raise ConsoleNotAvailable(f"Консоль {console_id} недоступна")
        
        rental_id = str(uuid.uuid4())
        rental = {
            'id': rental_id,
            'user_id': str(user_id),
            'console_id': console_id,
            'start_time': datetime.now().isoformat(),
            'status': 'active',
            'total_cost': 0,
            'selected_hours': hours
        }
        
        # Сохраняем аренду
        self.rental_repo.create(rental)
        # Меняем статус консоли
        self.console_repo.set_rented(console_id)
        
        logger.info(f"✅ Начата аренда: {rental_id} (пользователь {user_id}, консоль {console_id})")
        return rental
    
    def end_rental(self, rental_id: str) -> tuple:
        """Завершить аренду"""
        rental = self.rental_repo.get_by_id(rental_id)
        
        if rental['status'] != 'active':
            raise RentalNotFound(f"Аренда {rental_id} уже завершена")
        
        # Рассчитываем стоимость
        start_time = datetime.fromisoformat(rental['start_time'])
        end_time = datetime.now()
        duration = end_time - start_time
        hours = max(1, int(duration.total_seconds() / 3600))
        
        console = self.console_repo.get_by_id(rental['console_id'])
        total_cost = hours * console['rental_price']
        
        # Обновляем аренду
        self.rental_repo.update(rental_id, {
            'end_time': end_time.isoformat(),
            'status': 'completed',
            'total_cost': total_cost
        })
        
        # Меняем статус консоли
        self.console_repo.set_available(rental['console_id'])
        
        # Обновляем статистику пользователя
        self.user_repo.update(rental['user_id'], {
            'total_spent': self.user_repo.get_by_id(rental['user_id']).get('total_spent', 0) + total_cost
        })
        
        logger.info(f"✅ Завершена аренда: {rental_id} (стоимость: {total_cost} лей, часов: {hours})")
        return self.rental_repo.get_by_id(rental_id), total_cost, hours
    
    def get_active_rentals(self) -> list:
        """Получить все активные аренды"""
        rentals = self.rental_repo.get_all()
        return [r for r in rentals.values() if r.get('status') == 'active']
    
    def get_user_rentals(self, user_id: str) -> list:
        """Получить аренды пользователя"""
        return self.rental_repo.get_active_by_user(user_id)
    
    def get_console_rental(self, console_id: str) -> dict:
        """Получить аренду консоли"""
        return self.rental_repo.get_active_by_console(console_id)
    
    def calculate_rental_cost(self, console_id: str, hours: int) -> int:
        """Рассчитать стоимость аренды"""
        console = self.console_repo.get_by_id(console_id)
        return hours * console['rental_price']
