import axios from 'axios';

const API_URL = 'http://localhost:8000';


export const api = {

  register: async (phone: string, password: string, code: string) => {
    const response = await axios.post(`${API_URL}/auth/register/complete`, {
      phone,
      password,
      code
    });
    return response.data;
  },
  
  login: async (phone: string, password: string) => {
    const params = new URLSearchParams();
    params.append('phone', phone);
    params.append('password', password);

    const response = await axios.post(`${API_URL}/auth/login`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data; 
  },
};


