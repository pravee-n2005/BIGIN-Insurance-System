const express = require('express');
const c = require('./dashboard.controller');
const authenticate = require('../../middleware/authenticate');
const { ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, ownerOrAdmin);

router.get('/stats', c.getStats);

module.exports = router;
