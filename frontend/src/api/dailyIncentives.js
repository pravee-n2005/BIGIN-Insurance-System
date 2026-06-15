import api from './axios';

// ─── Settings ────────────────────────────────────────────────────────────────

export const fetchIncentiveSettings = () =>
  api.get('/daily-incentives/settings').then((r) => r.data.settings);

export const updateIncentiveSettings = (payload) =>
  api.put('/daily-incentives/settings', payload).then((r) => r.data.settings);

// ─── Entries ─────────────────────────────────────────────────────────────────

export const fetchDailyIncentives = (params = {}) =>
  api.get('/daily-incentives', { params }).then((r) => r.data);

export const fetchDailyIncentive = (id) =>
  api.get(`/daily-incentives/${id}`).then((r) => r.data.entry);

export const createDailyIncentive = (payload) =>
  api.post('/daily-incentives', payload).then((r) => r.data.entry);

export const updateDailyIncentive = (id, payload) =>
  api.put(`/daily-incentives/${id}`, payload).then((r) => r.data.entry);

export const deleteDailyIncentive = (id) =>
  api.delete(`/daily-incentives/${id}`).then((r) => r.data.entry);

// ─── Weekly Report ──────────────────────────────────────────────────────────

export const fetchWeeklyIncentiveReport = (params = {}) =>
  api.get('/daily-incentives/reports/weekly', { params }).then((r) => r.data.data);
