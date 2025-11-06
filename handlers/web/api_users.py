"""API endpoints для пользователей"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from services.user_service import UserService
from utils.exceptions import UserNotFound
from utils.logger import logger

bp = Blueprint('api_users', __name__, url_prefix='/api/users')
user_service = UserService()

@bp.route('', methods=['GET'])
@login_required
def get_users():
    """Получить всех пользователей"""
    try:
        users = user_service.get_all_users()
        return jsonify({'status': 'success', 'users': users})
    except Exception as e:
        logger.error(f"Ошибка получения пользователей: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<user_id>', methods=['POST'])
@login_required
def update_user(user_id):
    """Обновить пользователя"""
    try:
        data = request.json
        action = data.get('action')
        
        if action == 'ban':
            user_service.ban_user(user_id)
        elif action == 'unban':
            user_service.unban_user(user_id)
        else:
            user = user_service.update_user(user_id, **data)
            return jsonify({'status': 'success', 'user': user})
        
        return jsonify({'status': 'success', 'message': 'Пользователь обновлен'})
    except UserNotFound as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        logger.error(f"Ошибка обновления пользователя: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """Удалить пользователя"""
    try:
        user_service.delete_user(user_id)
        return jsonify({'status': 'success', 'message': 'Пользователь удален'})
    except UserNotFound as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        logger.error(f"Ошибка удаления пользователя: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
