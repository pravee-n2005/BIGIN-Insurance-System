import api from './axios';

export const fetchDataHealthOverview = () =>
  api.get('/data-health/overview').then((r) => r.data);
