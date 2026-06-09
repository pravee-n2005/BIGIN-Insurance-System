const service = require('./invoice.service');
const { generateInvoicePdf } = require('./invoice.pdf');

const VALID_STATUSES = ['DRAFT', 'ISSUED', 'FINALIZED', 'CANCELLED'];

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

const saveInvoice = async (req, res, next) => {
  try {
    const { insurerId, billingMonth } = req.body;

    if (!insurerId || isNaN(parseInt(insurerId))) {
      return res.status(400).json({ error: 'insurerId is required.' });
    }
    if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
      return res.status(400).json({ error: 'billingMonth is required in YYYY-MM format.' });
    }

    const invoice = await service.saveInvoice({
      insurerId:    parseInt(insurerId),
      billingMonth,
      createdById:  req.user.id,
    });

    res.status(201).json({ invoice });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const getInvoice = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice id.' });
    const invoice = await service.getInvoice(id);
    res.json({ invoice });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const cancelInvoice = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice id.' });
    const invoice = await service.cancelInvoice(id);
    res.json({ invoice });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ── Module 4 — toggle GST-exempt flag ───────────────────────────────────────
const setGstExempt = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice id.' });
    if (typeof req.body.isGstExempt !== 'boolean')
      return res.status(400).json({ error: 'isGstExempt must be true or false.' });
    const invoice = await service.setGstExempt(id, req.body.isGstExempt);
    res.json({ invoice });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const downloadPdf = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid invoice id.' });

    // Fetch the saved invoice (reads snapshot fields — no recalculation)
    const invoice = await service.getInvoice(id);

    // Only finalized / legacy-issued invoices may be downloaded
    if (invoice.status !== 'FINALIZED' && invoice.status !== 'ISSUED') {
      return res.status(400).json({
        error: `PDF is only available for finalized invoices. Current status: ${invoice.status}.`,
      });
    }

    const pdfBuffer = await generateInvoicePdf(invoice);
    const filename  = `${invoice.invoiceNumber}.pdf`;

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length,
      'Cache-Control':       'no-store',
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { generateDraft, saveInvoice, cancelInvoice, getInvoice, listInvoices, downloadPdf, setGstExempt };
