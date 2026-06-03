const express = require('express');
const { importPolicies } = require('./import.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/authorize');

const router = express.Router();

router.post('/policies', authenticate, adminOnly, importPolicies);

module.exports = router;
