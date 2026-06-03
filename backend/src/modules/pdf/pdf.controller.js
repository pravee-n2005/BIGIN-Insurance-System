const { generateMonthlyPDF } = require('./pdf.service');

const exportMonthly = async (req, res, next) => {
  try {
    const { month, from, to } = req.query;

    if (!month && !from && !to) {
      return res.status(400).json({ error: 'Provide month (YYYY-MM) or from/to date filters.' });
    }

    await generateMonthlyPDF(res, { month, from, to });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

module.exports = { exportMonthly };
