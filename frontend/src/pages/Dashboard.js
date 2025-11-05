import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalConsoles: 0,
    availableConsoles: 0,
    totalUsers: 0,
    activeRentals: 0,
    totalRevenue: 0
  });
  const [activeRentals, setActiveRentals] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentSpending, setCurrentSpending] = useState({});
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchStats = React.useCallback(async () => {
    try {
      const [consoesRes, usersRes, rentalsRes] = await Promise.all([
        axios.get(`${API_URL}/api/consoles`),
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/rentals`)
      ]);

      const consoles = consoesRes.data;
      const users = usersRes.data;
      const rentals = rentalsRes.data;

      const availableConsoles = consoles.filter(c => c.status === 'available').length;
      const activeRentals = rentals.filter(r => r.status === 'active').length;
      const totalRevenue = rentals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + r.totalPrice, 0);

      setStats({
        totalConsoles: consoles.length,
        availableConsoles,
        totalUsers: users.length,
        activeRentals,
        totalRevenue
      });

      // Активные аренды
      const active = rentals
        .filter(r => r.status === 'active')
        .slice(0, 5);
      setActiveRentals(active);

      // История (последние операции)
      const hist = rentals
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(r => ({
          id: r._id,
          type: r.status === 'active' ? 'Новая аренда' : 'Завершена',
          console: r.consoleId?.name || 'Unknown',
          user: r.userId?.firstName || 'Unknown',
          time: new Date(r.createdAt).toLocaleString('ru-RU')
        }));
      setHistory(hist);
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Обновляем текущие расходы в реальном времени
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpending(prev => {
        const updated = { ...prev };
        activeRentals.forEach(rental => {
          if (rental._id && rental.pricePerHour) {
            const startTime = new Date(rental.startDate);
            const now = new Date();
            const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
            updated[rental._id] = (hoursElapsed * rental.pricePerHour).toFixed(2);
          }
        });
        return updated;
      });
    }, 1000); // Обновляем каждую секунду

    return () => clearInterval(interval);
  }, [activeRentals]);

  if (loading) return <div className="loading">⏳ Загрузка...</div>;

  return (
    <div className="dashboard">
      <h2>⚙️ Админ панель</h2>

      {/* Первый ряд - основные метрики */}
      <div className="stats-grid-main">
        <div className="stat-box-large">
          <div className="stat-number">{stats.availableConsoles}</div>
          <div className="stat-icon">🎮</div>
          <div className="stat-label">Свободные консоли</div>
        </div>

        <div className="stat-box-large">
          <div className="stat-number">{stats.activeRentals}</div>
          <div className="stat-icon">⏱️</div>
          <div className="stat-label">Арендованы</div>
        </div>

        <div className="stat-box-large">
          <div className="stat-number">{stats.totalUsers}</div>
          <div className="stat-icon">👥</div>
          <div className="stat-label">Пользователей</div>
        </div>

        <div className="stat-box-large">
          <div className="stat-number">0</div>
          <div className="stat-icon">🔔</div>
          <div className="stat-label">Активные аренды</div>
        </div>
      </div>

      {/* Второй ряд - дополнительная информация */}
      <div className="stats-grid-secondary">
        <div className="stat-box-secondary">
          <div className="stat-amount">{stats.totalRevenue}₽</div>
          <div className="stat-desc">Общий доход</div>
          <div className="stat-icon-small">�</div>
        </div>

        <div className="stat-box-secondary">
          <div className="stat-amount">0 лей/ч</div>
          <div className="stat-desc">Активный доход/час</div>
          <div className="stat-icon-small">📈</div>
        </div>

        <div className="stat-box-secondary">
          <div className="stat-amount">0 лей</div>
          <div className="stat-desc">Доход сегодня</div>
          <div className="stat-icon-small">�</div>
        </div>

        <div className="stat-box-secondary">
          <div className="stat-amount">500 лей</div>
          <div className="stat-desc">Средняя аренда</div>
          <div className="stat-icon-small">🧮</div>
        </div>
      </div>

      {/* Активные аренды */}
      <div className="dashboard-section">
        <h3>📋 Активные аренды (реальное время)</h3>
        <div className="rentals-list">
          {activeRentals.length > 0 ? (
            activeRentals.map(rental => (
              <div key={rental._id} className="rental-item-live">
                <div className="rental-info">
                  <strong>{rental.consoleId?.name}</strong>
                  <span className="rental-user">{rental.userId?.firstName} {rental.userId?.lastName}</span>
                  <span className="rental-start">Начало: {new Date(rental.startDate).toLocaleString('ru-RU')}</span>
                </div>
                <div className="rental-live-data">
                  <div className="rental-price-hour">{rental.pricePerHour}₽/ч</div>
                  <div className="rental-current-spending">
                    <span className="spending-label">Потрачено:</span>
                    <span className="spending-amount">{currentSpending[rental._id] || 0}₽</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">Нет активных аренд</p>
          )}
        </div>
      </div>

      {/* История */}
      <div className="dashboard-section">
        <h3>📜 История изменений</h3>
        <div className="history-list">
          {history.length > 0 ? (
            history.map(item => (
              <div key={item.id} className="history-item">
                <div className="history-type">{item.type}</div>
                <div className="history-details">
                  <span className="history-console">{item.console}</span>
                  <span className="history-user">{item.user}</span>
                </div>
                <div className="history-time">{item.time}</div>
              </div>
            ))
          ) : (
            <p className="empty-message">Истории нет</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
