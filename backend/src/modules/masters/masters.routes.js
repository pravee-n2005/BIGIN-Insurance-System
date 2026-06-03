const express = require('express');
const c = require('./masters.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// ─── Read: ADMIN + OWNER (so OWNER can still see dropdowns when viewing) ─────
router.get('/insurers',     ownerOrAdmin, c.getInsurers);
router.get('/products',     ownerOrAdmin, c.getProducts);
router.get('/lead-members', ownerOrAdmin, c.getLeadMembers);

// ─── Write: ADMIN only ───────────────────────────────────────────────────────
router.post('/insurers',     adminOnly, c.postInsurer);
router.put('/insurers/:id',  adminOnly, c.putInsurer);

router.post('/products',     adminOnly, c.postProduct);
router.put('/products/:id',  adminOnly, c.putProduct);

router.post('/lead-members',     adminOnly, c.postLeadMember);
router.put('/lead-members/:id',  adminOnly, c.putLeadMember);

module.exports = router;
