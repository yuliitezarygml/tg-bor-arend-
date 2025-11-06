"""Авторизация и аутентификация"""
from flask import redirect, url_for, session
from flask_login import UserMixin, LoginManager
from core.database import get_db_manager
import os

login_manager = LoginManager()

class User(UserMixin):
    """Модель пользователя Flask"""
    def __init__(self, user_id):
        self.id = user_id

@login_manager.user_loader
def load_user(user_id):
    """Загрузка пользователя при авторизации"""
    db = get_db_manager()
    try:
        admins = db.load('admins.json')
        if user_id in admins:
            return User(user_id)
    except:
        pass
    return None

def init_login_manager(app):
    """Инициализировать менеджер логина"""
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
