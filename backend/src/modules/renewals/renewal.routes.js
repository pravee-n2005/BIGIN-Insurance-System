const express = require('express');
const c = require('./renewal.controller');
const authenticate = require('../../middleware/authenticate');
const { ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, ownerOrAdmin);

router.get('/worklist', c.getWorklist);

module.exports = router;
