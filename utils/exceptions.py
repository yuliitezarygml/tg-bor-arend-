"""Пользовательские исключения приложения"""

class ConsoleNotFound(Exception):
    """Консоль не найдена"""
    pass

class UserNotFound(Exception):
    """Пользователь не найден"""
    pass

class UserBanned(Exception):
    """Пользователь забанен"""
    pass

class RentalNotFound(Exception):
    """Аренда не найдена"""
    pass

class ConsoleNotAvailable(Exception):
    """Консоль недоступна"""
    pass

class ValidationError(Exception):
    """Ошибка валидации"""
    pass

class AuthenticationError(Exception):
    """Ошибка авторизации"""
    pass
