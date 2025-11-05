import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiStar, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import './RatingsPage.css';

const RatingsPage = () => {
  const { addToast } = useToast();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const fetchPendingRatings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/ratings/pending');
      setRatings(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке рейтингов:', error);
      addToast('Ошибка загрузки рейтингов', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRatings();
  }, []);

  const handleApprove = async (ratingId) => {
    try {
      await axios.put(`http://localhost:5000/api/ratings/${ratingId}/approve`);
      addToast('Рейтинг одобрен', 'success');
      fetchPendingRatings();
    } catch (error) {
      addToast('Ошибка одобрения рейтинга', 'error');
    }
  };

  const handleReject = async (ratingId) => {
    if (!rejectReason.trim()) {
      addToast('Укажите причину отклонения', 'error');
      return;
    }

    try {
      await axios.put(`http://localhost:5000/api/ratings/${ratingId}/reject`, {
        reason: rejectReason
      });
      addToast('Рейтинг отклонен', 'success');
      setShowRejectForm(false);
      setRejectReason('');
      setRejectId(null);
      fetchPendingRatings();
    } catch (error) {
      addToast('Ошибка отклонения рейтинга', 'error');
    }
  };

  const handleDelete = async (ratingId) => {
    try {
      await axios.delete(`http://localhost:5000/api/ratings/${ratingId}`);
      addToast('Рейтинг удалён', 'success');
      fetchPendingRatings();
    } catch (error) {
      addToast('Ошибка удаления рейтинга', 'error');
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <FiStar
        key={i}
        className={i < rating ? 'star filled' : 'star'}
        size={20}
      />
    ));
  };

  return (
    <div className="ratings-page">
      <div className="ratings-header">
        <h1>⭐ Рейтинги пользователей</h1>
        <button onClick={fetchPendingRatings} className="btn-refresh">
          🔄 Обновить
        </button>
      </div>

      <div className="ratings-stats">
        <div className="stat-card">
          <div className="stat-value">{ratings.length}</div>
          <div className="stat-label">Ожидают одобрения</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка рейтингов...</div>
      ) : ratings.length === 0 ? (
        <div className="no-data">✅ Нет ожидающих рейтингов</div>
      ) : (
        <div className="ratings-list">
          {ratings.map(rating => (
            <div key={rating._id} className="rating-card">
              <div className="rating-header">
                <div className="rating-user">
                  <h3>
                    {rating.ratedBy?.firstName} {rating.ratedBy?.lastName}
                  </h3>
                  <p>оценил {rating.ratedUser?.firstName} {rating.ratedUser?.lastName}</p>
                </div>
                <div className="rating-score">
                  <div className="stars">
                    {renderStars(rating.rating)}
                  </div>
                  <span className="rating-value">{rating.rating}/5</span>
                </div>
              </div>

              {rating.comment && (
                <div className="rating-comment">
                  <p>{rating.comment}</p>
                </div>
              )}

              <div className="rating-meta">
                <span className="category">📂 {
                  rating.category === 'speed' ? 'Скорость' :
                  rating.category === 'quality' ? 'Качество' :
                  rating.category === 'communication' ? 'Общение' :
                  'Общая оценка'
                }</span>
                <span className="date">
                  📅 {new Date(rating.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              <div className="rating-actions">
                <button
                  className="btn-action approve"
                  onClick={() => handleApprove(rating._id)}
                  title="Одобрить"
                >
                  <FiCheck /> Одобрить
                </button>
                <button
                  className="btn-action reject"
                  onClick={() => {
                    setRejectId(rating._id);
                    setShowRejectForm(true);
                  }}
                  title="Отклонить"
                >
                  <FiX /> Отклонить
                </button>
                <button
                  className="btn-action delete"
                  onClick={() => {
                    setDeleteId(rating._id);
                    setShowConfirm(true);
                  }}
                  title="Удалить"
                >
                  <FiTrash2 /> Удалить
                </button>
              </div>

              {showRejectForm && rejectId === rating._id && (
                <div className="reject-form">
                  <textarea
                    placeholder="Причина отклонения (обязательно)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="reject-actions">
                    <button
                      className="btn-submit"
                      onClick={() => handleReject(rating._id)}
                    >
                      Отклонить
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                        setRejectId(null);
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="🗑️ Удалить рейтинг?"
        message="Рейтинг будет удалён навсегда."
        confirmText="Удалить"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={() => handleDelete(deleteId)}
        onCancel={() => {
          setShowConfirm(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default RatingsPage;
