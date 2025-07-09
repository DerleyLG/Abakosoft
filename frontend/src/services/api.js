import axios from 'axios';

const API_BASE_URL = 'http://localhost:3300/api'; // ajusta el puerto si es otro

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;