import React, { useState, useEffect } from 'react';
import api from '../api';
import './Dashboard.css';
import ReservationCalendar from '../components/ReservationCalendar';
import Notifications from './Notifications';
import Penalties from './Penalties';
import Analytics from './Analytics';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Dashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rentalSubTab, setRentalSubTab] = useState('active');
  const [consoles, setConsoles] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddConsoleForm, setShowAddConsoleForm] = useState(false);
  const [editingConsole, setEditingConsole] = useState(null);
  const [notification, setNotification] = useState(null);
  const [blockModal, setBlockModal] = useState({ show: false, userId: null, userName: '' });
  const [blockReason, setBlockReason] = useState('');
  
  // Analytics state
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [consoleStats, setConsoleStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [penaltyStats, setPenaltyStats] = useState([]);
  const [activityData, setActivityData] = useState([]);
  
  const [stats, setStats] = useState({
    totalConsoles: 0,
    totalUsers: 0,
    activeRentals: 0,
    totalRevenue: 0,
    revenueToday: 0,
    availableConsoles: 0
  });
  const [newConsole, setNewConsole] = useState({
    name: '',
    serialNumber: '',
    pricePerDay: '',
    condition: 'excellent',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        await loadDashboardData();
      } else if (activeTab === 'graphs') {
        await loadGraphsData();
      } else if (activeTab === 'consoles') {
        const response = await api.get('/consoles');
        setConsoles(response.data);
      } else if (activeTab === 'rentals') {
        const response = await api.get('/rentals');
        setRentals(response.data);
      } else if (activeTab === 'users') {
        const response = await api.get('/users');
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [consolesRes, usersRes, rentalsRes] = await Promise.all([
        api.get('/consoles'),
        api.get('/users'),
        api.get('/rentals')
      ]);

      const allConsoles = consolesRes.data;
      const allUsers = usersRes.data;
      const allRentals = rentalsRes.data;

      const activeRentals = allRentals.filter(r => r.status === 'active');
      const completedRentals = allRentals.filter(r => r.status === 'completed');
      
      const totalRevenue = completedRentals.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const revenueToday = completedRentals
        .filter(r => new Date(r.createdAt) >= today)
        .reduce((sum, r) => sum + (r.totalPrice || 0), 0);

      const availableConsoles = allConsoles.filter(c => c.status === 'available').length;

      setStats({
        totalConsoles: allConsoles.length,
        totalUsers: allUsers.length,
        activeRentals: activeRentals.length,
        totalRevenue,
        revenueToday,
        availableConsoles
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const loadGraphsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const [overviewRes, revenueRes, consolesRes, usersRes, penaltiesRes, activityRes] =
        await Promise.all([
          api.get('/analytics/overview', config),
          api.get('/analytics/revenue', config),
          api.get('/analytics/consoles', config),
          api.get('/analytics/top-users?limit=5', config),
          api.get('/analytics/penalties', config),
          api.get('/analytics/activity?days=7', config),
        ]);

      setOverview(overviewRes.data);
      setRevenueData(revenueRes.data || []);
      setConsoleStats(consolesRes.data || []);
      setUserStats(usersRes.data || []);
      setPenaltyStats(penaltiesRes.data || []);
      setActivityData(activityRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки графиков:', error);
    }
  };

  const exportPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await api.post(
        '/export/analytics/pdf',
        {
          includeOverview: true,
          includeRevenue: true,
          includeConsoles: true,
          includeUsers: true,
          includePenalties: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showNotification('✅ PDF скачан успешно!', 'success');
    } catch (error) {
      console.error('Ошибка экспорта PDF:', error);
      showNotification('❌ Ошибка при экспорте PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConsole = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту консоль?')) {
      try {
        await api.delete(`/consoles/${id}`);
        loadData();
        showNotification('✅ Консоль успешно удалена!', 'success');
      } catch (error) {
        showNotification('❌ Ошибка удаления консоли', 'error');
      }
    }
  };

  const handleCompleteRental = async (id) => {
    try {
      await api.put(`/rentals/${id}/complete`, { depositReturned: true });
      loadData();
      showNotification('✅ Аренда успешно завершена!', 'success');
    } catch (error) {
      showNotification('❌ Ошибка завершения аренды', 'error');
    }
  };

  const handleBlockUser = async (userId, userName) => {
    setBlockModal({ show: true, userId, userName });
    setBlockReason('');
  };

  const confirmBlockUser = async () => {
    try {
      await api.put(`/users/${blockModal.userId}/block`, { reason: blockReason });
      setBlockModal({ show: false, userId: null, userName: '' });
      setBlockReason('');
      loadData();
      showNotification('✅ Пользователь заблокирован!', 'success');
    } catch (error) {
      showNotification('❌ Ошибка блокировки пользователя', 'error');
    }
  };

  const handleUnblockUser = async (id) => {
    if (window.confirm('Вы уверены, что хотите разблокировать пользователя?')) {
      try {
        await api.put(`/users/${id}/unblock`);
        loadData();
        showNotification('✅ Пользователь разблокирован!', 'success');
      } catch (error) {
        showNotification('❌ Ошибка разблокировки пользователя', 'error');
      }
    }
  };

  const handleAddConsole = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consoles', newConsole);
      setShowAddConsoleForm(false);
      setNewConsole({
        name: '',
        serialNumber: '',
        pricePerDay: '',
        condition: 'excellent',
        description: ''
      });
      loadData();
      showNotification('✅ Консоль успешно добавлена!', 'success');
    } catch (error) {
      showNotification('❌ Ошибка добавления консоли: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleEditConsole = (console) => {
    setEditingConsole(console);
    setShowAddConsoleForm(false);
  };

  const handleUpdateConsole = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/consoles/${editingConsole._id}`, editingConsole);
      setEditingConsole(null);
      loadData();
      showNotification('✅ Консоль успешно обновлена!', 'success');
    } catch (error) {
      showNotification('❌ Ошибка обновления консоли: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingConsole(null);
  };

  return (
    <div className="dashboard">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}
      
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎮 PS4 Rental Admin Panel</h1>
        </div>
        <div className="header-right">
          <span>Админ: {admin.username}</span>
          <button className="logout-btn" onClick={onLogout}>
            Выход
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Статистика
            </button>
            <button
              className={`nav-item ${activeTab === 'graphs' ? 'active' : ''}`}
              onClick={() => setActiveTab('graphs')}
            >
              📈 Графики
            </button>
            <button
              className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              � Календарь
            </button>
            <button
              className={`nav-item ${activeTab === 'consoles' ? 'active' : ''}`}
              onClick={() => setActiveTab('consoles')}
            >
              🎮 Консоли
            </button>
            <button
              className={`nav-item ${activeTab === 'rentals' ? 'active' : ''}`}
              onClick={() => setActiveTab('rentals')}
            >
              � Аренды
            </button>
            <button
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Пользователи
            </button>
            <button
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Аналитика
            </button>
            <button
              className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              📢 Уведомления
            </button>
            <button
              className={`nav-item ${activeTab === 'penalties' ? 'active' : ''}`}
              onClick={() => setActiveTab('penalties')}
            >
              ⚠️ Штрафы
            </button>
          </nav>
        </aside>

        <main className="dashboard-content">
          {loading && activeTab !== 'calendar' ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <>
              {/* DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="tab-content">
                  <h2>📊 Статистика</h2>
                  
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">🎮</div>
                      <div className="stat-info">
                        <div className="stat-label">Всего консолей</div>
                        <div className="stat-value">{stats.totalConsoles}</div>
                        <div className="stat-sublabel">Доступно: {stats.availableConsoles}</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">👥</div>
                      <div className="stat-info">
                        <div className="stat-label">Пользователей</div>
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-sublabel">Всего зарегистрировано</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">📋</div>
                      <div className="stat-info">
                        <div className="stat-label">Активные аренды</div>
                        <div className="stat-value">{stats.activeRentals}</div>
                        <div className="stat-sublabel">Сейчас арендуют</div>
                      </div>
                    </div>

                    <div className="stat-card highlight">
                      <div className="stat-icon">💰</div>
                      <div className="stat-info">
                        <div className="stat-label">Доход сегодня</div>
                        <div className="stat-value">{stats.revenueToday}₽</div>
                        <div className="stat-sublabel">За текущий день</div>
                      </div>
                    </div>

                    <div className="stat-card highlight">
                      <div className="stat-icon">💵</div>
                      <div className="stat-info">
                        <div className="stat-label">Общий доход</div>
                        <div className="stat-value">{stats.totalRevenue}₽</div>
                        <div className="stat-sublabel">За все время</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">📈</div>
                      <div className="stat-info">
                        <div className="stat-label">Средний чек</div>
                        <div className="stat-value">
                          {stats.activeRentals > 0 
                            ? Math.round(stats.totalRevenue / (stats.activeRentals + stats.totalUsers))
                            : 0}₽
                        </div>
                        <div className="stat-sublabel">На одну аренду</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAPHS */}
              {activeTab === 'graphs' && (
                <div className="tab-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>📈 Графики и Аналитика</h2>
                    <button onClick={exportPDF} disabled={loading} className="export-btn">
                      📥 Экспортировать PDF
                    </button>
                  </div>

                  <div className="charts-grid">
                    {/* Revenue Chart */}
                    <div className="chart-container">
                      <h3>Доход</h3>
                      {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                            <XAxis dataKey="period" stroke="#a0a0a0" />
                            <YAxis stroke="#a0a0a0" />
                            <Tooltip formatter={(value) => `₽${value}`} contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#8884d8" name="Доход" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="no-data">Нет данных</p>
                      )}
                    </div>

                    {/* Activity Chart */}
                    <div className="chart-container">
                      <h3>Активность (последние 7 дней)</h3>
                      {activityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                            <XAxis dataKey="date" stroke="#a0a0a0" />
                            <YAxis stroke="#a0a0a0" />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                            <Legend />
                            <Bar dataKey="rentals" fill="#82ca9d" name="Аренды" />
                            <Bar dataKey="penalties" fill="#ff7c7c" name="Штрафы" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="no-data">Нет данных</p>
                      )}
                    </div>

                    {/* Top Consoles */}
                    <div className="chart-container">
                      <h3>Топ консолей</h3>
                      {consoleStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={consoleStats.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                            <XAxis dataKey="name" stroke="#a0a0a0" />
                            <YAxis stroke="#a0a0a0" />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                            <Bar dataKey="rentals" fill="#ffc658" name="Аренды" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="no-data">Нет данных</p>
                      )}
                    </div>

                    {/* Penalties Pie */}
                    <div className="chart-container">
                      <h3>Штрафы по типам</h3>
                      {penaltyStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={penaltyStats}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {penaltyStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="no-data">Нет данных</p>
                      )}
                    </div>

                    {/* Top Users */}
                    <div className="chart-container">
                      <h3>Активные пользователи</h3>
                      <div className="users-list">
                        {userStats.length > 0 ? (
                          userStats.map((user, index) => (
                            <div key={index} className="user-item">
                              <div className="user-rank">{index + 1}</div>
                              <div className="user-info">
                                <div className="user-name">{user.username || 'N/A'}</div>
                                <div className="user-spent">₽{user.totalSpent || 0}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">Нет данных</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CALENDAR */}
              {activeTab === 'calendar' && (
                <ReservationCalendar />
              )}

              {activeTab === 'consoles' && (
                <div className="tab-content">
                  <div className="tab-header">
                    <h2>🎮 Управление Консолями</h2>
                    <button 
                      className="add-btn"
                      onClick={() => setShowAddConsoleForm(!showAddConsoleForm)}
                    >
                      {showAddConsoleForm ? '✖ Отмена' : '➕ Добавить консоль'}
                    </button>
                  </div>

                  {showAddConsoleForm && (
                    <div className="add-form">
                      <h3>Добавить новую консоль</h3>
                      <form onSubmit={handleAddConsole}>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Название *</label>
                            <input
                              type="text"
                              required
                              placeholder="PlayStation 4 Pro"
                              value={newConsole.name}
                              onChange={(e) => setNewConsole({...newConsole, name: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Серийный номер *</label>
                            <input
                              type="text"
                              required
                              placeholder="PS4-001"
                              value={newConsole.serialNumber}
                              onChange={(e) => setNewConsole({...newConsole, serialNumber: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Цена за день (₽) *</label>
                            <input
                              type="number"
                              required
                              placeholder="500"
                              value={newConsole.pricePerDay}
                              onChange={(e) => setNewConsole({...newConsole, pricePerDay: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Состояние *</label>
                            <select
                              value={newConsole.condition}
                              onChange={(e) => setNewConsole({...newConsole, condition: e.target.value})}
                            >
                              <option value="excellent">⭐⭐⭐⭐⭐ Отличное</option>
                              <option value="good">⭐⭐⭐⭐ Хорошее</option>
                              <option value="fair">⭐⭐⭐ Среднее</option>
                              <option value="poor">⭐⭐ Плохое</option>
                            </select>
                          </div>
                          <div className="form-group full-width">
                            <label>Описание</label>
                            <textarea
                              placeholder="Дополнительная информация о консоли..."
                              value={newConsole.description}
                              onChange={(e) => setNewConsole({...newConsole, description: e.target.value})}
                              rows="3"
                            />
                          </div>
                        </div>
                        <button type="submit" className="submit-btn">
                          💾 Сохранить консоль
                        </button>
                      </form>
                    </div>
                  )}

                  {editingConsole && (
                    <div className="add-form">
                      <h3>✏️ Редактировать консоль</h3>
                      <form onSubmit={handleUpdateConsole}>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Название *</label>
                            <input
                              type="text"
                              required
                              value={editingConsole.name}
                              onChange={(e) => setEditingConsole({...editingConsole, name: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Серийный номер *</label>
                            <input
                              type="text"
                              required
                              value={editingConsole.serialNumber}
                              onChange={(e) => setEditingConsole({...editingConsole, serialNumber: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Цена за день (₽) *</label>
                            <input
                              type="number"
                              required
                              value={editingConsole.pricePerDay}
                              onChange={(e) => setEditingConsole({...editingConsole, pricePerDay: e.target.value})}
                            />
                          </div>
                          <div className="form-group">
                            <label>Состояние *</label>
                            <select
                              value={editingConsole.condition}
                              onChange={(e) => setEditingConsole({...editingConsole, condition: e.target.value})}
                            >
                              <option value="excellent">⭐⭐⭐⭐⭐ Отличное</option>
                              <option value="good">⭐⭐⭐⭐ Хорошее</option>
                              <option value="fair">⭐⭐⭐ Среднее</option>
                              <option value="poor">⭐⭐ Плохое</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Статус *</label>
                            <select
                              value={editingConsole.status}
                              onChange={(e) => setEditingConsole({...editingConsole, status: e.target.value})}
                            >
                              <option value="available">Доступна</option>
                              <option value="rented">Арендована</option>
                              <option value="maintenance">На ремонте</option>
                            </select>
                          </div>
                          <div className="form-group full-width">
                            <label>Описание</label>
                            <textarea
                              value={editingConsole.description || ''}
                              onChange={(e) => setEditingConsole({...editingConsole, description: e.target.value})}
                              rows="3"
                            />
                          </div>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="submit-btn">
                            💾 Сохранить изменения
                          </button>
                          <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                            ✖ Отмена
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Название</th>
                          <th>Серийный номер</th>
                          <th>Статус</th>
                          <th>Цена/день</th>
                          <th>Состояние</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consoles.map((console) => (
                          <tr key={console._id}>
                            <td>{console.name}</td>
                            <td>{console.serialNumber}</td>
                            <td>
                              <span className={`status ${console.status}`}>
                                {console.status === 'available' && 'Доступна'}
                                {console.status === 'rented' && 'Арендована'}
                                {console.status === 'maintenance' && 'На ремонте'}
                              </span>
                            </td>
                            <td>{console.pricePerDay}₽</td>
                            <td>{console.condition}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-btn"
                                  onClick={() => handleEditConsole(console)}
                                >
                                  ✏️ Редактировать
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleDeleteConsole(console._id)}
                                >
                                  🗑️ Удалить
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'rentals' && (
                <div className="tab-content">
                  <h2>📋 Управление Арендами</h2>
                  
                  <div className="sub-tabs">
                    <button
                      className={`sub-tab ${rentalSubTab === 'active' ? 'active' : ''}`}
                      onClick={() => setRentalSubTab('active')}
                    >
                      ✅ Активные ({rentals.filter(r => r.status === 'active').length})
                    </button>
                    <button
                      className={`sub-tab ${rentalSubTab === 'history' ? 'active' : ''}`}
                      onClick={() => setRentalSubTab('history')}
                    >
                      📜 История ({rentals.filter(r => r.status !== 'active').length})
                    </button>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Консоль</th>
                          <th>Пользователь</th>
                          <th>Начало</th>
                          <th>Конец</th>
                          <th>Сумма</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentals
                          .filter(rental => 
                            rentalSubTab === 'active' 
                              ? rental.status === 'active'
                              : rental.status !== 'active'
                          )
                          .map((rental) => (
                          <tr key={rental._id}>
                            <td>{rental.consoleId?.name || 'N/A'}</td>
                            <td>{rental.userId?.firstName || 'N/A'}</td>
                            <td>{new Date(rental.startDate).toLocaleDateString('ru-RU')}</td>
                            <td>{new Date(rental.endDate).toLocaleDateString('ru-RU')}</td>
                            <td>{rental.totalPrice}₽</td>
                            <td>
                              <span className={`status ${rental.status}`}>
                                {rental.status === 'active' && '🟢 Активна'}
                                {rental.status === 'completed' && '✅ Завершена'}
                                {rental.status === 'cancelled' && '❌ Отменена'}
                              </span>
                            </td>
                            <td>
                              {rental.status === 'active' && (
                                <button
                                  className="complete-btn"
                                  onClick={() => handleCompleteRental(rental._id)}
                                >
                                  ✅ Завершить
                                </button>
                              )}
                              {rental.status === 'completed' && (
                                <span className="info-text">
                                  Залог: {rental.depositReturned ? '✅ Возвращён' : '❌ Не возвращён'}
                                </span>
                              )}
                              {rental.status === 'cancelled' && (
                                <span className="info-text cancelled-text">
                                  Отменена администратором
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rentals.filter(rental => 
                      rentalSubTab === 'active' 
                        ? rental.status === 'active'
                        : rental.status !== 'active'
                    ).length === 0 && (
                      <div className="empty-state">
                        {rentalSubTab === 'active' 
                          ? '📭 Нет активных аренд'
                          : '📜 История аренд пуста'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="tab-content">
                  <h2>👥 Пользователи</h2>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Имя</th>
                          <th>Username</th>
                          <th>Телефон</th>
                          <th>Email</th>
                          <th>Всего аренд</th>
                          <th>Потрачено</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user._id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>@{user.username}</td>
                            <td>{user.phoneNumber || 'N/A'}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.totalRentals}</td>
                            <td>{user.totalSpent}₽</td>
                            <td>
                              <span className={`status ${user.isBlocked ? 'blocked' : 'active'}`}>
                                {user.isBlocked ? '🚫 Заблокирован' : '✅ Активен'}
                              </span>
                              {user.isBlocked && user.blockReason && (
                                <div className="block-reason">
                                  <small>Причина: {user.blockReason}</small>
                                </div>
                              )}
                            </td>
                            <td>
                              {user.isBlocked ? (
                                <button
                                  className="unblock-btn"
                                  onClick={() => handleUnblockUser(user._id)}
                                >
                                  ✅ Разблокировать
                                </button>
                              ) : (
                                <button
                                  className="block-btn"
                                  onClick={() => handleBlockUser(user._id, `${user.firstName} ${user.lastName}`)}
                                >
                                  🚫 Заблокировать
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ANALYTICS */}
              {activeTab === 'analytics' && (
                <Analytics />
              )}

              {/* NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <Notifications />
              )}

              {/* PENALTIES */}
              {activeTab === 'penalties' && (
                <Penalties />
              )}
            </>
          )}
        </main>
      </div>

      {/* Модальное окно блокировки */}
      {blockModal.show && (
        <div className="modal-overlay" onClick={() => setBlockModal({ show: false, userId: null, userName: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚫 Блокировка пользователя</h3>
            <p>Вы собираетесь заблокировать пользователя <strong>{blockModal.userName}</strong></p>
            
            <div className="form-group">
              <label>Причина блокировки *</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Укажите причину блокировки..."
                rows="4"
                required
              />
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn confirm-btn" 
                onClick={confirmBlockUser}
                disabled={!blockReason.trim()}
              >
                🚫 Заблокировать
              </button>
              <button 
                className="modal-btn cancel-btn" 
                onClick={() => setBlockModal({ show: false, userId: null, userName: '' })}
              >
                ✖ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
