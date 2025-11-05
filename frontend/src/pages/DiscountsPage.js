import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import './DiscountsPage.css';

const DiscountsPage = () => {
  const { addToast } = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [consoles, setConsoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    percentage: 10,
    description: '',
    consoleId: '',
    isGlobal: true
  });

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/discounts');
      setDiscounts(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке скидок:', error);
      addToast('Ошибка загрузки скидок', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsoles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/consoles');
      setConsoles(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке консолей:', error);
    }
  };

  useEffect(() => {
    fetchDiscounts();
    fetchConsoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'percentage' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || formData.percentage === undefined) {
      addToast('Дата и процент обязательны', 'error');
      return;
    }

    if (formData.percentage < 0 || formData.percentage > 100) {
      addToast('Процент должен быть от 0 до 100', 'error');
      return;
    }

    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/discounts/${editingId}`, formData);
        addToast('Скидка обновлена', 'success');
      } else {
        await axios.post('http://localhost:5000/api/discounts', formData);
        addToast('Скидка добавлена', 'success');
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        percentage: 10,
        description: '',
        consoleId: '',
        isGlobal: true
      });
      setEditingId(null);
      setShowForm(false);
      fetchDiscounts();
    } catch (error) {
      addToast(error.response?.data?.error || 'Ошибка при сохранении', 'error');
    }
  };

  const handleEdit = (discount) => {
    setFormData({
      date: discount.date.split('T')[0],
      percentage: discount.percentage,
      description: discount.description || '',
      consoleId: discount.consoleId?._id || '',
      isGlobal: discount.isGlobal
    });
    setEditingId(discount._id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/discounts/${deleteId}`);
      addToast('Скидка удалена', 'success');
      fetchDiscounts();
    } catch (error) {
      addToast('Ошибка удаления', 'error');
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      percentage: 10,
      description: '',
      consoleId: '',
      isGlobal: true
    });
  };

  const handleDateClick = (dateStr) => {
    setFormData(prev => ({
      ...prev,
      date: dateStr
    }));
    if (!showForm) {
      setShowForm(true);
    }
  };

  const filteredDiscounts = discounts.filter(d => {
    // Берём первые 7 символов даты (YYYY-MM)
    const discountMonth = d.date.substring(0, 7);
    return discountMonth === filterMonth;
  });

  // Группировка скидок по датам для календаря
  const discountsByDate = {};
  filteredDiscounts.forEach(d => {
    // Берём первые 10 символов даты (YYYY-MM-DD)
    const dateStr = d.date.substring(0, 10);
    if (!discountsByDate[dateStr]) {
      discountsByDate[dateStr] = [];
    }
    discountsByDate[dateStr].push(d);
  });

  return (
    <div className="discounts-page">
      <div className="discounts-header">
        <div className="header-top">
          <h1>🏷️ Управление скидками</h1>
          <button
            className="btn-add"
            onClick={() => setShowForm(!showForm)}
          >
            <FiPlus /> {showForm ? 'Отмена' : 'Добавить скидку'}
          </button>
        </div>

        <div className="month-filter">
          <label>Выберите месяц:</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="month-input"
          />
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="discount-form">
            <div className="form-row">
              <div className="form-group">
                <label>Дата *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Процент скидки * (0-100%)</label>
                <div className="percentage-input">
                  <input
                    type="range"
                    name="percentage"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.percentage}
                    onChange={handleChange}
                  />
                  <span className="percentage-value">{formData.percentage}%</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isGlobal"
                    checked={formData.isGlobal}
                    onChange={handleChange}
                  />
                  Глобальная скидка (для всех консолей)
                </label>
              </div>
              {!formData.isGlobal && (
                <div className="form-group">
                  <label>Консоль</label>
                  <select
                    name="consoleId"
                    value={formData.consoleId}
                    onChange={handleChange}
                  >
                    <option value="">-- Выберите консоль --</option>
                    {consoles.map(console => (
                      <option key={console._id} value={console._id}>
                        {console.name} ({console.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Описание (например: "День рождения", "Чёрная пятница")</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Введите описание скидки"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingId ? 'Обновить' : 'Добавить'} скидку
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="discounts-stats">
        <div className="stat-card">
          <div className="stat-value">{discounts.length}</div>
          <div className="stat-label">Всего скидок</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filteredDiscounts.length}</div>
          <div className="stat-label">На месяц</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {filteredDiscounts.length > 0 
              ? (filteredDiscounts.reduce((sum, d) => sum + d.percentage, 0) / filteredDiscounts.length).toFixed(1)
              : '0'}%
          </div>
          <div className="stat-label">Средняя скидка</div>
        </div>
      </div>

      <div className="calendar-section">
        <h2>📅 Календарь скидок на {new Date(filterMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h2>
        <p className="calendar-hint">💡 Кликните на дату в календаре, чтобы выбрать её</p>
        <div className="calendar-grid">
          {Array.from({ length: 31 }).map((_, i) => {
            const date = new Date(filterMonth + '-01');
            date.setDate(i + 1);
            
            if (date.getMonth() !== new Date(filterMonth + '-01').getMonth()) {
              return null;
            }

            // Используем local date без преобразования в ISO
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const dayDiscounts = discountsByDate[dateStr] || [];
            const maxDiscount = dayDiscounts.length > 0 
              ? Math.max(...dayDiscounts.map(d => d.percentage))
              : 0;

            return (
              <div
                key={dateStr}
                className={`calendar-day ${dayDiscounts.length > 0 ? 'has-discount' : ''}`}
                style={{
                  backgroundColor: maxDiscount > 0 ? `rgba(0, 212, 255, ${maxDiscount / 100 * 0.5})` : 'transparent'
                }}
                onClick={() => handleDateClick(dateStr)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleDateClick(dateStr);
                  }
                }}
              >
                <div className="day-number">{date.getDate()}</div>
                {dayDiscounts.length > 0 && (
                  <div className="day-discounts">
                    {dayDiscounts.map(d => (
                      <div key={d._id} className="discount-badge">
                        -{d.percentage}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="no-data">Нет скидок на этот месяц</div>
      ) : (
        <div className="discounts-list">
          <h2>Скидки на {new Date(filterMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h2>
          <table className="discounts-table">
            <thead>
              <tr>
                <th>📅 Дата</th>
                <th>🏷️ Скидка</th>
                <th>🎮 Консоль</th>
                <th>📝 Описание</th>
                <th>⚙️ Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscounts.map(discount => (
                <tr key={discount._id}>
                  <td>{new Date(discount.date).toLocaleDateString('ru-RU')}</td>
                  <td className="discount-cell">{discount.percentage}%</td>
                  <td>
                    {discount.isGlobal 
                      ? '🌍 Все' 
                      : discount.consoleId?.name || 'Удалена'}
                  </td>
                  <td>{discount.description || '-'}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-icon edit"
                      onClick={() => handleEdit(discount)}
                      title="Редактировать"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(discount._id)}
                      title="Удалить"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="🗑️ Удалить скидку?"
        message="Скидка будет удалена навсегда."
        confirmText="Удалить"
        cancelText="Отмена"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowConfirm(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default DiscountsPage;
