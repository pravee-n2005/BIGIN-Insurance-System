import api from './axios';

// ── JSON previews ────────────────────────────────────────────────────────────
export const fetchGstSalesReport = (month) =>
  api.get('/reports/gst-sales', { params: { month } }).then((r) => r.data);

export const fetchCreditsReport = (params) =>
  api.get('/reports/credits', { params }).then((r) => r.data);

// ── Excel downloads ──────────────────────────────────────────────────────────
export const downloadGstSalesXlsx = (month) =>
  api.get('/reports/gst-sales/export', { params: { month }, responseType: 'blob' })
     .then((r) => r.data);

export const downloadCreditsXlsx = (params) =>
  api.get('/reports/credits/export', { params, responseType: 'blob' })
     .then((r) => r.data);
