import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAuthRole, getAuthStorageKeys } from '../context/authStorage';

const API_URL = `${API_BASE_URL}/consultations`;

const authConfig = () => {
  const { token } = getAuthStorageKeys(getAuthRole());
  return {
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${localStorage.getItem(token) || ''}`
    }
  };
};

export const createConsultation = (consultationData) => {
  return axios.post(API_URL, consultationData, authConfig());
};

export const getConsultations = (filters = {}) => {
  return axios.get(API_URL, { ...authConfig(), params: filters });
};

export const getConsultationById = (id) => {
  return axios.get(`${API_URL}/${id}`, authConfig());
};

export const updateConsultationStatus = (id, statusData) => {
  return axios.patch(`${API_URL}/${id}/status`, statusData, authConfig());
};

export const updateConsultationFinancials = (id, data) => {
  return axios.put(`${API_URL}/${id}/financials`, data, authConfig());
};

export const deleteConsultation = (id) => {
  return axios.delete(`${API_URL}/${id}`, authConfig());
};
