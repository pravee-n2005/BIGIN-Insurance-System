import api from './axios';

export const fetchInvoiceProfiles = () =>
  api.get('/invoice-profiles').then((r) => r.data.data);

export const fetchInvoiceProfile = (id) =>
  api.get(`/invoice-profiles/${id}`).then((r) => r.data.profile);

export const createInvoiceProfile = (payload) =>
  api.post('/invoice-profiles', payload).then((r) => r.data.profile);

export const updateInvoiceProfile = (id, payload) =>
  api.put(`/invoice-profiles/${id}`, payload).then((r) => r.data.profile);
