import React, { useState } from 'react';
import axios from 'axios';
import { FiStar, FiX } from 'react-icons/fi';
import { useToast } from './Toast';
import './RatingModal.css';

const RatingModal = ({ isOpen, rental, userId, onClose, onSubmit }) => {
  const { addToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('overall');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      addToast('Ошибка: пользователь не найден', 'error');
      return;
    }

    try {
      setLoading(true);
      const ratedUser = rental.userId._id || rental.userId;

      await axios.post('http://localhost:5000/api/ratings', {
        ratedBy: userId,
        ratedUser,
        rentalId: rental._id,
        rating,
        comment,
        category
      });

      addToast('Рейтинг отправлен на одобрение администратору', 'success');
      setRating(5);
      setComment('');
      setCategory('overall');

      if (onSubmit) {
        onSubmit();
      }
      onClose();
    } catch (error) {
      addToast(error.response?.data?.error || 'Ошибка при отправке рейтинга', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const consoleName = rental?.consoleId?.name || 'Консоль';
  const rentalDate = new Date(rental?.startDate).toLocaleDateString('ru-RU');

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FiX size={24} />
        </button>

        <h2>⭐ Оцените аренду</h2>
        <p className="modal-subtitle">
          Консоль: {consoleName} | Дата: {rentalDate}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Звёзды рейтинга */}
          <div className="rating-stars-input">
            <label>Ваша оценка:</label>
            <div className="stars-container">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`star-btn ${i < rating ? 'active' : ''}`}
                  onClick={() => setRating(i + 1)}
                >
                  <FiStar size={32} />
                </button>
              ))}
            </div>
            <p className="rating-text">{rating} из 5 звёзд</p>
          </div>

          {/* Категория */}
          <div className="form-group">
            <label>Категория оценки:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="overall">Общая оценка</option>
              <option value="speed">Скорость доставки</option>
              <option value="quality">Качество консоли</option>
              <option value="communication">Общение</option>
            </select>
          </div>

          {/* Комментарий */}
          <div className="form-group">
            <label>Комментарий (не обязательно):</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Напишите ваш отзыв..."
              maxLength="500"
              className="form-textarea"
              rows="4"
            />
            <p className="char-count">{comment.length}/500</p>
          </div>

          {/* Кнопки */}
          <div className="modal-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Отправка...' : 'Отправить рейтинг'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;
