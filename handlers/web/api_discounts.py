"""API endpoints для скидок"""
from flask import Blueprint, request, jsonify
from flask_login import login_required
from core.database import get_db_manager
from utils.logger import logger
import uuid
from datetime import datetime

bp = Blueprint('api_discounts', __name__, url_prefix='/api/discounts')
db = get_db_manager()

@bp.route('', methods=['GET'])
@login_required
def get_discounts():
    """Получить все скидки"""
    try:
        discounts = db.load('discounts.json')
        return jsonify({'status': 'success', 'discounts': discounts})
    except Exception as e:
        logger.error(f"Ошибка получения скидок: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('', methods=['POST'])
@login_required
def create_discount():
    """Создать скидку"""
    try:
        data = request.json
        discount_id = str(uuid.uuid4())
        
        discount = {
            'id': discount_id,
            'name': data.get('name', ''),
            'description': data.get('description', ''),
            'percentage': float(data.get('percentage', 0)),
            'min_hours': int(data.get('min_hours', 1)),
            'max_uses': int(data.get('max_uses', -1)),  # -1 = unlimited
            'active': data.get('active', True),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        discounts = db.load('discounts.json')
        discounts[discount_id] = discount
        db.save('discounts.json', discounts)
        
        logger.info(f"✅ Скидка создана: {discount_id}")
        return jsonify({'status': 'success', 'discount': discount})
    except Exception as e:
        logger.error(f"Ошибка создания скидки: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<discount_id>', methods=['PUT'])
@login_required
def update_discount(discount_id):
    """Обновить скидку"""
    try:
        data = request.json
        discounts = db.load('discounts.json')
        
        if discount_id not in discounts:
            return jsonify({'status': 'error', 'message': 'Скидка не найдена'}), 404
        
        discount = discounts[discount_id]
        discount.update(data)
        discount['updated_at'] = datetime.now().isoformat()
        
        db.save('discounts.json', discounts)
        
        logger.info(f"✅ Скидка обновлена: {discount_id}")
        return jsonify({'status': 'success', 'discount': discount})
    except Exception as e:
        logger.error(f"Ошибка обновления скидки: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400

@bp.route('/<discount_id>', methods=['DELETE'])
@login_required
def delete_discount(discount_id):
    """Удалить скидку"""
    try:
        discounts = db.load('discounts.json')
        
        if discount_id not in discounts:
            return jsonify({'status': 'error', 'message': 'Скидка не найдена'}), 404
        
        del discounts[discount_id]
        db.save('discounts.json', discounts)
        
        logger.info(f"✅ Скидка удалена: {discount_id}")
        return jsonify({'status': 'success', 'message': 'Скидка удалена'})
    except Exception as e:
        logger.error(f"Ошибка удаления скидки: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 400
