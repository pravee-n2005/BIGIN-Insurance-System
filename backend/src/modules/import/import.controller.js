const { bulkImport, previewImport, commitImport } = require('./import.service');
const { generateImportTemplateXlsx } = require('./import.template.xlsx');
const { listInsurers, listLeadMembers } = require('../masters/masters.service');

const downloadTemplate = async (req, res, next) => {
  try {
    const [insurers, leadMembers] = await Promise.all([
      listInsurers({ activeOnly: true }),
      listLeadMembers({ activeOnly: true }),
    ]);
    const buf = await generateImportTemplateXlsx({
      insurerNames: insurers.map((i) => i.name),
      leadSourceNames: leadMembers.map((l) => l.name),
    });
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Policy_Import_Template.xlsx"',
      'Content-Length':      buf.length,
      'Cache-Control':       'no-store',
    });
    res.send(Buffer.from(buf));
  } catch (err) {
    next(err);
  }
};

const previewImportPolicies = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Field name must be "file".' });
    const result = await previewImport(req.file.buffer);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const commitImportPolicies = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Field name must be "file".' });
    const result = await commitImport(req.file.buffer, req.user.id);
    const statusCode = result.imported === 0 && (result.failed > 0 || result.totalRows === 0) ? 422 : 200;
    res.status(statusCode).json({
      message: `Import complete. ${result.imported} imported, ${result.skipped} skipped (duplicates), ${result.failed} failed.`,
      ...result,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

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

module.exports = { importPolicies, downloadTemplate, previewImportPolicies, commitImportPolicies };
