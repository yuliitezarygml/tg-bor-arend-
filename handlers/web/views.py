"""Основные views Flask приложения"""
from flask import Blueprint, render_template, redirect, url_for, request, session
from flask_login import login_required, login_user, logout_user, current_user
from handlers.web.auth import User
from core.database import get_db_manager
from utils.logger import logger

bp = Blueprint('main', __name__)
db = get_db_manager()

@bp.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')

@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Вход в админ-панель"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        try:
            admins = db.load('admins.json')
        except:
            admins = {}
        
        if username in admins and admins[username]['password'] == password:
            user = User(username)
            login_user(user)
            logger.info(f"✅ Вход администратора: {username}")
            return redirect(url_for('main.admin'))
        else:
            logger.warning(f"❌ Неудачный вход: {username}")
    
    return render_template('login.html')

@bp.route('/logout')
@login_required
def logout():
    """Выход из админ-панели"""
    logger.info(f"✅ Выход администратора: {current_user.id}")
    logout_user()
    return redirect(url_for('main.index'))

@bp.route('/admin')
@login_required
def admin():
    """Админ-панель"""
    try:
        consoles = db.load('consoles.json')
    except:
        consoles = {}
    
    try:
        users = db.load('users.json')
    except:
        users = {}
    
    try:
        rentals = db.load('rentals.json')
    except:
        rentals = {}
    
    try:
        rental_requests = db.load('rental_requests.json')
    except:
        rental_requests = {}
    
    try:
        admin_settings = db.load('admin_settings.json')
    except:
        admin_settings = {}
    
    try:
        discounts = db.load('discounts.json')
    except:
        discounts = {}
    
    return render_template('admin.html',
                         consoles=consoles,
                         users=users,
                         rentals=rentals,
                         rental_requests=rental_requests,
                         admin_settings=admin_settings,
                         discounts=discounts)
