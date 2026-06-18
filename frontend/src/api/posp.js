import api from './axios';

// ─── Members ──────────────────────────────────────────────────────────────────
export const fetchPOSPMembers       = (params) => api.get('/posp/members', { params }).then((r) => r.data);
export const fetchAllPOSPMembers    = ()        => api.get('/posp/members/all').then((r) => r.data);
export const fetchPOSPMember        = (id)      => api.get(`/posp/members/${id}`).then((r) => r.data);
export const createPOSPMember       = (data)    => api.post('/posp/members', data).then((r) => r.data);
export const updatePOSPMember       = (id, d)   => api.put(`/posp/members/${id}`, d).then((r) => r.data);
export const deletePOSPMember       = (id)      => api.delete(`/posp/members/${id}`).then((r) => r.data);

// ─── Policy suggestions + search ──────────────────────────────────────────────
export const fetchPOSPSuggestions   = (params)  => api.get('/posp/policies/suggest', { params }).then((r) => r.data);
export const searchPoliciesForPOSP  = (q)       => api.get('/posp/policies/search', { params: { q, limit: 20 } }).then((r) => r.data);

// ─── Incentive entries ────────────────────────────────────────────────────────
export const fetchPOSPEntries       = (params)  => api.get('/posp/entries', { params }).then((r) => r.data);
export const bulkImportPOSPEntries  = (data)    => api.post('/posp/entries/bulk', data).then((r) => r.data);
export const createPOSPEntry        = (data)    => api.post('/posp/entries', data).then((r) => r.data);
export const updatePOSPEntry        = (id, d)   => api.put(`/posp/entries/${id}`, d).then((r) => r.data);
export const deletePOSPEntry        = (id)      => api.delete(`/posp/entries/${id}`).then((r) => r.data);

// ─── Excel import ────────────────────────────────────────────────────────────
export const previewPOSPExcel = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/posp/entries/import-excel/preview', fd).then((r) => r.data);
};

export const importPOSPExcel = (file, pospMemberId, defaultPospShare) => {
  const fd = new FormData();
  fd.append('file', file);
  if (pospMemberId) fd.append('pospMemberId', pospMemberId);
  fd.append('defaultPospShare', defaultPospShare ?? 65);
  return api.post('/posp/entries/import-excel', fd).then((r) => r.data);
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const fetchPOSPReport        = (params)  => api.get('/posp/reports', { params }).then((r) => r.data);
export const downloadPOSPReportXlsx = (params)  =>
  api.get('/posp/reports/export', { params, responseType: 'blob' }).then((r) => r.data);
