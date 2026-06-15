const express = require('express');
const c = require('./daily-incentive.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// ─── Settings (singleton) ────────────────────────────────────────────────────
router.get('/settings', ownerOrAdmin, c.getSettings);
router.put('/settings', adminOnly, c.updateSettings);

// ─── Reports (must be declared before /:id) ──────────────────────────────────
router.get('/reports/weekly', ownerOrAdmin, c.weeklyReport);

// ─── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/', ownerOrAdmin, c.listEntries);
router.post('/', adminOnly, c.createEntry);
router.get('/:id', ownerOrAdmin, c.getEntry);
router.put('/:id', adminOnly, c.updateEntry);
router.delete('/:id', adminOnly, c.deleteEntry);

module.exports = router;
