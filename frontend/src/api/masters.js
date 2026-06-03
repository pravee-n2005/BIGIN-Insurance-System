import api from './axios';

export const fetchInsurers = () =>
  api.get('/masters/insurers').then((r) => r.data.data);

export const fetchProductsByInsurer = (insurerId) =>
  api.get('/masters/products', { params: { insurerId } }).then((r) => r.data.data);

export const fetchLeadMembers = (leadType) =>
  api.get('/masters/lead-members', { params: { leadType } }).then((r) => r.data.data);
