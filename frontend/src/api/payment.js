import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthRole, getAuthStorageKeys } from '../context/authStorage';

const API_URL = `${API_BASE_URL}/payments`;

const authConfig = (token) => {
  const keys = getAuthStorageKeys(getAuthRole());
  return {
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem(keys.token) || ''}`
    }
  };
};

export const createPayment = (paymentData, token) => {
  return axios.post(API_URL, paymentData, {
    ...authConfig(token),
    timeout: 30000
  });
};

export const getPayments = (filters = {}, token) => {
  return axios.get(API_URL, { ...authConfig(token), params: filters });
};

export const getPaymentById = (id, token) => {
  return axios.get(`${API_URL}/${id}`, authConfig(token));
};
