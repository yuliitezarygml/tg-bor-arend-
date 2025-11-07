import React from 'react';
import './UsersList.css';

function UsersList({ users }) {
  return (
    <div className="users-list">
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Фамилия</th>
            <th>Telegram</th>
            <th>Номер телефона</th>
            <th>Статус</th>
            <th>Дата регистрации</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="user-id">{user._id.slice(-6)}</td>
              <td>{user.firstName || '-'}</td>
              <td>{user.lastName || '-'}</td>
              <td>
                <code className="telegram-id">@{user.username || user.telegramId.slice(-6)}</code>
              </td>
              <td className="phone">{user.phoneNumber || '❌ Не указан'}</td>
              <td>
                <span className={`status-badge ${user.contactShared ? 'verified' : 'pending'}`}>
                  {user.contactShared ? '✅ Верифицирован' : '⏳ Ожидание'}
                </span>
              </td>
              <td className="date">{new Date(user.createdAt).toLocaleDateString('uk-UA')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UsersList;
