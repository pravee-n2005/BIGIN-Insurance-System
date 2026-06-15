const service = require('./policy.service');
const { validateCreate, validateUpdate } = require('./policy.validation');

const createPolicy = async (req, res, next) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const policy = await service.create(req.body, req.user.id);
    res.status(201).json({ policy });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Policy number already exists.' });
    next(err);
  }
};

const listPolicies = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const { month, insurerName, leadSource, insuranceCategory, status, invoiceStatus } = req.query;

    const { policies, total } = await service.list({
      page, limit, month, insurerName, leadSource, insuranceCategory, status, invoiceStatus,
    });

    res.json({
      data: policies,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getPolicy = async (req, res, next) => {
  try {
    const policy = await service.getById(parseInt(req.params.id));
    if (!policy) return res.status(404).json({ error: 'Policy not found.' });
    res.json({ policy });
  } catch (err) {
    next(err);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const errors = validateUpdate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const policy = await service.update(parseInt(req.params.id), req.body, req.user.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found.' });
    res.json({ policy });
  } catch (err) {
    if (err.validationErrors) return res.status(400).json({ errors: err.validationErrors });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Policy number already exists.' });
    next(err);
  }
};

module.exports = { createPolicy, listPolicies, getPolicy, updatePolicy };
