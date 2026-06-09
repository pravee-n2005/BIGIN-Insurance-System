import api from './axios';

// ── List + create ───────────────────────────────────────────────────────────
export const fetchStatements = (params = {}) =>
  api.get('/statements', { params }).then((r) => r.data);

export const createStatement = (payload) =>
  api.post('/statements', payload).then((r) => r.data.statement);

// ── Detail + edit ───────────────────────────────────────────────────────────
export const fetchStatement = (id) =>
  api.get(`/statements/${id}`).then((r) => r.data.statement);

export const updateStatement = (id, payload) =>
  api.patch(`/statements/${id}`, payload).then((r) => r.data.statement);

// ── Available policies ──────────────────────────────────────────────────────
export const fetchAvailablePolicies = (insurerId, businessMonth) => {
  const params = { insurerId };
  if (businessMonth) params.businessMonth = businessMonth;
  return api.get('/statements/available-policies', { params }).then((r) => r.data.policies);
};

// ── Attach / edit / detach policies ─────────────────────────────────────────
export const attachPolicies = (id, policies) =>
  api.post(`/statements/${id}/policies`, { policies }).then((r) => r.data);

export const updateStatementPolicy = (id, spId, taxableValue) =>
  api.put(`/statements/${id}/policies/${spId}`, { taxableValue }).then((r) => r.data.statementPolicy);

export const detachPolicy = (id, spId) =>
  api.delete(`/statements/${id}/policies/${spId}`).then((r) => r.data);

// ── Lifecycle ───────────────────────────────────────────────────────────────
export const finalizeStatement = (id) =>
  api.post(`/statements/${id}/finalize`).then((r) => r.data.statement);

export const generateInvoiceFromStatement = (id) =>
  api.post(`/statements/${id}/generate-invoice`).then((r) => r.data);

export const cancelStatement = (id) =>
  api.patch(`/statements/${id}/cancel`).then((r) => r.data.statement);

// ── Module 4 — credit details (INVOICED only) ─────────────────────────────────
export const updateCreditDetails = (id, payload) =>
  api.patch(`/statements/${id}/credit-details`, payload).then((r) => r.data.statement);
