import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiBell, FiX } from 'react-icons/fi';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Получаем ожидающие рейтинги как уведомления
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/ratings/pending');
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.read).length);
      } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Обновляем каждые 30 сек

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notification) => {
    // Отмечаем как прочитанное
    setNotifications(prev =>
      prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
    );
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="panel-header">
            <h3>📢 Уведомления</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              <FiX />
            </button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                ✅ Нет уведомлений
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-title">
                    ⭐ Новый рейтинг от {notif.ratedBy?.firstName}
                  </div>
                  <div className="notif-text">
                    Для: {notif.ratedUser?.firstName} {notif.ratedUser?.lastName}
                  </div>
                  <div className="notif-rating">
                    {'⭐'.repeat(notif.rating)} ({notif.rating}/5)
                  </div>
                  <div className="notif-time">
                    {new Date(notif.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="panel-footer">
            <a href="/ratings" className="link-to-ratings">
              📋 Перейти к управлению рейтингами
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
