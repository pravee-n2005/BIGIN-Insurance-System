const service = require('./report.service');

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

module.exports = { monthlyReport, insurerReport, leadSourceReport, categoryReport };
