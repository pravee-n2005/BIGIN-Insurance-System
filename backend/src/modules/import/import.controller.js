const { bulkImport } = require('./import.service');

const importPolicies = async (req, res, next) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Request body must be a non-empty JSON array.' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 records per import batch.' });
    }

    const results = await bulkImport(rows, req.user.id);

    const statusCode = results.imported === 0 && results.failed > 0 ? 422 : 200;
    res.status(statusCode).json({
      message: `Import complete. ${results.imported} imported, ${results.skipped} skipped (duplicates), ${results.failed} failed.`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { importPolicies };
