"""API endpoints для аренд"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from services.rental_service import RentalService
from utils.exceptions import RentalNotFound, ConsoleNotAvailable
from utils.logger import logger

bp = Blueprint('api_rentals', __name__, url_prefix='/api/rentals')
rental_service = RentalService()

@bp.route('', methods=['GET'])
@login_required
def get_rentals():
    """Получить все аренды"""
    try:
        rentals = rental_service.rental_repo.get_all()
        return jsonify({'status': 'success', 'rentals': rentals})
    except Exception as e:
        logger.error(f"Ошибка получения аренд: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('', methods=['POST'])
@login_required
def start_rental():
    """Начать аренду"""
    try:
        data = request.json
        rental = rental_service.start_rental(
            data['user_id'],
            data['console_id'],
            data.get('hours')
        )
        return jsonify({'status': 'success', 'rental': rental})
    except ConsoleNotAvailable as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Ошибка начала аренды: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<rental_id>/end', methods=['POST'])
@login_required
def end_rental(rental_id):
    """Завершить аренду"""
    try:
        rental, cost, hours = rental_service.end_rental(rental_id)
        return jsonify({
            'status': 'success',
            'rental': rental,
            'cost': cost,
            'hours': hours
        })
    except RentalNotFound as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        logger.error(f"Ошибка завершения аренды: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
