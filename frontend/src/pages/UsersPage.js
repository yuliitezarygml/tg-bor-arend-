import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/UsersPage.css';

function UsersPage({ addToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/users/${userId}`, { status: newStatus });
      fetchUsers();
      addToast('✓ Статус пользователя обновлён!', 'success');
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      addToast('✕ Ошибка при обновлении статуса', 'error');
    }
  };

  if (loading) return <div className="loading">⏳ Загрузка пользователей...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>👥 Пользователи</h2>
        <span className="badge badge-info">Всего: {users.length}</span>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Профиль</th>
              <th>Имя</th>
              <th>Telegram</th>
              <th>Статус</th>
              <th>Аренды</th>
              <th>Потрачено</th>
              <th>Регистрация</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-avatar-table">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt={user.firstName} />
                    ) : (
                      <div className="avatar-placeholder-table">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="user-name-cell">
                    <strong>{user.firstName} {user.lastName}</strong>
                  </div>
                </td>
                <td>@{user.telegramUsername || 'unknown'}</td>
                <td>
                  <span className={`badge badge-${user.status}`}>
                    {user.status === 'active' && '🟢 Активен'}
                    {user.status === 'inactive' && '⚫ Неактивен'}
                    {user.status === 'blocked' && '🔴 Заблокирован'}
                  </span>
                </td>
                <td>{user.totalRentals}</td>
                <td>{user.totalSpent || 0}₽</td>
                <td>{new Date(user.registeredAt).toLocaleDateString('ru-RU')}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-info"
                    onClick={() => handleViewProfile(user)}
                  >
                    👁️ Профиль
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <p>📭 Нет пользователей</p>
        </div>
      )}

      {/* Модальный профиль */}
      {showProfile && selectedUser && (
        <div className="profile-modal-overlay" onClick={handleCloseProfile}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleCloseProfile}>✕</button>

            <div className="profile-header">
              <div className="profile-avatar">
                {selectedUser.photoUrl ? (
                  <img src={selectedUser.photoUrl} alt={selectedUser.firstName} />
                ) : (
                  <div className="avatar-placeholder-large">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </div>
                )}
              </div>
              <h2>{selectedUser.firstName} {selectedUser.lastName}</h2>
              <p className="profile-username">@{selectedUser.telegramUsername || 'unknown'}</p>
            </div>

            <div className="profile-body">
              <div className="profile-section">
                <h4>📱 Информация</h4>
                <div className="info-row">
                  <span className="label">Telegram ID:</span>
                  <span className="value">{selectedUser.telegramId}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedUser.email || 'Не указан'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Телефон:</span>
                  <span className="value">{selectedUser.phone || 'Не указан'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Bio:</span>
                  <span className="value">{selectedUser.bio || 'Не указано'}</span>
                </div>
              </div>

              <div className="profile-section">
                <h4>📊 Статистика</h4>
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-num">{selectedUser.totalRentals}</div>
                    <div className="stat-label">Всего аренд</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-num">{selectedUser.totalSpent || 0}₽</div>
                    <div className="stat-label">Потрачено</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-num">
                      {selectedUser.totalRentals > 0 
                        ? ((selectedUser.totalSpent || 0) / selectedUser.totalRentals).toFixed(0) 
                        : 0}₽
                    </div>
                    <div className="stat-label">Средняя сумма</div>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h4>⏱️ История</h4>
                <div className="info-row">
                  <span className="label">Регистрация:</span>
                  <span className="value">{new Date(selectedUser.registeredAt).toLocaleString('ru-RU')}</span>
                </div>
                <div className="info-row">
                  <span className="label">Последняя активность:</span>
                  <span className="value">{selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString('ru-RU') : 'Никогда'}</span>
                </div>
              </div>

              <div className="profile-section">
                <h4>🔧 Управление</h4>
                <div className="status-selector">
                  <label>Статус:</label>
                  <select 
                    value={selectedUser.status}
                    onChange={(e) => handleStatusChange(selectedUser._id, e.target.value)}
                  >
                    <option value="active">🟢 Активен</option>
                    <option value="inactive">⚫ Неактивен</option>
                    <option value="blocked">🔴 Заблокирован</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
