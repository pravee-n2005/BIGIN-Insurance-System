'use strict';

const { Router } = require('express');
const multer     = require('multer');
const path       = require('path');
const authenticate = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/authorize');
const c = require('./posp.controller');
const { BILL_UPLOAD_DIR } = require('./posp.service');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt  = /\.(xlsx|xls)$/i.test(file.originalname || '');
    const okMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ].includes(file.mimetype);
    if (okExt || okMime) return cb(null, true);
    cb(new Error('Only .xlsx or .xls files are allowed.'));
  },
});

const billUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, BILL_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `bill_${req.params.id}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname || '');
    if (ok) return cb(null, true);
    cb(new Error('Only PDF, JPG, or PNG files are allowed.'));
  },
});

router.use(authenticate);

// ─── Members ──────────────────────────────────────────────────────────────────
router.get('/members/all',    c.getAllActiveMembers);
router.get('/members',        c.getMembers);
router.get('/members/:id',    c.getMember);
router.post('/members',       adminOnly, c.createMember);
router.put('/members/:id',    adminOnly, c.updateMember);
router.delete('/members/:id', adminOnly, c.deleteMember);

// ─── Policy suggestions + search ──────────────────────────────────────────────
router.get('/policies/suggest', c.getSuggestedPolicies);
router.get('/policies/search',  c.searchPolicies);

// ─── Incentive entries ────────────────────────────────────────────────────────
router.get('/entries',                    c.listEntries);
router.post('/entries/bulk',              adminOnly, c.bulkImportEntries);
router.post('/entries/import-excel/preview', adminOnly, upload.single('file'), c.previewExcelImport);
router.post('/entries/import-excel',      adminOnly, upload.single('file'), c.importExcel);
router.post('/entries',                   adminOnly, c.createEntry);
router.put('/entries/:id',                adminOnly, c.updateEntry);
router.delete('/entries/:id',             adminOnly, c.deleteEntry);
router.post('/entries/:id/bill',          adminOnly, billUpload.single('file'), c.uploadBill);
router.get('/entries/:id/bill',           c.serveBill);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports',        c.getReport);
router.get('/reports/export', c.exportReport);

module.exports = router;
