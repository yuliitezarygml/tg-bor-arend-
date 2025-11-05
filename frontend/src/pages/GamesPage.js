import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import './GamesPage.css';

const GamesPage = () => {
  const { addToast } = useToast();
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    platform: 'Multi',
    releaseDate: '',
    developer: '',
    description: '',
    coverUrl: '',
    rating: 7,
  });

  // Fetch games - без зависимостей чтобы избежать бесконечного цикла
  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/games');
      console.log('Loaded games:', response.data);
      setGames(response.data);
      setFilteredGames(response.data);
    } catch (error) {
      console.error('Games load error:', error);
      addToast('Ошибка загрузки игр', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Загрузить игры только при монтировании компонента
  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter games based on search
  useEffect(() => {
    console.log('Games changed:', games, 'Search term:', searchTerm);
    const q = (searchTerm || '').toLowerCase();
    const filtered = games.filter(game => {
      const title = (game.title || '').toLowerCase();
      const genre = (game.genre || '').toLowerCase();
      const developer = (game.developer || '').toLowerCase();
      return (
        title.includes(q) ||
        genre.includes(q) ||
        developer.includes(q)
      );
    });
    console.log('Filtered games:', filtered);
    setFilteredGames(filtered);
  }, [searchTerm, games]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseFloat(value) : value
    }));
  };

  // Handle add/edit game
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      addToast('Введите название игры', 'error');
      return;
    }

    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/games/${editingId}`, formData);
        addToast('Игра обновлена', 'success');
      } else {
        await axios.post('http://localhost:5000/api/games', formData);
        addToast('Игра добавлена', 'success');
      }
      
      setFormData({
        title: '',
        genre: '',
        platform: 'Multi',
        releaseDate: '',
        developer: '',
        description: '',
        coverUrl: '',
        rating: 7,
      });
      setEditingId(null);
      setShowForm(false);
      fetchGames();
    } catch (error) {
      addToast(error.response?.data?.message || 'Ошибка при сохранении', 'error');
    }
  };

  // Handle edit
  const handleEdit = (game) => {
    setFormData({
      title: game.title,
      genre: game.genre,
      platform: game.platform,
      releaseDate: game.releaseDate ? game.releaseDate.split('T')[0] : '',
      developer: game.developer,
      description: game.description,
      coverUrl: game.coverUrl,
      rating: game.rating,
    });
    setEditingId(game._id);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/games/${deleteId}`);
      addToast('Игра удалена', 'success');
      fetchGames();
    } catch (error) {
      addToast('Ошибка удаления', 'error');
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      genre: '',
      platform: 'Multi',
      releaseDate: '',
      developer: '',
      description: '',
      coverUrl: '',
      rating: 7,
    });
  };

  return (
    <div className="games-page">
      <div className="games-header">
        <div className="header-top">
          <h1>🎮 Управление играми</h1>
          <button
            className="btn-add"
            onClick={() => setShowForm(!showForm)}
          >
            <FiPlus /> {showForm ? 'Отмена' : 'Добавить игру'}
          </button>
        </div>

        <div className="search-bar">
          <FiSearch />
          <input
            type="text"
            placeholder="Поиск по названию, жанру или разработчику..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {showForm && (
        <div className="games-form-container">
          <form onSubmit={handleSubmit} className="games-form">
            <div className="form-row">
              <div className="form-group">
                <label>Название игры *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Введите название"
                  required
                />
              </div>
              <div className="form-group">
                <label>Жанр</label>
                <input
                  type="text"
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                  placeholder="Экшн, RPG, Спорт..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Платформа</label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                >
                  <option value="PlayStation">PlayStation</option>
                  <option value="Xbox">Xbox</option>
                  <option value="Nintendo">Nintendo</option>
                  <option value="PC">PC</option>
                  <option value="Multi">Multi</option>
                </select>
              </div>
              <div className="form-group">
                <label>Рейтинг</label>
                <div className="rating-input">
                  <input
                    type="range"
                    name="rating"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.rating}
                    onChange={handleChange}
                  />
                  <span className="rating-value">{formData.rating}</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Разработчик</label>
                <input
                  type="text"
                  name="developer"
                  value={formData.developer}
                  onChange={handleChange}
                  placeholder="Название студии"
                />
              </div>
              <div className="form-group">
                <label>Дата выхода</label>
                <input
                  type="date"
                  name="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Введите описание игры"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>URL обложки</label>
              <input
                type="url"
                name="coverUrl"
                value={formData.coverUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
              {formData.coverUrl && (
                <div className="cover-preview">
                  <img src={formData.coverUrl} alt="Preview" />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingId ? 'Обновить' : 'Добавить'} игру
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="games-stats">
        <div className="stat-card">
          <div className="stat-value">{games.length}</div>
          <div className="stat-label">Всего игр</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {games.length > 0 ? (games.reduce((sum, g) => sum + (g.rating || 0), 0) / games.length).toFixed(1) : '0'}
          </div>
          <div className="stat-label">Средний рейтинг</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : filteredGames.length === 0 ? (
        <div className="no-data">
          {games.length === 0 ? 'Нет добавленных игр' : 'Игры не найдены'}
        </div>
      ) : (
        <div className="games-grid">
          {filteredGames.map(game => (
            <div key={game._id} className="game-card">
              {game.coverUrl && (
                <div className="game-cover">
                  <img src={game.coverUrl} alt={game.title} />
                </div>
              )}
              <div className="game-content">
                <h3 className="game-title">{game.title}</h3>
                <div className="game-meta">
                  {game.platform && <span className="badge platform">{game.platform}</span>}
                  {game.genre && <span className="badge genre">{game.genre}</span>}
                  {game.rating && <span className="badge rating">⭐ {game.rating}</span>}
                </div>
                {game.developer && <p className="game-developer">{game.developer}</p>}
                {game.releaseDate && (
                  <p className="game-date">
                    {new Date(game.releaseDate).toLocaleDateString('ru-RU')}
                  </p>
                )}
                {game.description && (
                  <p className="game-description">{game.description}</p>
                )}
              </div>
              <div className="game-actions">
                <button
                  className="btn-icon edit"
                  onClick={() => handleEdit(game)}
                  title="Редактировать"
                >
                  <FiEdit2 />
                </button>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDelete(game._id)}
                  title="Удалить"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        title="🗑️ Удалить игру?"
        message="Эта игра будет удалена навсегда. Это действие нельзя отменить."
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

export default GamesPage;
