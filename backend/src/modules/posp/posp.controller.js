'use strict';

const service = require('./posp.service');
const { validateCreateMember, validateUpdateMember, validateCreateEntry, validateUpdateEntry } = require('./posp.validation');
const { generatePOSPReportXlsx } = require('./posp.report.xlsx');

// ─── Members ──────────────────────────────────────────────────────────────────

async function getMembers(req, res, next) {
  try {
    const { page, limit, search, status, includeDeleted } = req.query;
    const result = await service.listMembers({ page, limit, search, status, includeDeleted: includeDeleted === 'true' });
    res.json(result);
  } catch (err) { next(err); }
}

async function getAllActiveMembers(req, res, next) {
  try { res.json(await service.listAllActiveMembers()); }
  catch (err) { next(err); }
}

async function getMember(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const member = await service.getMemberById(id);
    if (!member || member.isDeleted) return res.status(404).json({ error: 'POSP member not found.' });
    res.json(member);
  } catch (err) { next(err); }
}

async function createMember(req, res, next) {
  try {
    const errors = validateCreateMember(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const member = await service.createMember(req.body, req.user.id);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A POSP member with that code already exists.' });
    next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const errors = validateUpdateMember(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const member = await service.updateMember(id, req.body, req.user.id);
    if (!member) return res.status(404).json({ error: 'POSP member not found.' });
    res.json(member);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A POSP member with that code already exists.' });
    next(err);
  }
}

async function deleteMember(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const result = await service.deleteMember(id);
    if (!result) return res.status(404).json({ error: 'POSP member not found.' });
    res.json({ message: 'POSP member deleted.' });
  } catch (err) { next(err); }
}

// ─── Policy suggestions (leadSource match, exclude already imported) ──────────

async function getSuggestedPolicies(req, res, next) {
  try {
    const { pospMemberId, fy, month } = req.query;
    if (!pospMemberId) return res.status(400).json({ error: 'pospMemberId is required.' });
    const results = await service.suggestPolicies({ pospMemberId, fy, month });
    res.json(results);
  } catch (err) { next(err); }
}

async function bulkImportEntries(req, res, next) {
  try {
    const { pospMemberId, policyIds, pospShare } = req.body;
    if (!pospMemberId || !Array.isArray(policyIds) || policyIds.length === 0) {
      return res.status(400).json({ error: 'pospMemberId and policyIds[] are required.' });
    }
    const created = await service.bulkCreateEntries({ pospMemberId, policyIds, pospShare }, req.user.id);
    res.status(201).json({ imported: created.length, entries: created });
  } catch (err) { next(err); }
}

// ─── Policy search (link existing policy) ─────────────────────────────────────

async function searchPolicies(req, res, next) {
  try {
    const { q, limit } = req.query;
    const results = await service.searchPoliciesForLink({ q, limit });
    res.json(results);
  } catch (err) { next(err); }
}

// ─── Incentive entries ────────────────────────────────────────────────────────

async function listEntries(req, res, next) {
  try {
    const { pospMemberId, fy, month, paymentStatus, page, limit } = req.query;
    const result = await service.listEntries({ pospMemberId, fy, month, paymentStatus, page, limit });
    res.json(result);
  } catch (err) { next(err); }
}

async function createEntry(req, res, next) {
  try {
    const errors = validateCreateEntry(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const entry = await service.createEntry(req.body, req.user.id);
    res.status(201).json(entry);
  } catch (err) { next(err); }
}

async function updateEntry(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const errors = validateUpdateEntry(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const entry = await service.updateEntry(id, req.body, req.user.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    res.json(entry);
  } catch (err) { next(err); }
}

async function deleteEntry(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id.' });
    const result = await service.deleteEntry(id);
    if (!result) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ message: 'Entry deleted.' });
  } catch (err) { next(err); }
}

// ─── Excel import ────────────────────────────────────────────────────────────

async function previewExcelImport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const result = await service.previewExcelImport(req.file.buffer);
    res.json(result);
  } catch (err) {
    if (err.message && !err.stack?.includes('prisma')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function importExcel(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const { pospMemberId, defaultPospShare } = req.body;
    // pospMemberId is optional — grouped files determine members from Lead Source headers
    const result = await service.importExcelEntries(
      req.file.buffer,
      { pospMemberId: pospMemberId || null, defaultPospShare: defaultPospShare ? Number(defaultPospShare) : 65 },
      req.user.id,
    );
    res.status(201).json(result);
  } catch (err) {
    if (err.message && !err.stack?.includes('prisma')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

// ─── Reports ──────────────────────────────────────────────────────────────────

async function getReport(req, res, next) {
  try {
    const { pospMemberId, fy, month, paymentStatus } = req.query;
    const data = await service.getReportData({ pospMemberId, fy, month, paymentStatus });
    res.json(data);
  } catch (err) { next(err); }
}

async function exportReport(req, res, next) {
  try {
    const { pospMemberId, fy, month, paymentStatus } = req.query;
    const data = await service.getReportData({ pospMemberId, fy, month, paymentStatus });
    const buffer = await generatePOSPReportXlsx(data);
    const suffix = month || fy || 'all';
    const memberCode = data.member?.code || 'ALL';
    const filename = `POSP_Report_${memberCode}_${suffix}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
}

module.exports = {
  getMembers, getAllActiveMembers, getMember, createMember, updateMember, deleteMember,
  getSuggestedPolicies, bulkImportEntries,
  searchPolicies,
  listEntries, createEntry, updateEntry, deleteEntry,
  previewExcelImport, importExcel,
  getReport, exportReport,
};
