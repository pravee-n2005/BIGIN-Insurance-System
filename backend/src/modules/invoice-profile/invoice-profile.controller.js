const service = require('./invoice-profile.service');

// GSTIN validation: 15 chars, format e.g. 33AABCL5045N1ZF
// 2 digits state code + 10 chars PAN + 1 entity + 1 'Z' + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/;

function validate(body, partial = false) {
  const errors = [];
  const need = (k, label) => {
    if (!body[k] || !String(body[k]).trim()) errors.push(`${label} is required.`);
  };

  if (!partial || 'insurerId' in body) {
    if (!body.insurerId || isNaN(parseInt(body.insurerId))) errors.push('insurerId is required.');
  }
  if (!partial || 'recipientHeader' in body) need('recipientHeader', 'recipientHeader');
  if (!partial || 'legalName'       in body) need('legalName',       'legalName');
  if (!partial || 'billingAddress'  in body) need('billingAddress',  'billingAddress');
  if (!partial || 'state'           in body) need('state',           'state');
  if (!partial || 'stateCode'       in body) need('stateCode',       'stateCode');
  if (!partial || 'gstin'           in body) {
    need('gstin', 'gstin');
    if (body.gstin && !GSTIN_REGEX.test(body.gstin.trim().toUpperCase())) {
      errors.push('gstin format invalid (expected 15 chars, e.g. 33AABCL5045N1ZF).');
    }
  }
  return errors;
}

const listProfiles = async (req, res, next) => {
  try {
    const activeOnly = req.query.all === 'true' ? false : true;
    const data = await service.list({ activeOnly });
    res.json({ data });
  } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await service.getById(parseInt(req.params.id));
    if (!profile) return res.status(404).json({ error: 'Invoice profile not found.' });
    res.json({ profile });
  } catch (err) { next(err); }
};

const getProfileByInsurer = async (req, res, next) => {
  try {
    const profile = await service.getByInsurerId(parseInt(req.params.insurerId));
    if (!profile) return res.status(404).json({ error: 'Invoice profile not found for this insurer.' });
    res.json({ profile });
  } catch (err) { next(err); }
};

const createProfile = async (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const profile = await service.create({ ...req.body, insurerId: parseInt(req.body.insurerId) });
    res.status(201).json({ profile });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Profile already exists for this insurer.' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid insurerId.' });
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const errors = validate(req.body, true);
    if (errors.length) return res.status(400).json({ errors });

    const profile = await service.update(parseInt(req.params.id), req.body);
    res.json({ profile });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Invoice profile not found.' });
    next(err);
  }
};

module.exports = {
  listProfiles, getProfile, getProfileByInsurer, createProfile, updateProfile,
};
