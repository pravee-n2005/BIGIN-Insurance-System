import api from './axios';

export const generateDraft = (insurerId, billingMonth) =>
  api.post('/invoices/draft', { insurerId, billingMonth }).then((r) => r.data.draft);

export const saveInvoice = (insurerId, billingMonth) =>
  api.post('/invoices', { insurerId, billingMonth }).then((r) => r.data.invoice);

export const fetchInvoices = (params = {}) =>
  api.get('/invoices', { params }).then((r) => r.data);

export const fetchInvoice = (id) =>
  api.get(`/invoices/${id}`).then((r) => r.data.invoice);

export const cancelInvoice = (id, payload) =>
  api.patch(`/invoices/${id}/cancel`, payload).then((r) => r.data.invoice);

export const downloadInvoicePdf = (id) =>
  api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data);

export const setGstExempt = (id, isGstExempt) =>
  api.patch(`/invoices/${id}/gst-exempt`, { isGstExempt }).then((r) => r.data.invoice);
