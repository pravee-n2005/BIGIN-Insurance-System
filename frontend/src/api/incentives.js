import api from './axios';

export const fetchIncentives = (params = {}) =>
  api.get('/incentives', { params }).then((r) => r.data);

export const fetchIncentive = (id) =>
  api.get(`/incentives/${id}`).then((r) => r.data.incentive);

export const createIncentive = (payload) =>
  api.post('/incentives', payload).then((r) => r.data.incentive);

export const updateIncentive = (id, payload) =>
  api.put(`/incentives/${id}`, payload).then((r) => r.data.incentive);

export const deleteIncentive = (id) =>
  api.delete(`/incentives/${id}`).then((r) => r.data.incentive);

export const fetchExecutiveWiseReport = (params = {}) =>
  api.get('/incentives/reports/executive-wise', { params }).then((r) => r.data.data);

export const fetchMonthWiseReport = (params = {}) =>
  api.get('/incentives/reports/month-wise', { params }).then((r) => r.data.data);
