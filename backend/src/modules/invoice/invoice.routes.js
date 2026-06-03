const express = require('express');
const c = require('./invoice.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Draft generation is ADMIN only (it computes a number sequence + reads policies).
router.post('/draft', adminOnly,    c.generateDraft);

// Listing saved invoices is read-only for both roles.
router.get('/',       ownerOrAdmin, c.listInvoices);

module.exports = router;
