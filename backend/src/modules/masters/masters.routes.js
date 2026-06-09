const express = require('express');
const c = require('./masters.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// ─── Insurers ───────────────────────────────────────────────────────────────
router.get('/insurers',                       ownerOrAdmin, c.getInsurers);
router.post('/insurers',                      adminOnly,    c.postInsurer);
router.get('/insurers/:id',                   ownerOrAdmin, c.getInsurer);
router.put('/insurers/:id',                   adminOnly,    c.putInsurer);
router.patch('/insurers/:id/activate',        adminOnly,    c.activateInsurer);     // Module 5
router.patch('/insurers/:id/deactivate',      adminOnly,    c.deactivateInsurer);   // Module 5

// ─── Products ───────────────────────────────────────────────────────────────
router.get('/products',                       ownerOrAdmin, c.getProducts);
router.post('/products',                      adminOnly,    c.postProduct);
router.get('/products/:id',                   ownerOrAdmin, c.getProduct);
router.put('/products/:id',                   adminOnly,    c.putProduct);
router.patch('/products/:id/activate',        adminOnly,    c.activateProduct);     // Module 5
router.patch('/products/:id/deactivate',      adminOnly,    c.deactivateProduct);   // Module 5

// ─── Lead Members ───────────────────────────────────────────────────────────
router.get('/lead-members',                   ownerOrAdmin, c.getLeadMembers);
router.post('/lead-members',                  adminOnly,    c.postLeadMember);
router.get('/lead-members/:id',               ownerOrAdmin, c.getLeadMember);
router.put('/lead-members/:id',               adminOnly,    c.putLeadMember);
router.patch('/lead-members/:id/activate',    adminOnly,    c.activateLeadMember);  // Module 5
router.patch('/lead-members/:id/deactivate',  adminOnly,    c.deactivateLeadMember);// Module 5

module.exports = router;
