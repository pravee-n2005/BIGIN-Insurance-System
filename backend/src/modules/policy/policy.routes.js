const express = require('express');
const { createPolicy, listPolicies, getPolicy, updatePolicy } = require('./policy.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Read — ADMIN + OWNER
router.get('/',    ownerOrAdmin, listPolicies);
router.get('/:id', ownerOrAdmin, getPolicy);

// Write — ADMIN only
router.post('/',    adminOnly, createPolicy);
router.put('/:id',  adminOnly, updatePolicy);

module.exports = router;
