import React, { useState, useEffect } from 'react';
import { userAPI } from '../api';
import UsersList from '../components/UsersList';
import './UsersPage.css';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>👥 Все пользователи ({users.length})</h2>
      </div>
      <UsersList users={users} />
    </div>
  );
}

export default UsersPage;
