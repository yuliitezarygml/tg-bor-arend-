import React, { useState, useEffect } from 'react';
import api from '../api';
import './Analytics.css';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    dailyRevenue: [],
    consoleUsage: [],
    userStats: [],
    penaltyStats: [],
    topGames: [],
    activityByHour: [],
    satisfaction: []
  });
  
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7days');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/analytics/extended', {
        params: { range: dateRange },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
      showNotif('❌ Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportReport = async (format) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await api.post(
        `/export/analytics/${format}`,
        {
          dateRange,
          includeAll: true
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${new Date().getTime()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      showNotif(`✅ ${format.toUpperCase()} скачан!`, 'success');
    } catch (error) {
      showNotif('❌ Ошибка экспорта', 'error');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a4de6c', '#d084d0'];

  const overview = analyticsData.overview || {};

  return (
    <div className="analytics-page">
      {notification && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="analytics-header">
        <div className="header-left">
          <h2>📊 Расширенная Аналитика</h2>
          <div className="date-range-selector">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="7days">📅 7 дней</option>
              <option value="30days">📅 30 дней</option>
              <option value="90days">📅 90 дней</option>
              <option value="year">📅 Год</option>
              <option value="all">📅 Всё время</option>
            </select>
          </div>
        </div>
        <div className="export-buttons">
          <button 
            onClick={() => exportReport('pdf')} 
            disabled={loading}
            className="export-btn"
          >
            📄 PDF
          </button>
          <button 
            onClick={() => exportReport('excel')} 
            disabled={loading}
            className="export-btn"
          >
            📊 Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Общий доход</div>
            <div className="kpi-value">{overview.totalRevenue || 0}L</div>
            <div className="kpi-change">
              {overview.revenueGrowth > 0 ? '📈' : '📉'} 
              {Math.abs(overview.revenueGrowth || 0)}%
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">📋</div>
          <div className="kpi-content">
            <div className="kpi-label">Всего аренд</div>
            <div className="kpi-value">{overview.totalRentals || 0}</div>
            <div className="kpi-change">
              {overview.rentalsGrowth > 0 ? '📈' : '📉'} 
              {Math.abs(overview.rentalsGrowth || 0)}%
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">👥</div>
          <div className="kpi-content">
            <div className="kpi-label">Активные юзеры</div>
            <div className="kpi-value">{overview.activeUsers || 0}</div>
            <div className="kpi-change">
              {overview.usersGrowth > 0 ? '📈' : '📉'} 
              {Math.abs(overview.usersGrowth || 0)}%
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⭐</div>
          <div className="kpi-content">
            <div className="kpi-label">Средний рейтинг</div>
            <div className="kpi-value">{(overview.avgRating || 0).toFixed(1)}/5</div>
            <div className="kpi-change">
              {overview.satisfactionLevel || 'Хорошо'}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏰</div>
          <div className="kpi-content">
            <div className="kpi-label">Среднее время аренды</div>
            <div className="kpi-value">{overview.avgRentalDays || 0} дн.</div>
            <div className="kpi-change">
              Сред. {overview.avgRentalPrice || 0}L/день
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">💔</div>
          <div className="kpi-content">
            <div className="kpi-label">Сумма штрафов</div>
            <div className="kpi-value">{overview.totalPenalties || 0}L</div>
            <div className="kpi-change">
              {overview.penaltyCount || 0} случаев
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        {/* Daily Revenue */}
        <div className="chart-card">
          <h3>💹 Дневной доход</h3>
          {analyticsData.dailyRevenue && analyticsData.dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.dailyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="date" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip formatter={(value) => `L${value}`} contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>

        {/* Console Usage */}
        <div className="chart-card">
          <h3>🎮 Использование консолей</h3>
          {analyticsData.consoleUsage && analyticsData.consoleUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.consoleUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="name" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                <Legend />
                <Bar dataKey="usage" fill="#82ca9d" name="Аренды" />
                <Bar dataKey="revenue" fill="#ffc658" name="Доход (L)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>

        {/* Activity by Hour */}
        <div className="chart-card">
          <h3>⏰ Активность по часам</h3>
          {analyticsData.activityByHour && analyticsData.activityByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.activityByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="hour" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                <Legend />
                <Line type="monotone" dataKey="rentals" stroke="#667eea" strokeWidth={2} name="Аренды" />
                <Line type="monotone" dataKey="completions" stroke="#82ca9d" strokeWidth={2} name="Завершения" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>

        {/* Penalty Distribution */}
        <div className="chart-card">
          <h3>⚠️ Распределение штрафов</h3>
          {analyticsData.penaltyStats && analyticsData.penaltyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.penaltyStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.penaltyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>

        {/* User Satisfaction */}
        <div className="chart-card">
          <h3>⭐ Рейтинги и отзывы</h3>
          {analyticsData.satisfaction && analyticsData.satisfaction.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.satisfaction}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="rating" stroke="#a0a0a0" />
                <YAxis stroke="#a0a0a0" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', color: '#e0e0e0' }} />
                <Bar dataKey="count" fill="#a4de6c" name="Количество отзывов" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>

        {/* Top Games */}
        <div className="chart-card">
          <h3>🎯 Топ игр</h3>
          {analyticsData.topGames && analyticsData.topGames.length > 0 ? (
            <div className="top-list">
              {analyticsData.topGames.map((game, index) => (
                <div key={index} className="top-item">
                  <div className="rank">#{index + 1}</div>
                  <div className="item-info">
                    <div className="item-name">{game.name}</div>
                    <div className="item-stats">{game.rentals} аренд · {game.rating}⭐</div>
                  </div>
                  <div className="item-value">{game.revenue}L</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="detailed-tables">
        <div className="table-card">
          <h3>👥 Топ пользователей</h3>
          {analyticsData.userStats && analyticsData.userStats.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Место</th>
                  <th>Пользователь</th>
                  <th>Аренд</th>
                  <th>Потрачено</th>
                  <th>Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.userStats.map((user, index) => (
                  <tr key={index}>
                    <td className="rank">#{index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.rentals}</td>
                    <td>{user.totalSpent}L</td>
                    <td>⭐ {user.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">Нет данных</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
