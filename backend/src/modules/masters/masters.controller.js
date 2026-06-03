const service = require('./masters.service');

const VALID_LEAD_TYPES = ['POSP', 'LEAD_EXECUTIVE', 'LEADERSHIP'];

const parseBool = (v) => v === 'false' || v === '0' ? false : true;

// ─── Insurers ─────────────────────────────────────────────────────────────────

const getInsurers = async (req, res, next) => {
  try {
    const activeOnly = req.query.all === 'true' ? false : true;
    const data = await service.listInsurers({ activeOnly });
    res.json({ data });
  } catch (err) { next(err); }
};

const postInsurer = async (req, res, next) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: 'name is required.' });
    const insurer = await service.createInsurer(req.body);
    res.status(201).json({ insurer });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Insurer name already exists.' });
    next(err);
  }
};

const putInsurer = async (req, res, next) => {
  try {
    const insurer = await service.updateInsurer(parseInt(req.params.id), req.body);
    res.json({ insurer });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Insurer not found.' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Insurer name already exists.' });
    next(err);
  }
};

// ─── Products ─────────────────────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    const insurerId = req.query.insurerId ? parseInt(req.query.insurerId) : undefined;
    const activeOnly = req.query.all === 'true' ? false : true;
    const data = await service.listProducts({ insurerId, activeOnly });
    res.json({ data });
  } catch (err) { next(err); }
};

const postProduct = async (req, res, next) => {
  try {
    const { name, insurerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
    if (!insurerId)    return res.status(400).json({ error: 'insurerId is required.' });
    const product = await service.createProduct(req.body);
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Product already exists for this insurer.' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid insurerId.' });
    next(err);
  }
};

const putProduct = async (req, res, next) => {
  try {
    const product = await service.updateProduct(parseInt(req.params.id), req.body);
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found.' });
    next(err);
  }
};

// ─── Lead Members ─────────────────────────────────────────────────────────────

const getLeadMembers = async (req, res, next) => {
  try {
    const { leadType } = req.query;
    if (leadType && !VALID_LEAD_TYPES.includes(leadType)) {
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    }
    const activeOnly = req.query.all === 'true' ? false : true;
    const data = await service.listLeadMembers({ leadType, activeOnly });
    res.json({ data });
  } catch (err) { next(err); }
};

const postLeadMember = async (req, res, next) => {
  try {
    const { name, leadType } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
    if (!VALID_LEAD_TYPES.includes(leadType)) {
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    }
    const leadMember = await service.createLeadMember(req.body);
    res.status(201).json({ leadMember });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Lead member name already exists.' });
    next(err);
  }
};

const putLeadMember = async (req, res, next) => {
  try {
    if (req.body.leadType && !VALID_LEAD_TYPES.includes(req.body.leadType)) {
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    }
    const leadMember = await service.updateLeadMember(parseInt(req.params.id), req.body);
    res.json({ leadMember });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead member not found.' });
    next(err);
  }
};

module.exports = {
  getInsurers, postInsurer, putInsurer,
  getProducts, postProduct, putProduct,
  getLeadMembers, postLeadMember, putLeadMember,
};
