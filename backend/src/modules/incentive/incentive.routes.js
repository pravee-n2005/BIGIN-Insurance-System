const express = require('express');
const c = require('./incentive.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// ─── Reports (must be declared before /:id) ──────────────────────────────────
router.get('/reports/executive-wise', ownerOrAdmin, c.executiveWiseReport);
router.get('/reports/executive-wise/pdf', ownerOrAdmin, c.executiveWiseReportPDF);
router.get('/reports/month-wise',     ownerOrAdmin, c.monthWiseReport);

// ─── Deleted entries (must be declared before /:id) ──────────────────────────
router.get('/deleted', adminOnly, c.listDeletedIncentives);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/',     ownerOrAdmin, c.listIncentives);
router.post('/',    adminOnly,    c.createIncentive);
router.get('/:id',  ownerOrAdmin, c.getIncentive);
router.put('/:id',  adminOnly,    c.updateIncentive);
router.delete('/:id', adminOnly,  c.deleteIncentive);
router.post('/:id/restore', adminOnly, c.restoreIncentive);

module.exports = router;
