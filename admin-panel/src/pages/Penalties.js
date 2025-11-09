import React, { useState, useEffect } from 'react';
import api from '../api';
import './Penalties.css';

function Penalties() {
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notification, setNotification] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPenalty, setNewPenalty] = useState({
    userId: '',
    rentalId: '',
    consoleId: '',
    amount: '',
    type: 'damage',
    description: ''
  });
  const [users, setUsers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [consoles, setConsoles] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [penaltiesRes, usersRes, rentalsRes, consolesRes] = await Promise.all([
        api.get('/penalties', {
          params: { status: selectedStatus !== 'all' ? selectedStatus : undefined }
        }),
        api.get('/users'),
        api.get('/rentals'),
        api.get('/consoles')
      ]);
      
      setPenalties(penaltiesRes.data || []);
      setUsers(usersRes.data || []);
      setRentals(rentalsRes.data || []);
      setConsoles(consolesRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showNotif('❌ Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddPenalty = async (e) => {
    e.preventDefault();
    if (!newPenalty.userId || !newPenalty.consoleId || !newPenalty.amount || !newPenalty.type) {
      showNotif('❌ Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        userId: newPenalty.userId,
        consoleId: newPenalty.consoleId,
        rentalId: newPenalty.rentalId || undefined,
        amount: parseFloat(newPenalty.amount),
        type: newPenalty.type,
        description: newPenalty.description || 'Штраф наложен администратором'
      };

      await api.post('/penalties', payload);
      
      setNewPenalty({
        userId: '',
        rentalId: '',
        consoleId: '',
        amount: '',
        type: 'damage',
        description: ''
      });
      setShowAddForm(false);
      showNotif('✅ Штраф добавлен!', 'success');
      loadData();
    } catch (error) {
      showNotif('❌ Ошибка добавления: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/penalties/${id}`, { status: newStatus });
      showNotif('✅ Статус обновлен!', 'success');
      loadData();
    } catch (error) {
      showNotif('❌ Ошибка обновления', 'error');
    }
  };

  const handleDeletePenalty = async (id) => {
    if (!window.confirm('Удалить этот штраф?')) return;

    try {
      await api.delete(`/penalties/${id}`);
      showNotif('✅ Штраф удален!', 'success');
      loadData();
    } catch (error) {
      showNotif('❌ Ошибка удаления', 'error');
    }
  };

  const getPenaltyIcon = (type) => {
    const icons = {
      damage: '💔',
      late_return: '⏰',
      missing_item: '📦',
      other: '❓'
    };
    return icons[type] || '⚠️';
  };

  const filteredPenalties = penalties.filter(p =>
    p.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.userId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statuses = {
    pending: { label: '⏳ В ожидании', color: '#f39c12' },
    paid: { label: '✅ Оплачено', color: '#27ae60' },
    disputed: { label: '🔄 Оспорено', color: '#3498db' },
    cancelled: { label: '❌ Отменено', color: '#95a5a6' }
  };

  const totalAmount = filteredPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidAmount = filteredPenalties
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="penalties-page">
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="penalties-header">
        <h2>⚠️ Управление Штрафами</h2>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✖ Отмена' : '➕ Добавить штраф'}
        </button>
      </div>

      <div className="penalties-stats">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-label">Всего штрафов</div>
            <div className="stat-value">{filteredPenalties.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <div className="stat-label">Сумма штрафов</div>
            <div className="stat-value">{totalAmount}L</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-label">Оплачено</div>
            <div className="stat-value">{paidAmount}L</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">Коэффициент</div>
            <div className="stat-value">
              {totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form-container">
          <form onSubmit={handleAddPenalty} className="penalty-form">
            <h3>Добавить новый штраф</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Пользователь *</label>
                <select
                  value={newPenalty.userId}
                  onChange={(e) => setNewPenalty({...newPenalty, userId: e.target.value})}
                  required
                >
                  <option value="">-- Выберите пользователя --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} (@{user.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Аренда (опционально)</label>
                <select
                  value={newPenalty.rentalId}
                  onChange={(e) => setNewPenalty({...newPenalty, rentalId: e.target.value})}
                >
                  <option value="">-- Выберите аренду --</option>
                  {rentals.map(rental => (
                    <option key={rental._id} value={rental._id}>
                      {rental.consoleId?.name} - {new Date(rental.startDate).toLocaleDateString('ru-RU')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Сумма штрафа (L) *</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={newPenalty.amount}
                  onChange={(e) => setNewPenalty({...newPenalty, amount: e.target.value})}
                  required
                  min="0"
                  step="100"
                />
              </div>

              <div className="form-group">
                <label>Тип штрафа *</label>
                <select
                  value={newPenalty.type}
                  onChange={(e) => setNewPenalty({...newPenalty, type: e.target.value})}
                >
                  <option value="damage">💔 Повреждение</option>
                  <option value="late_return">⏰ Просрочка</option>
                  <option value="missing_item">📦 Потеря</option>
                  <option value="other">❓ Другое</option>
                </select>
              </div>

              <div className="form-group">
                <label>Консоль *</label>
                <select
                  value={newPenalty.consoleId}
                  onChange={(e) => setNewPenalty({...newPenalty, consoleId: e.target.value})}
                  required
                >
                  <option value="">-- Выберите консоль --</option>
                  {consoles.map(console => (
                    <option key={console._id} value={console._id}>
                      {console.name} ({console.model})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  placeholder="Подробное описание"
                  value={newPenalty.description}
                  onChange={(e) => setNewPenalty({...newPenalty, description: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Добавляем...' : '💾 Добавить штраф'}
            </button>
          </form>
        </div>
      )}

      <div className="filter-section">
        <div className="filter-tabs">
          <button
            className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('all')}
          >
            📋 Все
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('pending')}
          >
            ⏳ В ожидании
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'paid' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('paid')}
          >
            ✅ Оплачено
          </button>
          <button
            className={`filter-btn ${selectedStatus === 'disputed' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('disputed')}
          >
            🔄 Оспорено
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Поиск по пользователю или причине..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : filteredPenalties.length === 0 ? (
        <div className="empty-state">📭 Штрафы не найдены</div>
      ) : (
        <div className="penalties-table">
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Тип</th>
                <th>Причина</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPenalties.map((penalty) => (
                <tr key={penalty._id}>
                  <td>
                    <div className="user-info">
                      <div>{penalty.userId?.firstName} {penalty.userId?.lastName}</div>
                      <small>@{penalty.userId?.username}</small>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">
                      {getPenaltyIcon(penalty.type)} {penalty.type}
                    </span>
                  </td>
                  <td>{penalty.description || penalty.reason || 'Штраф наложен администратором'}</td>
                  <td className="amount">{penalty.amount}L</td>
                  <td>
                    <select
                      className={`status-select status-${penalty.status}`}
                      value={penalty.status}
                      onChange={(e) => handleUpdateStatus(penalty._id, e.target.value)}
                    >
                      <option value="pending">⏳ В ожидании</option>
                      <option value="paid">✅ Оплачено</option>
                      <option value="disputed">🔄 Оспорено</option>
                      <option value="cancelled">❌ Отменено</option>
                    </select>
                  </td>
                  <td className="date">
                    {new Date(penalty.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePenalty(penalty._id)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Penalties;
