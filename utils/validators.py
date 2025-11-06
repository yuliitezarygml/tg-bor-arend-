"""Валидация входных данных"""
from utils.exceptions import ValidationError

def validate_console_data(data: dict) -> bool:
    """Валидация данных консоли"""
    required_fields = ['name', 'model', 'rental_price']
    
    for field in required_fields:
        if field not in data or data[field] is None:
            raise ValidationError(f"Поле '{field}' обязательно")
    
    if not isinstance(data['rental_price'], (int, float)) or data['rental_price'] <= 0:
        raise ValidationError("Цена аренды должна быть положительным числом")
    
    return True

def validate_user_data(data: dict) -> bool:
    """Валидация данных пользователя"""
    required_fields = ['id']
    
    for field in required_fields:
        if field not in data or data[field] is None:
            raise ValidationError(f"Поле '{field}' обязательно")
    
    return True

def validate_rental_data(data: dict) -> bool:
    """Валидация данных аренды"""
    required_fields = ['user_id', 'console_id', 'start_time']
    
    for field in required_fields:
        if field not in data or data[field] is None:
            raise ValidationError(f"Поле '{field}' обязательно")
    
    return True
