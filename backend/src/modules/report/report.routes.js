const express = require('express');
const { monthlyReport, insurerReport, leadSourceReport, categoryReport } = require('./report.controller');
const authenticate = require('../../middleware/authenticate');
const { ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, ownerOrAdmin);

router.get('/monthly',     monthlyReport);
router.get('/insurer',     insurerReport);
router.get('/lead-source', leadSourceReport);
router.get('/category',    categoryReport);

module.exports = router;
