const express = require('express');
const { exportMonthly } = require('./pdf.controller');
const authenticate = require('../../middleware/authenticate');
const { ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, ownerOrAdmin);

router.get('/monthly', exportMonthly);

module.exports = router;
