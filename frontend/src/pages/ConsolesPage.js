import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/ConsolesPage.css';

function ConsolesPage({ addToast }) {
  const [consoles, setConsoles] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    type: 'PlayStation',
    pricePerDay: '',
    description: '',
    serialNumber: '',
    games: []
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchConsoles = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/consoles`);
      setConsoles(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке консолей:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchGames = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке игр:', error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchConsoles();
    fetchGames();
  }, [fetchConsoles, fetchGames]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGameSelect = (gameId) => {
    setFormData(prev => ({
      ...prev,
      games: prev.games.includes(gameId)
        ? prev.games.filter(id => id !== gameId)
        : [...prev.games, gameId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/consoles/${editingId}`, formData);
        addToast('✓ Консоль успешно обновлена!', 'success');
        setEditingId(null);
      } else {
        await axios.post(`${API_URL}/api/consoles`, formData);
        addToast('✓ Консоль успешно добавлена!', 'success');
      }
      setFormData({
        name: '',
        model: '',
        type: 'PlayStation',
        pricePerDay: '',
        description: '',
        serialNumber: '',
        games: []
      });
      setShowForm(false);
      fetchConsoles();
    } catch (error) {
      console.error('Ошибка при сохранении консоли:', error);
      addToast('✕ Ошибка при сохранении консоли', 'error');
    }
  };

  const handleEdit = (console) => {
    setEditingId(console._id);
    setFormData({
      name: console.name,
      model: console.model,
      type: console.type,
      pricePerDay: console.pricePerDay,
      description: console.description || '',
      serialNumber: console.serialNumber || '',
      games: (console.games || []).map(game => typeof game === 'object' ? game._id : game)
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      model: '',
      type: 'PlayStation',
      pricePerDay: '',
      description: '',
      serialNumber: '',
      games: []
    });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/consoles/${deleteId}`);
      fetchConsoles();
      addToast('✓ Консоль удалена!', 'success');
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      addToast('✕ Ошибка при удалении консоли', 'error');
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm('Восстановить эту консоль?')) return;
    try {
      await axios.put(`${API_URL}/api/consoles/${id}`, { status: 'available' });
      fetchConsoles();
      addToast('✓ Консоль восстановлена!', 'success');
    } catch (error) {
      console.error('Ошибка при восстановлении:', error);
      addToast('✕ Ошибка при восстановлении консоли', 'error');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const unused_handleRestore = handleRestore; // Зарезервировано для будущей функции восстановления удалённых консолей

  if (loading) return <div className="loading">⏳ Загрузка консолей...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>🎮 Управление консолями</h2>
        <button className="btn btn-primary" onClick={() => editingId ? handleCancel() : setShowForm(!showForm)}>
          {showForm ? '✕ Закрыть форму' : '+ Добавить консоль'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? '✏️ Редактирование консоли' : '➕ Новая консоль'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Например: PlayStation 5"
              />
            </div>

            <div className="form-group">
              <label>Модель</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                required
                placeholder="Например: PS5 Standard"
              />
            </div>

            <div className="form-group">
              <label>Тип</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option>PlayStation</option>
                <option>Xbox</option>
                <option>Nintendo</option>
                <option>PC</option>
                <option>Handheld</option>
              </select>
            </div>

            <div className="form-group">
              <label>Цена за день (₽)</label>
              <input
                type="number"
                name="pricePerDay"
                value={formData.pricePerDay}
                onChange={handleInputChange}
                required
                placeholder="500"
              />
            </div>

            <div className="form-group">
              <label>Серийный номер</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleInputChange}
                placeholder="PS5-001"
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Описание консоли"
                rows="3"
              ></textarea>
            </div>

            <div className="form-group">
              <label>
                🎮 Выберите игры 
                {formData.games.length > 0 && (
                  <span style={{ color: '#00d4ff', marginLeft: '0.5rem' }}>
                    ({formData.games.length} {formData.games.length === 1 ? 'игра' : 'игр'})
                  </span>
                )}
              </label>
              <div className="games-list">
                {games.length === 0 ? (
                  <p style={{ color: '#999', gridColumn: '1/-1', margin: '1rem 0', textAlign: 'center' }}>
                    ⚠️ Нет доступных игр. Сначала добавьте игры в разделе "Игры".
                  </p>
                ) : (
                  games.map(game => (
                    <div key={game._id} className="game-checkbox">
                      <input
                        type="checkbox"
                        id={`game-${game._id}`}
                        checked={formData.games.includes(game._id)}
                        onChange={() => handleGameSelect(game._id)}
                      />
                      <label htmlFor={`game-${game._id}`} title={game.title}>
                        {game.title} {game.platform && `(${game.platform})`}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-success">
              {editingId ? '✓ Сохранить' : '✓ Добавить консоль'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-danger" onClick={handleCancel}>
                ✕ Отмена
              </button>
            )}
          </form>
        </div>
      )}

      <div className="console-grid">
        {consoles.map(console => (
          <div key={console._id} className="console-card">
            <div className="console-header">
              <h3>{console.name}</h3>
              <span className={`status status-${console.status}`}>
                {console.status === 'available' && '🟢 Доступна'}
                {console.status === 'rented' && '🔴 Арендована'}
                {console.status === 'maintenance' && '🟡 Обслуживание'}
              </span>
            </div>

            <div className="console-info">
              <p><strong>Модель:</strong> {console.model}</p>
              <p><strong>Тип:</strong> {console.type}</p>
              <p><strong>Цена:</strong> {console.pricePerDay}₽/день</p>
              {console.serialNumber && (
                <p><strong>Серийный №:</strong> {console.serialNumber}</p>
              )}
              {console.description && (
                <p><strong>Описание:</strong> {console.description}</p>
              )}
              {console.games && console.games.length > 0 && (
                <div className="console-games">
                  <strong>Игры:</strong>
                  <div className="games-tags">
                    {console.games.map(game => {
                      const gameTitle = typeof game === 'object' ? game.title : game;
                      return (
                        <span key={typeof game === 'object' ? game._id : game} className="game-tag">
                          🎮 {gameTitle}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="console-actions">
              <button className="btn btn-sm btn-primary" onClick={() => handleEdit(console)}>
                ✏️ Редактировать
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(console._id)}>
                🗑️ Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {consoles.length === 0 && (
        <div className="empty-state">
          <p>📭 Нет консолей</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="🗑️ Удалить консоль?"
        message="Консоль будет удалена навсегда. Это действие нельзя отменить."
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
}

export default ConsolesPage;
