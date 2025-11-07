import React, { useState } from 'react';
import ConsolesPage from './pages/ConsolesPage';
import RentalsPage from './pages/RentalsPage';
import UsersPage from './pages/UsersPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('rentals');

  return (
    <div className="app">
      <nav className="app-nav">
        <button 
          className={`nav-link ${currentPage === 'rentals' ? 'active' : ''}`}
          onClick={() => setCurrentPage('rentals')}
        >
          📋 Заявки
        </button>
        <button 
          className={`nav-link ${currentPage === 'consoles' ? 'active' : ''}`}
          onClick={() => setCurrentPage('consoles')}
        >
          🎮 Консоли
        </button>
        <button 
          className={`nav-link ${currentPage === 'users' ? 'active' : ''}`}
          onClick={() => setCurrentPage('users')}
        >
          👥 Пользователи
        </button>
      </nav>

      <main className="app-main">
        {currentPage === 'rentals' && <RentalsPage />}
        {currentPage === 'consoles' && <ConsolesPage />}
        {currentPage === 'users' && <UsersPage />}
      </main>
    </div>
  );
}

export default App;
