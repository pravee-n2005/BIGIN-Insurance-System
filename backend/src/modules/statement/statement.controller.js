'use strict';

const service = require('./statement.service');
const {
  validateCreate,
  validateUpdate,
  validateAttachPolicies,
  validateUpdateStatementPolicy,
  validateCreditDetails,
} = require('./statement.validation');

const VALID_STATUSES = ['DRAFT', 'FINALIZED', 'INVOICED', 'CANCELLED'];
const MONTH_RE       = /^\d{4}-\d{2}$/;

// ── Helper: forward a thrown {status, message} as the right HTTP response ────
function send(err, res, next) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  next(err);
}

// ── POST /api/statements ────────────────────────────────────────────────────
const createStatement = async (req, res, next) => {
  const errors = validateCreate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const statement = await service.create(req.body, req.user.id);
    res.status(201).json({ statement });
  } catch (e) { send(e, res, next); }
};

// ── GET /api/statements ─────────────────────────────────────────────────────
const listStatements = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { insurerId, status, businessMonth } = req.query;

    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
    if (businessMonth && !MONTH_RE.test(businessMonth))
      return res.status(400).json({ error: 'businessMonth must be in YYYY-MM format.' });

    const result = await service.list({ insurerId, status, businessMonth, page, limit });
    res.json(result);
  } catch (e) { send(e, res, next); }
};

// ── GET /api/statements/available-policies ──────────────────────────────────
const availablePolicies = async (req, res, next) => {
  const { insurerId, businessMonth } = req.query;
  if (!insurerId || isNaN(parseInt(insurerId)))
    return res.status(400).json({ error: 'insurerId query parameter is required.' });
  if (businessMonth && !MONTH_RE.test(businessMonth))
    return res.status(400).json({ error: 'businessMonth must be in YYYY-MM format.' });

  try {
    const policies = await service.availablePolicies({ insurerId, businessMonth });
    res.json({ policies });
  } catch (e) { send(e, res, next); }
};

// ── GET /api/statements/:id ─────────────────────────────────────────────────
const getStatement = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  try {
    const statement = await service.getById(id);
    res.json({ statement });
  } catch (e) { send(e, res, next); }
};

// ── PATCH /api/statements/:id ───────────────────────────────────────────────
const updateStatement = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  const errors = validateUpdate(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const statement = await service.update(id, req.body);
    res.json({ statement });
  } catch (e) { send(e, res, next); }
};

// ── POST /api/statements/:id/policies (bulk attach) ─────────────────────────
const attachPolicies = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  const errors = validateAttachPolicies(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const statement = await service.attachPolicies(id, req.body);
    res.status(201).json({ attached: req.body.policies.length, statement });
  } catch (e) { send(e, res, next); }
};

// ── PUT /api/statements/:id/policies/:spId ──────────────────────────────────
const updateStatementPolicy = async (req, res, next) => {
  const id   = parseInt(req.params.id);
  const spId = parseInt(req.params.spId);
  if (isNaN(id) || isNaN(spId))
    return res.status(400).json({ error: 'Invalid id parameter.' });
  const errors = validateUpdateStatementPolicy(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const statementPolicy = await service.updateStatementPolicy(id, spId, req.body);
    res.json({ statementPolicy });
  } catch (e) { send(e, res, next); }
};

// ── DELETE /api/statements/:id/policies/:spId ───────────────────────────────
const detachPolicy = async (req, res, next) => {
  const id   = parseInt(req.params.id);
  const spId = parseInt(req.params.spId);
  if (isNaN(id) || isNaN(spId))
    return res.status(400).json({ error: 'Invalid id parameter.' });
  try {
    const out = await service.detachPolicy(id, spId);
    res.json(out);
  } catch (e) { send(e, res, next); }
};

// ── POST /api/statements/:id/finalize ───────────────────────────────────────
const finalize = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  try {
    const statement = await service.finalize(id);
    res.json({ statement });
  } catch (e) { send(e, res, next); }
};

// ── POST /api/statements/:id/generate-invoice ───────────────────────────────
const generateInvoice = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  try {
    const { statement, invoice } = await service.generateInvoice(id, req.user.id);
    res.status(201).json({ statement, invoice });
  } catch (e) { send(e, res, next); }
};

// ── PATCH /api/statements/:id/credit-details (Module 4) ─────────────────────
const updateCreditDetails = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  const errors = validateCreditDetails(req.body);
  if (errors.length) return res.status(400).json({ errors });
  try {
    const statement = await service.updateCreditDetails(id, req.body);
    res.json({ statement });
  } catch (e) { send(e, res, next); }
};

// ── PATCH /api/statements/:id/cancel ────────────────────────────────────────
const cancelStatement = async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid statement id.' });
  try {
    const statement = await service.cancel(id);
    res.json({ statement });
  } catch (e) { send(e, res, next); }
};

module.exports = {
  createStatement,
  listStatements,
  availablePolicies,
  getStatement,
  updateStatement,
  attachPolicies,
  updateStatementPolicy,
  detachPolicy,
  finalize,
  generateInvoice,
  cancelStatement,
  updateCreditDetails,
};
