import React from 'react';
import './ConsoleList.css';

function ConsoleList({ consoles, onEdit, onDelete }) {
  const statusColors = {
    available: '#4caf50',
    rented: '#ff9800',
    maintenance: '#f44336',
  };

  const statusNames = {
    available: 'Доступна',
    rented: 'В аренде',
    maintenance: 'На обслуживании',
  };

  return (
    <div className="console-list">
      <table className="console-table">
        <thead>
          <tr>
            <th>Фото</th>
            <th>ID</th>
            <th>Название</th>
            <th>Модель</th>
            <th>Игры</th>
            <th>Цена аренды</th>
            <th>Статус</th>
            <th>Аредатор</th>
            <th>Геолокация</th>
            <th>Время аренды</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {consoles.map((console) => (
            <tr key={console._id}>
              <td className="console-photo">
                {console.image ? (
                  <img src={console.image} alt={console.name} />
                ) : (
                  <div className="no-photo">Нет фото</div>
                )}
              </td>
              <td className="console-id">{console._id.slice(-6)}</td>
              <td>{console.name}</td>
              <td>{console.model}</td>
              <td>{console.game}</td>
              <td className="price">{console.rentalPrice} MDL/ч</td>
              <td>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: statusColors[console.status] }}
                >
                  {statusNames[console.status]}
                </span>
              </td>
              <td>—</td>
              <td>{console.location || 'Не указана'}</td>
              <td>—</td>
              <td>
                <div className="actions">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => onEdit(console)}
                    title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => onDelete(console._id)}
                    title="Удалить"
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ConsoleList;
