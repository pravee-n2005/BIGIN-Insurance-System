import api from './axios';

export const fetchDashboardStats = (fy) =>
  api.get('/dashboard/stats', { params: fy ? { fy } : {} }).then((r) => r.data);
