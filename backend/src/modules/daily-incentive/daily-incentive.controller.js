const prisma = require('../../config/prisma');
const service = require('./daily-incentive.service');
const { validateCreate, validateUpdate, validateSettings, validateWeeklyReportQuery } = require('./daily-incentive.validation');

const getSettings = async (req, res, next) => {
  try {
    const settings = await service.getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const errors = validateSettings(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const settings = await service.updateSettings(req.body);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
};

const createEntry = async (req, res, next) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const employee = await prisma.leadMember.findUnique({ where: { id: Number(req.body.employeeId) } });
    if (!employee) return res.status(400).json({ errors: ['employeeId does not match any lead member.'] });

    const entry = await service.create(req.body, req.user.id);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
};

const listEntries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { employeeId, dateFrom, dateTo } = req.query;

    const { entries, total } = await service.list({ employeeId, dateFrom, dateTo, page, limit });

    res.json({
      data: entries,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getEntry = async (req, res, next) => {
  try {
    const entry = await service.getById(parseInt(req.params.id));
    if (!entry) return res.status(404).json({ error: 'Incentive entry not found.' });
    res.json({ entry });
  } catch (err) {
    next(err);
  }
};

const updateEntry = async (req, res, next) => {
  try {
    const errors = validateUpdate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (req.body.employeeId !== undefined) {
      const employee = await prisma.leadMember.findUnique({ where: { id: Number(req.body.employeeId) } });
      if (!employee) return res.status(400).json({ errors: ['employeeId does not match any lead member.'] });
    }

    const entry = await service.update(parseInt(req.params.id), req.body, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Incentive entry not found.' });
    res.json({ entry });
  } catch (err) {
    next(err);
  }
};

const deleteEntry = async (req, res, next) => {
  try {
    const entry = await service.remove(parseInt(req.params.id));
    if (!entry) return res.status(404).json({ error: 'Incentive entry not found.' });
    res.json({ entry });
  } catch (err) {
    next(err);
  }
};

const weeklyReport = async (req, res, next) => {
  try {
    const errors = validateWeeklyReportQuery(req.query);
    if (errors.length) return res.status(400).json({ errors });

    const { weekStart, weekEnd, employeeId } = req.query;
    const data = await service.weeklyReport({ weekStart, weekEnd, employeeId });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings, updateSettings,
  createEntry, listEntries, getEntry, updateEntry, deleteEntry,
  weeklyReport,
};
