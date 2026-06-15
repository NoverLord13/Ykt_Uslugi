import axios from 'axios';
import { getToken } from './auth';

const API_URL = 'http://localhost:8000';

export interface AdBlock{
  id: number
  title: string
  description: string
  price: number
  image_url: string
  is_active: boolean
  owner:{
    id: number
    username: string
  }
}

export const api = {


  getAdBlock: async (skip: number = 0, limit: number = 12): Promise<AdBlock[]> => {
    const response = await axios.get(`${API_URL}/services`, {
      params: { skip, limit }
    });
    return response.data.data;
  },

  getAdBlockById: async (id: number): Promise<AdBlock> => {
    const response = await axios.get(`${API_URL}/services/${id}`);
    return response.data;
  },

  addAdBlock: async (formData: FormData) => {
    const token = getToken();
    const response = await axios.post(`${API_URL}/services`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}` 
      }
    });
    return response.data;
  },

  deleteAdBlock: async (id: number) => {
    const token = getToken();
    const response = await axios.delete(`${API_URL}/services/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
};


