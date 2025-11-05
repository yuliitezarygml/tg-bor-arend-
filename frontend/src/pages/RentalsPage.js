import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RatingModal from '../components/RatingModal';
import '../styles/RentalsPage.css';

function RentalsPage({ addToast }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchRentals = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rentals`);
      setRentals(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке аренд:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchRentals();
    // Получаем текущего пользователя из localStorage (или из API)
    const userId = localStorage.getItem('userId');
    setCurrentUserId(userId);
  }, [fetchRentals]);

  const completeRental = async (id) => {
    try {
      await axios.put(`${API_URL}/api/rentals/${id}/complete`);
      fetchRentals();
      addToast('✓ Аренда завершена!', 'success');
    } catch (error) {
      console.error('Ошибка при завершении аренды:', error);
      addToast('✕ Ошибка при завершении аренды', 'error');
    }
  };

  if (loading) return <div className="loading">⏳ Загрузка аренд...</div>;

  const activeRentals = rentals.filter(r => r.status === 'active');
  const completedRentals = rentals.filter(r => r.status === 'completed');

  return (
    <div className="page">
      <div className="page-header">
        <h2>📋 Аренды</h2>
        <span className="badge badge-info">Всего: {rentals.length}</span>
      </div>

      <div className="rentals-stats">
        <div className="stat-card">
          <h3>🟢 Активных</h3>
          <p>{activeRentals.length}</p>
        </div>
        <div className="stat-card">
          <h3>✅ Завершено</h3>
          <p>{completedRentals.length}</p>
        </div>
      </div>

      <h3 style={{ marginTop: '30px' }}>🟢 Активные аренды</h3>
      <div className="rentals-table">
        <table>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Консоль</th>
              <th>Начало</th>
              <th>Окончание</th>
              <th>Дней</th>
              <th>Сумма</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {activeRentals.map(rental => (
              <tr key={rental._id}>
                <td>
                  {rental.userId?.firstName} {rental.userId?.lastName}
                </td>
                <td>{rental.consoleId?.name}</td>
                <td>{new Date(rental.startDate).toLocaleDateString('ru-RU')}</td>
                <td>{new Date(rental.endDate).toLocaleDateString('ru-RU')}</td>
                <td>{rental.days}</td>
                <td>{rental.totalPrice}₽</td>
                <td>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => completeRental(rental._id)}
                  >
                    ✓ Завершить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeRentals.length === 0 && (
        <div className="empty-state">
          <p>📭 Активных аренд нет</p>
        </div>
      )}

      <h3 style={{ marginTop: '30px' }}>✅ Завершенные аренды</h3>
      <div className="rentals-table">
        <table>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Консоль</th>
              <th>Начало</th>
              <th>Окончание</th>
              <th>Дней</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {completedRentals.length === 0 && (
        <div className="empty-state">
          <p>📭 Завершённых аренд нет</p>
        </div>
      )}

      {completedRentals.length > 0 && (
        <h3 style={{ marginTop: '30px' }}>⭐ Оценить аренду</h3>
      )}
      <div className="rentals-table">
        <table>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Консоль</th>
              <th>Начало</th>
              <th>Окончание</th>
              <th>Дней</th>
              <th>Сумма</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {completedRentals.map(rental => (
              <tr key={rental._id}>
                <td>
                  {rental.userId?.firstName} {rental.userId?.lastName}
                </td>
                <td>{rental.consoleId?.name}</td>
                <td>{new Date(rental.startDate).toLocaleDateString('ru-RU')}</td>
                <td>{new Date(rental.endDate).toLocaleDateString('ru-RU')}</td>
                <td>{rental.days}</td>
                <td>{rental.totalPrice}₽</td>
                <td>
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => {
                      setSelectedRental(rental);
                      setShowRatingModal(true);
                    }}
                  >
                    ⭐ Оценить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RatingModal
        isOpen={showRatingModal}
        rental={selectedRental}
        userId={currentUserId}
        onClose={() => {
          setShowRatingModal(false);
          setSelectedRental(null);
        }}
        onSubmit={() => {
          fetchRentals();
        }}
      />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RentalsPage;
