import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import './ReservationCalendar.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ReservationCalendar() {
  const [selectedConsole, setSelectedConsole] = useState(null);
  const [consoles, setConsoles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState([new Date(), new Date()]);
  const [bookedDates, setBookedDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConsoles();
  }, []);

  useEffect(() => {
    if (selectedConsole) {
      fetchReservations(selectedConsole);
    }
  }, [selectedConsole]);

  const fetchConsoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/consoles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsoles(response.data);
    } catch (error) {
      console.error('Ошибка загрузки консолей:', error);
    }
  };

  const fetchReservations = async (consoleId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/reservations/console/${consoleId}/availability`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const dates = [];
      if (response.data.unavailableDates) {
        response.data.unavailableDates.forEach((date) => {
          dates.push(new Date(date));
        });
      }

      setBookedDates(dates);
      setReservations(response.data.reservations || []);
    } catch (error) {
      console.error('Ошибка загрузки резервирований:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE}/reservations`,
        {
          consoleId: selectedConsole,
          userId: formData.userId,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage('✅ Резервирование создано успешно!');
      setTimeout(() => setMessage(''), 3000);

      setFormData({
        userId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });

      setShowReservationForm(false);
      fetchReservations(selectedConsole);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Ошибка при создании резервирования';
      setMessage(`❌ ${errorMsg}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const isDateBooked = (date) => {
    return bookedDates.some(
      (bookedDate) =>
        bookedDate.toDateString() === date.toDateString()
    );
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      if (isDateBooked(date)) {
        return 'booked-date';
      }
    }
    return null;
  };

  const selectedConsoleName = consoles.find(c => c._id === selectedConsole)?.name;

  return (
    <div className="reservation-calendar">
      <h1>📅 Календарь резервирований</h1>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="calendar-layout">
        {/* Левая часть - выбор консоли */}
        <div className="console-selector">
          <h3>Выберите консоль</h3>
          <div className="console-list">
            {consoles.map((console) => (
              <div
                key={console._id}
                className={`console-item ${selectedConsole === console._id ? 'active' : ''}`}
                onClick={() => setSelectedConsole(console._id)}
              >
                <div className="console-name">{console.name}</div>
                <div className="console-price">{console.pricePerDay}₽/день</div>
                <div className={`console-status ${console.status}`}>
                  {console.status === 'available' && '✅ Доступна'}
                  {console.status === 'rented' && '🔴 Арендована'}
                  {console.status === 'maintenance' && '🔧 На ремонте'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Средняя часть - календарь */}
        <div className="calendar-container">
          {selectedConsole ? (
            <>
              <h3>Календарь для {selectedConsoleName}</h3>
              {loading ? (
                <div className="loading">Загрузка...</div>
              ) : (
                <>
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    selectRange={true}
                    tileClassName={tileClassName}
                    minDate={new Date()}
                  />
                  <div className="legend">
                    <div className="legend-item">
                      <div className="legend-color available"></div>
                      <span>Доступна</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color booked"></div>
                      <span>Забронирована</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="no-console">Выберите консоль для просмотра календаря</div>
          )}
        </div>

        {/* Правая часть - резервирования */}
        <div className="reservations-panel">
          <h3>Резервирования</h3>
          {selectedConsole ? (
            <>
              <button
                className="create-btn"
                onClick={() => setShowReservationForm(!showReservationForm)}
              >
                {showReservationForm ? '✖ Отмена' : '➕ Новое резервирование'}
              </button>

              {showReservationForm && (
                <form onSubmit={handleCreateReservation} className="reservation-form">
                  <div className="form-group">
                    <label>ID пользователя</label>
                    <input
                      type="text"
                      value={formData.userId}
                      onChange={(e) =>
                        setFormData({ ...formData, userId: e.target.value })
                      }
                      placeholder="Введите ID пользователя"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Начало аренды</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Конец аренды</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <button type="submit" className="submit-btn">
                    💾 Создать резервирование
                  </button>
                </form>
              )}

              <div className="reservations-list">
                {reservations.length > 0 ? (
                  reservations.map((reservation) => (
                    <div key={reservation._id} className="reservation-item">
                      <div className="reservation-user">
                        {reservation.userId?.firstName} {reservation.userId?.lastName}
                      </div>
                      <div className="reservation-dates">
                        {new Date(reservation.startDate).toLocaleDateString('ru-RU')} —{' '}
                        {new Date(reservation.endDate).toLocaleDateString('ru-RU')}
                      </div>
                      <div className={`reservation-status ${reservation.status}`}>
                        {reservation.status === 'pending' && '⏳ На подтверждение'}
                        {reservation.status === 'confirmed' && '✅ Подтверждено'}
                        {reservation.status === 'cancelled' && '❌ Отменено'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-reservations">Нет резервирований</div>
                )}
              </div>
            </>
          ) : (
            <div className="no-console">Выберите консоль</div>
          )}
        </div>
      </div>
    </div>
  );
}
