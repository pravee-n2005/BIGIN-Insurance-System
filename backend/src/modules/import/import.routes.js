const express = require('express');
const multer = require('multer');
const {
  importPolicies, downloadTemplate, previewImportPolicies, commitImportPolicies,
} = require('./import.controller');
const authenticate = require('../../middleware/authenticate');
const { adminOnly } = require('../../middleware/authorize');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls)$/i.test(file.originalname || '');
    const okMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ].includes(file.mimetype);
    if (okExt || okMime) return cb(null, true);
    cb(new Error('Only .xlsx or .xls files are allowed.'));
  },
});

router.post('/policies', authenticate, adminOnly, importPolicies);

router.get('/policies/template', authenticate, adminOnly, downloadTemplate);
router.post('/policies/preview', authenticate, adminOnly, upload.single('file'), previewImportPolicies);
router.post('/policies/commit', authenticate, adminOnly, upload.single('file'), commitImportPolicies);

module.exports = router;
