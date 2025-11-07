import React, { useState, useEffect } from 'react';
import { rentalAPI } from '../api';
import RentalList from '../components/RentalList';
import './RentalsPage.css';

function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rentalsRes, statsRes] = await Promise.all([
        rentalAPI.getAll(),
        rentalAPI.getStats(),
      ]);
      setRentals(rentalsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await rentalAPI.approve(id);
      loadData();
      alert('✅ Заявка одобрена!');
    } catch (error) {
      console.error('Ошибка при одобрении:', error);
      alert('Ошибка при одобрении заявки');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Введите причину отклонения:');
    if (reason !== null) {
      try {
        await rentalAPI.reject(id, reason);
        loadData();
        alert('❌ Заявка отклонена!');
      } catch (error) {
        console.error('Ошибка при отклонении:', error);
        alert('Ошибка при отклонении заявки');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="rentals-page">
      {stats && (
        <div className="stats-container">
          <div className="stat-card stat-green">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalConsoles}</div>
              <div className="stat-label">Свободные консоли</div>
            </div>
          </div>

          <div className="stat-card stat-yellow">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.pendingRentals}</div>
              <div className="stat-label">Арендованы</div>
            </div>
          </div>

          <div className="stat-card stat-cyan">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">Пользователей</div>
            </div>
          </div>

          <div className="stat-card stat-blue">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.approvedRentals}</div>
              <div className="stat-label">Активные аренды</div>
            </div>
          </div>

          <div className="stat-card stat-gray">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalRevenue} MDL</div>
              <div className="stat-label">Средняя аренда</div>
            </div>
          </div>

          <div className="stat-card stat-dark">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.rentedConsoles}</div>
              <div className="stat-label">Всего аренд</div>
            </div>
          </div>
        </div>
      )}

      <div className="rentals-section">
        <h2>🎮 Управление консолями</h2>
        <RentalList 
          rentals={rentals}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
}

export default RentalsPage;
