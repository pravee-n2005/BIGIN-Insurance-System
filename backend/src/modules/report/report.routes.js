const express = require('express');
const {
  availableMonthsReport, monthlyReport, insurerReport, leadSourceReport, categoryReport,
  gstSalesReport, gstSalesExport, creditsReport, creditsExport,
  monthlyGstReport, monthlyGstExport,
} = require('./report.controller');
const authenticate = require('../../middleware/authenticate');
const { ownerOrAdmin } = require('../../middleware/authorize');

const router = express.Router();

router.use(authenticate, ownerOrAdmin);

router.get('/months',           availableMonthsReport);
router.get('/monthly',          monthlyReport);

// Module 4 — GST Sales + Credits reports (both JSON preview + xlsx export)
router.get('/gst-sales',        gstSalesReport);
router.get('/gst-sales/export', gstSalesExport);
router.get('/credits',          creditsReport);
router.get('/credits/export',   creditsExport);

// Phase 5 — Monthly GST Report (JSON preview + xlsx export)
router.get('/monthly-gst',        monthlyGstReport);
router.get('/monthly-gst/export', monthlyGstExport);

router.get('/insurer',     insurerReport);
router.get('/lead-source', leadSourceReport);
router.get('/category',    categoryReport);

module.exports = router;
