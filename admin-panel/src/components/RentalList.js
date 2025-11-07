import React from 'react';
import './RentalList.css';

function RentalList({ rentals, onApprove, onReject }) {
  const statusColors = {
    pending: '#ff9800',
    approved: '#4caf50',
    rejected: '#f44336',
    completed: '#2196f3',
  };

  const statusNames = {
    pending: 'На рассмотрении',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    completed: 'Завершена',
  };

  return (
    <div className="rental-list">
      <table className="rental-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Пользователь</th>
            <th>Консоль</th>
            <th>Стоимость</th>
            <th>Дата аренды</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((rental) => (
            <tr key={rental._id}>
              <td>{rental._id.slice(-6)}</td>
              <td>
                <div className="user-info">
                  <strong>{rental.userId.firstName} {rental.userId.lastName}</strong>
                  <span>{rental.userId.phoneNumber}</span>
                </div>
              </td>
              <td>{rental.consoleId.name}</td>
              <td className="price">{rental.totalPrice} MDL</td>
              <td>{new Date(rental.rentalDate).toLocaleDateString('uk-UA')}</td>
              <td>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: statusColors[rental.status] }}
                >
                  {statusNames[rental.status]}
                </span>
              </td>
              <td>
                <div className="actions">
                  {rental.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => onApprove(rental._id)}
                        title="Одобрить"
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onReject(rental._id)}
                        title="Отклонить"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {rental.status === 'approved' && (
                    <span className="approved-label">Активна</span>
                  )}
                  {rental.status === 'rejected' && (
                    <span className="rejected-label">Отказано</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RentalList;
