const service = require('./incentive.service');
const { validateCreate, validateUpdate } = require('./incentive.validation');

const createIncentive = async (req, res, next) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const incentive = await service.create(req.body, req.user.id);
    res.status(201).json({ incentive });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'An incentive entry already exists for this Lead Executive and month.' });
    if (err.validationErrors) return res.status(err.status || 400).json({ errors: err.validationErrors });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const listIncentives = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { leadMemberId, month, year } = req.query;

    const { incentives, total } = await service.list({ leadMemberId, month, year, page, limit });

    res.json({
      data: incentives,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getIncentive = async (req, res, next) => {
  try {
    const incentive = await service.getById(parseInt(req.params.id));
    if (!incentive) return res.status(404).json({ error: 'Incentive not found.' });
    res.json({ incentive });
  } catch (err) {
    next(err);
  }
};

const updateIncentive = async (req, res, next) => {
  try {
    const errors = validateUpdate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const incentive = await service.update(parseInt(req.params.id), req.body, req.user.id);
    if (!incentive) return res.status(404).json({ error: 'Incentive not found.' });
    res.json({ incentive });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'An incentive entry already exists for this Lead Executive and month.' });
    if (err.validationErrors) return res.status(err.status || 400).json({ errors: err.validationErrors });
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

const deleteIncentive = async (req, res, next) => {
  try {
    const incentive = await service.remove(parseInt(req.params.id));
    if (!incentive) return res.status(404).json({ error: 'Incentive not found.' });
    res.json({ incentive });
  } catch (err) {
    next(err);
  }
};

const executiveWiseReport = async (req, res, next) => {
  try {
    const { year, leadMemberId } = req.query;
    const data = await service.executiveWiseReport({ year, leadMemberId });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

const monthWiseReport = async (req, res, next) => {
  try {
    const { year, leadMemberId } = req.query;
    const data = await service.monthWiseReport({ year, leadMemberId });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createIncentive, listIncentives, getIncentive, updateIncentive, deleteIncentive,
  executiveWiseReport, monthWiseReport,
};
