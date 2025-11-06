"""
Flask приложение для веб-интерфейса
Использует модульную архитектуру
"""
from flask import Flask
from flask_login import LoginManager
from core.config import SECRET_KEY, WEB_CONFIG
from handlers.web.auth import init_login_manager
from handlers.web import views, api_consoles, api_users, api_rentals, api_discounts, api_settings
from utils.logger import logger
import os

def create_app():
    """Создать и настроить Flask приложение"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = SECRET_KEY
    
    # Инициализируем LoginManager
    init_login_manager(app)
    
    # Регистрируем blueprints
    app.register_blueprint(views.bp)
    app.register_blueprint(api_consoles.bp)
    app.register_blueprint(api_users.bp)
    app.register_blueprint(api_rentals.bp)
    app.register_blueprint(api_discounts.bp)
    app.register_blueprint(api_settings.bp)
    
    logger.info("✅ Flask приложение инициализировано")
    return app

# Создаём приложение
app = create_app()

if __name__ == '__main__':
    logger.info("🌐 Запуск Flask сервера на http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
