import React, { useState, useEffect } from 'react';
import { consoleAPI } from '../api';
import ConsoleForm from '../components/ConsoleForm';
import ConsoleList from '../components/ConsoleList';
import './ConsolesPage.css';

function ConsolesPage() {
  const [consoles, setConsoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConsole, setEditingConsole] = useState(null);

  useEffect(() => {
    loadConsoles();
  }, []);

  const loadConsoles = async () => {
    try {
      const response = await consoleAPI.getAll();
      setConsoles(response.data);
    } catch (error) {
      console.error('Ошибка загрузки консолей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data) => {
    try {
      await consoleAPI.create(data);
      loadConsoles();
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка добавления консоли:', error);
      alert('Ошибка при добавлении консоли');
    }
  };

  const handleEdit = async (data) => {
    try {
      await consoleAPI.update(editingConsole._id, data);
      loadConsoles();
      setEditingConsole(null);
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка обновления консоли:', error);
      alert('Ошибка при обновлении консоли');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены что хотите удалить консоль?')) {
      try {
        await consoleAPI.delete(id);
        loadConsoles();
      } catch (error) {
        console.error('Ошибка удаления консоли:', error);
        alert('Ошибка при удалении консоли');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="consoles-page">
      <div className="page-header">
        <h1>🎮 Управление консолями</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingConsole(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? '✕ Закрыть' : '+ Добавить консоль'}
        </button>
      </div>

      {showForm && (
        <ConsoleForm 
          onSubmit={editingConsole ? handleEdit : handleAdd}
          initialData={editingConsole}
        />
      )}

      <ConsoleList 
        consoles={consoles}
        onEdit={(console) => {
          setEditingConsole(console);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default ConsolesPage;
