const service = require('./report.service');
const { generateGstSalesXlsx } = require('./gst.report.xlsx');
const { generateCreditsXlsx }  = require('./credits.report.xlsx');

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

const availableMonthsReport = async (req, res, next) => {
  try {
    const months = await service.availableMonths();
    res.json({ months });
  } catch (err) { next(err); }
};

const monthlyReport = async (req, res, next) => {
  try {
    const { month, from, to } = req.query;
    if (!month && !from && !to) {
      return res.status(400).json({ error: 'Provide month (YYYY-MM) or from/to date filters.' });
    }
    const data = await service.monthly({ month, from, to });
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const insurerReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await service.byInsurer({ from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

const leadSourceReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await service.byLeadSource({ from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

const categoryReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await service.byCategory({ from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ─── Module 4 — GST Sales Report ──────────────────────────────────────────────

const gstSalesReport = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !MONTH_RE.test(month))
      return res.status(400).json({ error: 'month query parameter (YYYY-MM) is required.' });
    const data = await service.gstSales({ month });
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const gstSalesExport = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !MONTH_RE.test(month))
      return res.status(400).json({ error: 'month query parameter (YYYY-MM) is required.' });
    const data = await service.gstSales({ month });
    const buf  = await generateGstSalesXlsx({ month, rows: data.rows });
    const filename = `GST_Sales_${month}.xlsx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.length,
      'Cache-Control':       'no-store',
    });
    res.send(Buffer.from(buf));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

// ─── Module 4 — Credits Report ────────────────────────────────────────────────

const creditsReport = async (req, res, next) => {
  try {
    const { from, to, bankAccount } = req.query;
    if (!from || !DATE_RE.test(from) || !to || !DATE_RE.test(to))
      return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD).' });
    const data = await service.credits({ from, to, bankAccount });
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const creditsExport = async (req, res, next) => {
  try {
    const { from, to, bankAccount } = req.query;
    if (!from || !DATE_RE.test(from) || !to || !DATE_RE.test(to))
      return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD).' });
    const data = await service.credits({ from, to, bankAccount });
    const buf  = await generateCreditsXlsx({ from, to, rows: data.rows });
    const filename = `Credits_${from}_to_${to}.xlsx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buf.length,
      'Cache-Control':       'no-store',
    });
    res.send(Buffer.from(buf));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = {
  availableMonthsReport, monthlyReport, insurerReport, leadSourceReport, categoryReport,
  gstSalesReport, gstSalesExport, creditsReport, creditsExport,
};
