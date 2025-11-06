"""API endpoints для консолей"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from services.console_service import ConsoleService
from utils.exceptions import ConsoleNotFound, ValidationError
from utils.logger import logger
import uuid
from datetime import datetime

bp = Blueprint('api_consoles', __name__, url_prefix='/api/consoles')
console_service = ConsoleService()

@bp.route('', methods=['GET'])
@login_required
def get_consoles():
    """Получить все консоли"""
    try:
        consoles = console_service.get_all_consoles()
        return jsonify({'status': 'success', 'consoles': consoles})
    except Exception as e:
        logger.error(f"Ошибка получения консолей: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('', methods=['POST'])
@login_required
def create_console():
    """Создать консоль"""
    try:
        data = request.json
        console = console_service.create_console(
            name=data['name'],
            model=data['model'],
            games=data.get('games', []),
            rental_price=data['rental_price'],
            sale_price=data.get('sale_price', 0)
        )
        return jsonify({'status': 'success', 'console': console})
    except ValidationError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Ошибка создания консоли: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<console_id>', methods=['PUT'])
@login_required
def update_console(console_id):
    """Обновить консоль"""
    try:
        data = request.json
        console = console_service.update_console(console_id, **data)
        return jsonify({'status': 'success', 'console': console})
    except ConsoleNotFound as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        logger.error(f"Ошибка обновления консоли: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<console_id>', methods=['DELETE'])
@login_required
def delete_console(console_id):
    """Удалить консоль"""
    try:
        console_service.delete_console(console_id)
        return jsonify({'status': 'success', 'message': 'Консоль удалена'})
    except ConsoleNotFound as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        logger.error(f"Ошибка удаления консоли: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
