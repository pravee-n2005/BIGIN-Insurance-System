const express = require('express');
const c = require('./invoice.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Draft generation is ADMIN only (it computes a number sequence + reads policies).
router.post('/draft', adminOnly,    c.generateDraft);

// Save a new invoice (ADMIN only — advances the sequence and commits to DB).
router.post('/',      adminOnly,    c.saveInvoice);

// Listing and viewing saved invoices is read-only for both roles.
router.get('/',          ownerOrAdmin, c.listInvoices);

// PDF download — must be declared before /:id so Express doesn't treat "pdf" as an id.
router.get('/:id/pdf',    ownerOrAdmin, c.downloadPdf);

// Cancel invoice (ADMIN only — sets status to CANCELLED, never deletes).
router.patch('/:id/cancel',      adminOnly, c.cancelInvoice);

// Module 4 — toggle GST-exempt classification flag (admin only).
router.patch('/:id/gst-exempt',  adminOnly, c.setGstExempt);

router.get('/:id',        ownerOrAdmin, c.getInvoice);

module.exports = router;
