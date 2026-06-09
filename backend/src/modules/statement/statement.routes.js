'use strict';

const express = require('express');
const c = require('./statement.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();
router.use(authenticate);

// ── Specific paths first (before /:id) ──────────────────────────────────────
router.get('/available-policies',       ownerOrAdmin, c.availablePolicies);

// ── Collection ──────────────────────────────────────────────────────────────
router.get('/',                          ownerOrAdmin, c.listStatements);
router.post('/',                         adminOnly,    c.createStatement);

// ── Nested under /:id — declare more specific routes before /:id GET ────────
router.post('/:id/policies',             adminOnly,    c.attachPolicies);
router.put('/:id/policies/:spId',        adminOnly,    c.updateStatementPolicy);
router.delete('/:id/policies/:spId',     adminOnly,    c.detachPolicy);

router.post('/:id/finalize',             adminOnly,    c.finalize);
router.post('/:id/generate-invoice',     adminOnly,    c.generateInvoice);
router.patch('/:id/cancel',              adminOnly,    c.cancelStatement);

router.patch('/:id',                     adminOnly,    c.updateStatement);
router.get('/:id',                       ownerOrAdmin, c.getStatement);

module.exports = router;
