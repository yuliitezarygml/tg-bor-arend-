import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ConsolesPage from './pages/ConsolesPage';
import UsersPage from './pages/UsersPage';
import RentalsPage from './pages/RentalsPage';
import HistoryPage from './pages/HistoryPage';
import GamesPage from './pages/GamesPage';
import DiscountsPage from './pages/DiscountsPage';
import RatingsPage from './pages/RatingsPage';
import Dashboard from './pages/Dashboard';
import { ToastContainer, useToast } from './components/Toast';

function App() {
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    // Проверяем, доступен ли API
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">⏳ Загрузка...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navigation />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consoles" element={<ConsolesPage addToast={addToast} />} />
            <Route path="/games" element={<GamesPage addToast={addToast} />} />
            <Route path="/discounts" element={<DiscountsPage addToast={addToast} />} />
            <Route path="/ratings" element={<RatingsPage addToast={addToast} />} />
            <Route path="/users" element={<UsersPage addToast={addToast} />} />
            <Route path="/rentals" element={<RentalsPage addToast={addToast} />} />
            <Route path="/history" element={<HistoryPage addToast={addToast} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
