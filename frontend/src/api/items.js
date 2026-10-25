import axios from 'axios';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/items`;

// Verified fallback images for broken catalog entries
const IMAGE_OVERRIDES = {
  'Milano 3-Door Sliding Tinted Mirror Wardrobe': {
    images: [
      'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
      'https://images.pexels.com/photos/14613158/pexels-photo-14613158.jpeg?auto=compress&cs=tinysrgb&w=1000'
    ],
    imageAttribution: {
      title: 'Reflection of Beds on Mirrors',
      creator: 'Hiba Q. Omar',
      sourceUrl: 'https://www.pexels.com/photo/reflection-of-beds-on-mirrors-14613158/',
      licenseUrl: 'https://www.pexels.com/license/',
      licenseName: 'Pexels License'
    }
  },
  'Scandi Bouclé Ergonomic Accent Lounge Chair': {
    images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80']
  }
};

const sanitizeItem = (item) => {
  if (!item) return item;
  const copy = { ...item };
  const name = copy.name || copy.title || '';

  for (const [key, replacement] of Object.entries(IMAGE_OVERRIDES)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      copy.image = replacement.images[0];
      copy.images = replacement.images;
      if (replacement.imageAttribution) {
        copy.imageAttribution = replacement.imageAttribution;
      }
      return copy;
    }
  }

  // Ensure image array exists and is valid
  if (!copy.image && Array.isArray(copy.images) && copy.images.length > 0) {
    copy.image = copy.images[0];
  } else if (!copy.image) {
    copy.image = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';
    copy.images = [copy.image];
  }

  return copy;
};

export const getItems = async (params = {}) => {
  const res = await axios.get(API_URL, { params });
  if (Array.isArray(res.data)) {
    res.data = res.data.map(sanitizeItem);
  } else if (res.data && Array.isArray(res.data.items)) {
    res.data.items = res.data.items.map(sanitizeItem);
  }
  return res;
};

export const getItemById = async (id) => {
  const res = await axios.get(`${API_URL}/${id}`);
  if (res.data) {
    res.data = sanitizeItem(res.data);
  }
  return res;
};

export const createItem = (itemData) => {
  return axios.post(API_URL, itemData, { withCredentials: true });
};

export const updateItem = (id, itemData) => {
  return axios.put(`${API_URL}/${id}`, itemData, { withCredentials: true });
};

export const deleteItem = (id) => {
  return axios.delete(`${API_URL}/${id}`, { withCredentials: true });
};