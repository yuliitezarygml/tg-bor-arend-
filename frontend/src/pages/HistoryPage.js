import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HistoryPage.css';

function HistoryPage({ addToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchHistory = React.useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке истории:', error);
      addToast('✕ Ошибка при загрузке истории', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_URL, addToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleViewDetails = (item) => {
    setSelectedHistory(item);
    setShowDetails(true);
  };

  const handleRevert = async (id) => {
    if (!window.confirm('Вы уверены? Это действие отката не может быть отменено.')) return;
    try {
      await axios.post(`${API_URL}/api/history/${id}/revert`);
      fetchHistory();
      setShowDetails(false);
      addToast('✓ Изменение отменено!', 'success');
    } catch (error) {
      console.error('Ошибка при откате:', error);
      addToast('✕ Ошибка при откате изменения', 'error');
    }
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'rent': return '🎮';
      case 'complete': return '✓';
      default: return '•';
    }
  };

  const getActionLabel = (action) => {
    switch(action) {
      case 'create': return 'Создано';
      case 'update': return 'Изменено';
      case 'delete': return 'Удалено';
      case 'rent': return 'Аренда начата';
      case 'complete': return 'Аренда завершена';
      default: return 'Действие';
    }
  };

  if (loading) return <div className="loading">⏳ Загрузка истории...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>📜 История изменений</h2>
        <button className="btn btn-primary" onClick={fetchHistory}>
          🔄 Обновить
        </button>
      </div>

      <div className="history-filters">
        <p className="history-count">Всего операций: {history.length}</p>
      </div>

      <div className="history-timeline">
        {history.length > 0 ? (
          history.map((item, index) => (
            <div key={item._id || index} className="history-entry">
              <div className="timeline-marker"></div>
              <div className="history-card">
                <div className="history-header">
                  <span className="action-badge">
                    {getActionIcon(item.action)} {getActionLabel(item.action)}
                  </span>
                  <span className="item-type">{item.type || 'Объект'}</span>
                  <span className="timestamp">{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                </div>

                <div className="history-content">
                  {item.itemName && (
                    <p className="item-name">
                      <strong>Объект:</strong> {item.itemName}
                    </p>
                  )}
                  {item.changes && (
                    <div className="changes-preview">
                      <strong>Изменения:</strong>
                      <div className="changes-list">
                        {Object.entries(item.changes).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="change-item">
                            <span className="change-key">{key}:</span>
                            <span className="change-value">{String(value).substring(0, 50)}</span>
                          </div>
                        ))}
                        {Object.keys(item.changes).length > 3 && (
                          <div className="change-item more">
                            +{Object.keys(item.changes).length - 3} ещё...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="history-actions">
                  <button 
                    className="btn btn-sm btn-info"
                    onClick={() => handleViewDetails(item)}
                  >
                    👁️ Подробнее
                  </button>
                  {['update', 'delete'].includes(item.action) && (
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => handleRevert(item._id)}
                    >
                      ↩️ Откатить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-message">📭 История пуста</p>
        )}
      </div>

      {/* Модальное окно с подробностями */}
      {showDetails && selectedHistory && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Подробности операции</h3>
              <button className="close-btn" onClick={() => setShowDetails(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Действие:</span>
                <span className="detail-value">
                  {getActionIcon(selectedHistory.action)} {getActionLabel(selectedHistory.action)}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Объект:</span>
                <span className="detail-value">{selectedHistory.itemName || 'Unknown'}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Тип:</span>
                <span className="detail-value">{selectedHistory.type}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Время:</span>
                <span className="detail-value">{new Date(selectedHistory.createdAt).toLocaleString('ru-RU')}</span>
              </div>

              {selectedHistory.changes && (
                <div className="detail-row full-width">
                  <span className="detail-label">Все изменения:</span>
                  <div className="changes-full">
                    {Object.entries(selectedHistory.changes).map(([key, value]) => (
                      <div key={key} className="change-row">
                        <span className="key">{key}:</span>
                        <span className="value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedHistory.oldData && (
                <div className="detail-row full-width">
                  <span className="detail-label">Старые данные:</span>
                  <pre className="data-json">{JSON.stringify(selectedHistory.oldData, null, 2)}</pre>
                </div>
              )}

              {selectedHistory.newData && (
                <div className="detail-row full-width">
                  <span className="detail-label">Новые данные:</span>
                  <pre className="data-json">{JSON.stringify(selectedHistory.newData, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDetails(false)}
              >
                Закрыть
              </button>
              {['update', 'delete'].includes(selectedHistory.action) && (
                <button 
                  className="btn btn-warning"
                  onClick={() => {
                    handleRevert(selectedHistory._id);
                  }}
                >
                  ↩️ Откатить это изменение
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
