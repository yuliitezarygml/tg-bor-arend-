"""API endpoints для системных параметров"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from core.database import get_db_manager
from utils.logger import logger
from datetime import datetime

bp = Blueprint('api_settings', __name__, url_prefix='/api/settings')
db = get_db_manager()

@bp.route('/admin', methods=['GET'])
@login_required
def get_admin_settings():
    """Получить настройки админа"""
    try:
        settings = db.load('admin_settings.json')
        return jsonify({'status': 'success', 'settings': settings})
    except Exception as e:
        logger.error(f"Ошибка получения настроек: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/admin', methods=['PUT'])
@login_required
def update_admin_settings():
    """Обновить настройки админа"""
    try:
        data = request.json
        settings = db.load('admin_settings.json')
        
        if 'settings' in settings:
            settings['settings'].update(data)
        else:
            settings = {'settings': data}
        
        db.save('admin_settings.json', settings)
        
        logger.info("✅ Настройки обновлены")
        return jsonify({'status': 'success', 'settings': settings})
    except Exception as e:
        logger.error(f"Ошибка обновления настроек: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/calendar', methods=['GET'])
@login_required
def get_calendar_settings():
    """Получить настройки календаря"""
    try:
        calendar = db.load('calendar.json')
        return jsonify({'status': 'success', 'calendar': calendar})
    except Exception as e:
        logger.error(f"Ошибка получения календаря: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/calendar', methods=['PUT'])
@login_required
def update_calendar_settings():
    """Обновить настройки календаря"""
    try:
        data = request.json
        calendar = db.load('calendar.json')
        
        if 'calendar_settings' in calendar:
            calendar['calendar_settings'].update(data)
        else:
            calendar = {'calendar_settings': data}
        
        db.save('calendar.json', calendar)
        
        logger.info("✅ Настройки календаря обновлены")
        return jsonify({'status': 'success', 'calendar': calendar})
    except Exception as e:
        logger.error(f"Ошибка обновления календаря: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/blocked-dates', methods=['GET'])
@login_required
def get_blocked_dates():
    """Получить заблокированные даты"""
    try:
        blocked = db.load('blocked_dates.json')
        return jsonify({'status': 'success', 'blocked_dates': blocked})
    except Exception as e:
        logger.error(f"Ошибка получения заблокированных дат: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/blocked-dates', methods=['PUT'])
@login_required
def update_blocked_dates():
    """Обновить заблокированные даты"""
    try:
        data = request.json
        blocked = db.load('blocked_dates.json')
        
        if 'blocked_dates' in blocked:
            blocked['blocked_dates'].update(data)
        else:
            blocked = {'blocked_dates': data}
        
        db.save('blocked_dates.json', blocked)
        
        logger.info("✅ Заблокированные даты обновлены")
        return jsonify({'status': 'success', 'blocked_dates': blocked})
    except Exception as e:
        logger.error(f"Ошибка обновления заблокированных дат: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
