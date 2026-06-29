import api from './axios';

// ─── Insurers ────────────────────────────────────────────────────────────────

export const fetchInsurers = (params = {}) =>
  api.get('/masters/insurers', { params }).then((r) => r.data.data);

export const fetchAllInsurers = () =>
  api.get('/masters/insurers', { params: { all: 'true' } }).then((r) => r.data.data);

export const createInsurer = (payload) =>
  api.post('/masters/insurers', payload).then((r) => r.data.insurer);

export const updateInsurer = (id, payload) =>
  api.put(`/masters/insurers/${id}`, payload).then((r) => r.data.insurer);

export const activateInsurer = (id) =>
  api.patch(`/masters/insurers/${id}/activate`).then((r) => r.data.insurer);

export const deactivateInsurer = (id) =>
  api.patch(`/masters/insurers/${id}/deactivate`).then((r) => r.data.insurer);

// ─── Products ────────────────────────────────────────────────────────────────

export const fetchProductsByInsurer = (insurerId) =>
  api.get('/masters/products', { params: { insurerId } }).then((r) => r.data.data);

export const fetchAllProductsByInsurer = (insurerId) =>
  api.get('/masters/products', { params: { insurerId, all: 'true' } }).then((r) => r.data.data);

export const fetchAllProducts = () =>
  api.get('/masters/products', { params: { all: 'true' } }).then((r) => r.data.data);

export const createProduct = (payload) =>
  api.post('/masters/products', payload).then((r) => r.data.product);

export const updateProduct = (id, payload) =>
  api.put(`/masters/products/${id}`, payload).then((r) => r.data.product);

export const activateProduct = (id) =>
  api.patch(`/masters/products/${id}/activate`).then((r) => r.data.product);

export const deactivateProduct = (id) =>
  api.patch(`/masters/products/${id}/deactivate`).then((r) => r.data.product);

// ─── Lead Members ─────────────────────────────────────────────────────────────

export const fetchLeadMembers = (leadType) =>
  api.get('/masters/lead-members', { params: { leadType } }).then((r) => r.data.data);

export const fetchAllLeadMembers = () =>
  api.get('/masters/lead-members', { params: { all: 'true' } }).then((r) => r.data.data);

export const createLeadMember = (payload) =>
  api.post('/masters/lead-members', payload).then((r) => r.data.leadMember);

export const updateLeadMember = (id, payload) =>
  api.put(`/masters/lead-members/${id}`, payload).then((r) => r.data.leadMember);

export const activateLeadMember = (id) =>
  api.patch(`/masters/lead-members/${id}/activate`).then((r) => r.data.leadMember);

export const deactivateLeadMember = (id) =>
  api.patch(`/masters/lead-members/${id}/deactivate`).then((r) => r.data.leadMember);
