import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  // Do NOT set Content-Type here — axios sets it automatically:
  //   application/json  for plain objects
  //   multipart/form-data (with boundary) for FormData
  // A hardcoded default breaks file uploads because it overrides the boundary header.
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bigin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear storage and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bigin_token');
      localStorage.removeItem('bigin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
