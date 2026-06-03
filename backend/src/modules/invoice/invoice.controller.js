const service = require('./invoice.service');

const VALID_STATUSES = ['DRAFT', 'ISSUED', 'CANCELLED'];

const generateDraft = async (req, res, next) => {
  try {
    const { insurerId, billingMonth } = req.body;

    if (!insurerId || isNaN(parseInt(insurerId))) {
      return res.status(400).json({ error: 'insurerId is required.' });
    }
    if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
      return res.status(400).json({ error: 'billingMonth is required in YYYY-MM format.' });
    }

    const draft = await service.generateDraft({
      insurerId:    parseInt(insurerId),
      billingMonth,
    });

    res.json({ draft });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const listInvoices = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { insurerId, status, billingMonth } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    const result = await service.list({ insurerId, status, billingMonth, page, limit });
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { generateDraft, listInvoices };
