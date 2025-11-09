import React, { useState, useEffect } from 'react';
import api from '../api';
import './Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [notification, setNotification] = useState(null);
  const [showSendForm, setShowSendForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    recipients: 'all'
  });

  useEffect(() => {
    loadNotifications();
  }, [selectedType]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications', {
        params: { type: selectedType !== 'all' ? selectedType : undefined }
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      showNotif('❌ Ошибка загрузки', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      showNotif('❌ Заполните все поля', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        recipientType: newNotification.recipients === 'all' ? 'all' : 'users'
      };

      await api.post('/notifications/send', payload);
      
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        recipients: 'all'
      });
      setShowSendForm(false);
      showNotif('✅ Уведомление отправлено!', 'success');
      loadNotifications();
    } catch (error) {
      showNotif('❌ Ошибка отправки: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Удалить это уведомление?')) return;

    try {
      await api.delete(`/notifications/${id}`);
      showNotif('✅ Уведомление удалено!', 'success');
      loadNotifications();
    } catch (error) {
      showNotif('❌ Ошибка удаления', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      promo: '🎉'
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type) => {
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      success: '#27ae60',
      promo: '#9b59b6'
    };
    return colors[type] || '#95a5a6';
  };

  return (
    <div className="notifications-page">
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="notif-header">
        <h2>📢 Уведомления</h2>
        <button 
          className="send-btn"
          onClick={() => setShowSendForm(!showSendForm)}
        >
          {showSendForm ? '✖ Отмена' : '✉️ Отправить уведомление'}
        </button>
      </div>

      {showSendForm && (
        <div className="send-form-container">
          <form onSubmit={handleSendNotification} className="send-form">
            <div className="form-row">
              <div className="form-group">
                <label>Заголовок *</label>
                <input
                  type="text"
                  placeholder="Заголовок уведомления"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                  maxLength={100}
                />
                <small>{newNotification.title.length}/100</small>
              </div>

              <div className="form-group">
                <label>Тип *</label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                >
                  <option value="info">ℹ️ Информация</option>
                  <option value="warning">⚠️ Предупреждение</option>
                  <option value="success">✅ Успех</option>
                  <option value="error">❌ Ошибка</option>
                  <option value="promo">🎉 Прomo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Кому отправить *</label>
                <select
                  value={newNotification.recipients}
                  onChange={(e) => setNewNotification({...newNotification, recipients: e.target.value})}
                >
                  <option value="all">👥 Всем пользователям</option>
                  <option value="users">👤 Активным пользователям</option>
                </select>
              </div>
            </div>

            <div className="form-group full">
              <label>Сообщение *</label>
              <textarea
                placeholder="Текст уведомления..."
                value={newNotification.message}
                onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                maxLength={500}
                rows={4}
              />
              <small>{newNotification.message.length}/500</small>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Отправляем...' : '✉️ Отправить всем'}
            </button>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        <button
          className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedType('all')}
        >
          📋 Все ({notifications.length})
        </button>
        <button
          className={`filter-btn ${selectedType === 'info' ? 'active' : ''}`}
          onClick={() => setSelectedType('info')}
        >
          ℹ️ Информация
        </button>
        <button
          className={`filter-btn ${selectedType === 'warning' ? 'active' : ''}`}
          onClick={() => setSelectedType('warning')}
        >
          ⚠️ Предупреждения
        </button>
        <button
          className={`filter-btn ${selectedType === 'success' ? 'active' : ''}`}
          onClick={() => setSelectedType('success')}
        >
          ✅ Успешные
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          📭 Нет уведомлений
        </div>
      ) : (
        <div className="notifications-grid">
          {notifications.map((notif) => (
            <div 
              key={notif._id} 
              className="notification-card"
              style={{ borderLeftColor: getNotificationColor(notif.type) }}
            >
              <div className="notif-header-card">
                <span className="notif-icon">
                  {getNotificationIcon(notif.type)}
                </span>
                <div className="notif-title-info">
                  <h3>{notif.title}</h3>
                  <small className="notif-date">
                    {new Date(notif.createdAt).toLocaleString('ru-RU')}
                  </small>
                </div>
              </div>

              <p className="notif-message">{notif.message}</p>

              <div className="notif-footer">
                <span className="notif-type">{notif.type}</span>
                <span className="notif-recipients">
                  👥 {notif.recipientCount || 0} получателей
                </span>
              </div>

              <button
                className="delete-btn"
                onClick={() => handleDeleteNotification(notif._id)}
                title="Удалить уведомление"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
