const express = require('express');
const c = require('./invoice-profile.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly, ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate);

// Read
router.get('/',                       ownerOrAdmin, c.listProfiles);
router.get('/by-insurer/:insurerId',  ownerOrAdmin, c.getProfileByInsurer);
router.get('/:id',                    ownerOrAdmin, c.getProfile);

// Write — ADMIN only
router.post('/',     adminOnly, c.createProfile);
router.put('/:id',   adminOnly, c.updateProfile);

module.exports = router;
