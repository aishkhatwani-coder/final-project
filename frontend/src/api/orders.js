import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthRole, getAuthStorageKeys } from '../context/authStorage';

const API_URL = `${API_BASE_URL}/orders`;

const authConfig = () => {
  const { token } = getAuthStorageKeys(getAuthRole());
  return {
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${localStorage.getItem(token) || ''}`
    }
  };
};

export const createOrder = (orderData) => {
  return axios.post(API_URL, orderData, authConfig());
};

export const getOrders = (params = {}) => {
  return axios.get(API_URL, { ...authConfig(), params });
};

export const getOrderById = (id) => {
  return axios.get(`${API_URL}/${id}`, authConfig());
};

export const updateOrderStatus = (id, data) => {
  return axios.patch(`${API_URL}/${id}/status`, data, authConfig());
};

export const updateOrderPayment = (id, data) => {
  return axios.patch(`${API_URL}/${id}/payment`, data, authConfig());
};

export const deleteOrder = (id) => {
  return axios.delete(`${API_URL}/${id}`, authConfig());
};
