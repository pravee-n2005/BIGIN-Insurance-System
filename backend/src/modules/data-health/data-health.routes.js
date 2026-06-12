const express = require('express');
const c = require('./data-health.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, adminOnly);

router.get('/overview', c.getOverview);

module.exports = router;
