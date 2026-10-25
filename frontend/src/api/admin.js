import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthStorageKeys } from '../context/authStorage';

const adminAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});
adminAxios.interceptors.request.use((config) => {
  const { token } = getAuthStorageKeys('admin');
  config.headers.Authorization = `Bearer ${localStorage.getItem(token) || ''}`;
  return config;
});

export const getAdminPortfolio = () => adminAxios.get('/portfolio');
export const getAdminItems = () => adminAxios.get('/items');
export const getAdminOrders = () => adminAxios.get('/orders');
export const updateOrderStatus = (id, data) => adminAxios.patch(`/orders/${id}/status`, data);
export const updateOrderPayment = (id, data) => adminAxios.patch(`/orders/${id}/payment`, data);
export const deleteAdminOrder = (id) => adminAxios.delete(`/orders/${id}`);
export const clearAdminClientData = (email) =>
  adminAxios.delete(`/clients/${encodeURIComponent(email)}/data`);
export const getAdminPayments = () => adminAxios.get('/payments');
export const updatePaymentStatus = (id, status) =>
  adminAxios.patch(`/payments/${id}/status`, { status });
export const updateConsultationFinancials = (id, data) =>
  adminAxios.put(`/consultations/${id}/financials`, data);

export const getAdminStats = () => {
  return adminAxios.get('/auth/admin-stats');
};

export const getAllUsers = () => {
  return adminAxios.get('/auth/users');
};

export const updateConsultationStatus = (id, data) => {
  return adminAxios.patch(`/consultations/${id}/status`, data);
};

export const deleteConsultation = (id) => {
  return adminAxios.delete(`/consultations/${id}`);
};

export const createPortfolioItem = (data) => {
  return adminAxios.post('/portfolio', data);
};

export const updatePortfolioItem = (id, data) => {
  return adminAxios.put(`/portfolio/${id}`, data);
};

export const deletePortfolioItem = (id) => {
  return adminAxios.delete(`/portfolio/${id}`);
};

export const getAllPaymentsAdmin = () => {
  return adminAxios.get('/payments');
};

export const createStoreItem = (data) => {
  return adminAxios.post('/items', data);
};

export const updateStoreItem = (id, data) => {
  return adminAxios.put(`/items/${id}`, data);
};

export const deleteStoreItem = (id) => {
  return adminAxios.delete(`/items/${id}`);
};
