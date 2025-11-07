import axios from 'axios';

const API_URL = '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Консоли
export const consoleAPI = {
  getAll: () => api.get('/consoles'),
  getById: (id) => api.get(`/consoles/${id}`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });
    return api.post('/consoles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });
    return api.put(`/consoles/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/consoles/${id}`),
};

// Пользователи
export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
};

// Аренды
export const rentalAPI = {
  getAll: () => api.get('/rentals'),
  getUserRentals: (userId) => api.get(`/rentals/user/${userId}`),
  getStats: () => api.get('/rentals/stats/overview'),
  approve: (id) => api.put(`/rentals/${id}/approve`),
  reject: (id, reason) => api.put(`/rentals/${id}/reject`, { reason }),
};
