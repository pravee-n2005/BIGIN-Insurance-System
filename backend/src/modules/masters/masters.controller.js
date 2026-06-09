const service = require('./masters.service');

const VALID_LEAD_TYPES         = ['POSP', 'LEAD_EXECUTIVE', 'LEADERSHIP'];
const VALID_INSURER_TYPES      = ['GENERAL', 'HEALTH', 'LIFE'];
const VALID_INSURANCE_CATEGORY = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];

const trimStr = (v) => (typeof v === 'string' ? v.trim() : '');

// Default behavior: only active rows. ?all=true → include inactive.
const wantsAll = (req) => req.query.all === 'true';

// ─── Insurers ─────────────────────────────────────────────────────────────────

const getInsurers = async (req, res, next) => {
  try {
    const { insurerType } = req.query;
    if (insurerType && !VALID_INSURER_TYPES.includes(insurerType))
      return res.status(400).json({ error: `insurerType must be one of: ${VALID_INSURER_TYPES.join(', ')}.` });
    const data = await service.listInsurers({
      activeOnly: !wantsAll(req),
      insurerType,
    });
    res.json({ data });
  } catch (err) { next(err); }
};

const getInsurer = async (req, res, next) => {
  try {
    const insurer = await service.getInsurer(parseInt(req.params.id));
    if (!insurer) return res.status(404).json({ error: 'Insurer not found.' });
    res.json({ insurer });
  } catch (err) { next(err); }
};

const postInsurer = async (req, res, next) => {
  try {
    if (!trimStr(req.body.name))
      return res.status(400).json({ error: 'name is required.' });
    if (req.body.insurerType && !VALID_INSURER_TYPES.includes(req.body.insurerType))
      return res.status(400).json({ error: `insurerType must be one of: ${VALID_INSURER_TYPES.join(', ')}.` });
    if (req.body.gstin && trimStr(req.body.gstin).length > 15)
      return res.status(400).json({ error: 'gstin must be at most 15 characters.' });
    if (req.body.state && trimStr(req.body.state).length > 100)
      return res.status(400).json({ error: 'state must be at most 100 characters.' });

    const insurer = await service.createInsurer(req.body);
    res.status(201).json({ insurer });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Insurer name already exists.' });
    next(err);
  }
};

const putInsurer = async (req, res, next) => {
  try {
    if ('name' in req.body && !trimStr(req.body.name))
      return res.status(400).json({ error: 'name cannot be empty.' });
    if (req.body.insurerType && !VALID_INSURER_TYPES.includes(req.body.insurerType))
      return res.status(400).json({ error: `insurerType must be one of: ${VALID_INSURER_TYPES.join(', ')}.` });
    if (req.body.gstin && trimStr(req.body.gstin).length > 15)
      return res.status(400).json({ error: 'gstin must be at most 15 characters.' });

    const insurer = await service.updateInsurer(parseInt(req.params.id), req.body);
    res.json({ insurer });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Insurer not found.' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Insurer name already exists.' });
    next(err);
  }
};

const activateInsurer = async (req, res, next) => {
  try {
    const insurer = await service.setInsurerActive(parseInt(req.params.id), true);
    res.json({ insurer });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Insurer not found.' });
    next(err);
  }
};

const deactivateInsurer = async (req, res, next) => {
  try {
    const insurer = await service.setInsurerActive(parseInt(req.params.id), false);
    res.json({ insurer });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Insurer not found.' });
    next(err);
  }
};

// ─── Products ─────────────────────────────────────────────────────────────────

const getProducts = async (req, res, next) => {
  try {
    const { insurerId, insuranceCategory } = req.query;
    if (insuranceCategory && !VALID_INSURANCE_CATEGORY.includes(insuranceCategory))
      return res.status(400).json({ error: `insuranceCategory must be one of: ${VALID_INSURANCE_CATEGORY.join(', ')}.` });
    const data = await service.listProducts({
      insurerId: insurerId ? parseInt(insurerId) : undefined,
      activeOnly: !wantsAll(req),
      insuranceCategory,
    });
    res.json({ data });
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await service.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product });
  } catch (err) { next(err); }
};

const postProduct = async (req, res, next) => {
  try {
    const { name, insurerId, insuranceCategory } = req.body;
    if (!trimStr(name))   return res.status(400).json({ error: 'name is required.' });
    if (!insurerId)       return res.status(400).json({ error: 'insurerId is required.' });
    if (insuranceCategory && !VALID_INSURANCE_CATEGORY.includes(insuranceCategory))
      return res.status(400).json({ error: `insuranceCategory must be one of: ${VALID_INSURANCE_CATEGORY.join(', ')}.` });

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
    if ('name' in req.body && !trimStr(req.body.name))
      return res.status(400).json({ error: 'name cannot be empty.' });
    if (req.body.insuranceCategory && !VALID_INSURANCE_CATEGORY.includes(req.body.insuranceCategory))
      return res.status(400).json({ error: `insuranceCategory must be one of: ${VALID_INSURANCE_CATEGORY.join(', ')}.` });
    const product = await service.updateProduct(parseInt(req.params.id), req.body);
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found.' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Product already exists for this insurer.' });
    next(err);
  }
};

const activateProduct = async (req, res, next) => {
  try {
    const product = await service.setProductActive(parseInt(req.params.id), true);
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found.' });
    next(err);
  }
};

const deactivateProduct = async (req, res, next) => {
  try {
    const product = await service.setProductActive(parseInt(req.params.id), false);
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
    if (leadType && !VALID_LEAD_TYPES.includes(leadType))
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    const data = await service.listLeadMembers({ leadType, activeOnly: !wantsAll(req) });
    res.json({ data });
  } catch (err) { next(err); }
};

const getLeadMember = async (req, res, next) => {
  try {
    const leadMember = await service.getLeadMember(parseInt(req.params.id));
    if (!leadMember) return res.status(404).json({ error: 'Lead member not found.' });
    res.json({ leadMember });
  } catch (err) { next(err); }
};

const postLeadMember = async (req, res, next) => {
  try {
    const { name, leadType } = req.body;
    if (!trimStr(name)) return res.status(400).json({ error: 'name is required.' });
    if (!VALID_LEAD_TYPES.includes(leadType))
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    const leadMember = await service.createLeadMember(req.body);
    res.status(201).json({ leadMember });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Lead member name already exists.' });
    next(err);
  }
};

const putLeadMember = async (req, res, next) => {
  try {
    if ('name' in req.body && !trimStr(req.body.name))
      return res.status(400).json({ error: 'name cannot be empty.' });
    if (req.body.leadType && !VALID_LEAD_TYPES.includes(req.body.leadType))
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}.` });
    const leadMember = await service.updateLeadMember(parseInt(req.params.id), req.body);
    res.json({ leadMember });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead member not found.' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Lead member name already exists.' });
    next(err);
  }
};

const activateLeadMember = async (req, res, next) => {
  try {
    const leadMember = await service.setLeadMemberActive(parseInt(req.params.id), true);
    res.json({ leadMember });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead member not found.' });
    next(err);
  }
};

const deactivateLeadMember = async (req, res, next) => {
  try {
    const leadMember = await service.setLeadMemberActive(parseInt(req.params.id), false);
    res.json({ leadMember });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead member not found.' });
    next(err);
  }
};

module.exports = {
  getInsurers, getInsurer, postInsurer, putInsurer, activateInsurer, deactivateInsurer,
  getProducts, getProduct, postProduct, putProduct, activateProduct, deactivateProduct,
  getLeadMembers, getLeadMember, postLeadMember, putLeadMember, activateLeadMember, deactivateLeadMember,
};
