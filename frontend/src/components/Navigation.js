import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiBox, FiUsers, FiShoppingCart } from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="header-content">
          <h1>🎮 Console Admin</h1>
          <NotificationCenter />
        </div>
      </div>
      
      <ul className="nav-menu">
        <li>
          <Link to="/" className="nav-link">
            <FiHome /> Главная
          </Link>
        </li>
        <li>
          <Link to="/consoles" className="nav-link">
            <FiBox /> Консоли
          </Link>
        </li>
        <li>
          <Link to="/games" className="nav-link">
            🎮 Игры
          </Link>
        </li>
        <li>
          <Link to="/discounts" className="nav-link">
            🏷️ Скидки
          </Link>
        </li>
        <li>
          <Link to="/ratings" className="nav-link">
            ⭐ Рейтинги
          </Link>
        </li>
        <li>
          <Link to="/users" className="nav-link">
            <FiUsers /> Пользователи
          </Link>
        </li>
        <li>
          <Link to="/rentals" className="nav-link">
            <FiShoppingCart /> Аренды
          </Link>
        </li>
        <li>
          <Link to="/history" className="nav-link">
            📜 История
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;
