const prisma = require('../../config/prisma');

// ─── Read-only Data Health Dashboard ───────────────────────────────────────
// All queries here are SELECT-only. Nothing in this module writes to the
// database, and it does not touch policy/commission/import/report/incentive
// business logic.

// ─── Confirmed-zero commission policy IDs ────────────────────────────────────
// Cross-referenced against the client's uploaded sales ledger (14-May-2026).
// The ledger explicitly records commissionAmount = 0 for these policies.
// They are NOT data quality issues — the insurer paid ₹0 brokerage (common for
// TP-only motor, self-sourced business, waived commission, or NBFC-routed deals).
// Updated: 22 June 2026 after full ledger reconciliation.
const CONFIRMED_ZERO_COMMISSION_IDS = new Set([
  // Star Health Insurance (7)
  162, 167, 188, 190, 196, 198, 199,
  // HDFC Ergo General (8)
  9, 35, 156, 158, 159, 182, 184, 191,
  // ICICI Lombard General (7)
  5, 8, 19, 153, 164, 166, 185,
  // ICICI Prudential Life (1) — monthly premium policy, ₹0 brokerage
  183,
  // United India General (8)
  7, 13, 28, 181, 192, 193, 194, 195,
  // Go Digit General + Life (4)
  141, 160, 161, 189,
  // New India Assurance (1)
  6,
  // Max Life (1)
  151,
]);

const POLICY_SELECT = {
  id: true,
  policyNumber: true,
  customerName: true,
  insurerName: true,
  productName: true,
  leadSource: true,
  commissionPercent: true,
  commissionAmount: true,
};

function isBlank(value) {
  return !value || !String(value).trim();
}

function toRow(policy, issue) {
  return {
    id: policy.id,
    policyNumber: policy.policyNumber,
    customerName: policy.customerName,
    insurerName: policy.insurerName,
    productName: policy.productName,
    issue,
  };
}

async function overview() {
  // Two queries total: all policies (minimal columns) + inactive insurer names.
  const [policies, inactiveInsurers] = await Promise.all([
    prisma.policy.findMany({ select: POLICY_SELECT, orderBy: { id: 'asc' } }),
    prisma.insurer.findMany({ where: { active: false }, select: { name: true } }),
  ]);

  const inactiveInsurerNames = new Set(inactiveInsurers.map((i) => i.name.trim().toLowerCase()));

  const inactiveInsurerPolicies      = [];
  const missingLeadExecutivePolicies = [];
  const confirmedZeroPolicies        = [];
  const missingCommissionPolicies    = [];

  const policyNumberGroups = new Map();

  for (const p of policies) {
    if (inactiveInsurerNames.has((p.insurerName || '').trim().toLowerCase())) {
      inactiveInsurerPolicies.push(toRow(p, `Insurer "${p.insurerName}" is marked inactive`));
    }

    if (isBlank(p.leadSource)) {
      missingLeadExecutivePolicies.push(toRow(p, 'Lead Executive / Lead Source is missing'));
    }

    const commissionPercent = Number(p.commissionPercent);
    const commissionAmount  = Number(p.commissionAmount);
    const isZero = commissionPercent === 0 || commissionAmount === 0;

    if (isZero) {
      if (CONFIRMED_ZERO_COMMISSION_IDS.has(p.id)) {
        // Ledger-confirmed ₹0 — insurer did not pay brokerage on this policy.
        const reasons = [];
        if (commissionPercent === 0) reasons.push('Commission % = 0 (confirmed by ledger)');
        if (commissionAmount  === 0) reasons.push('Commission amount = ₹0 (confirmed by ledger)');
        confirmedZeroPolicies.push(toRow(p, reasons.join('; ')));
      } else {
        // Not in the confirmed set — commission data is genuinely unknown or missing.
        const reasons = [];
        if (commissionPercent === 0) reasons.push('Commission % missing');
        if (commissionAmount  === 0) reasons.push('Commission amount missing');
        missingCommissionPolicies.push(toRow(p, reasons.join('; ') + ' — not confirmed in ledger'));
      }
    }

    const key = (p.policyNumber || '').trim().toUpperCase();
    if (!policyNumberGroups.has(key)) policyNumberGroups.set(key, []);
    policyNumberGroups.get(key).push(p);
  }

  const duplicatePolicyNumbers = [];
  for (const group of policyNumberGroups.values()) {
    if (group.length > 1) {
      for (const p of group) {
        duplicatePolicyNumbers.push(toRow(p, `Duplicate policy number — appears ${group.length} times`));
      }
    }
  }

  // Legacy counts kept for backward compatibility with existing tests/consumers.
  const missingCommissionPercentCount = confirmedZeroPolicies.filter(r => r.issue.includes('% = 0')).length
    + missingCommissionPolicies.filter(r => r.issue.includes('% missing')).length;
  const missingCommissionAmountCount  = confirmedZeroPolicies.filter(r => r.issue.includes('₹0')).length
    + missingCommissionPolicies.filter(r => r.issue.includes('amount missing')).length;

  return {
    summary: {
      totalPolicies:                policies.length,
      inactiveInsurerCount:         inactiveInsurerPolicies.length,
      missingLeadExecutiveCount:    missingLeadExecutivePolicies.length,
      confirmedZeroCommissionCount: confirmedZeroPolicies.length,
      missingCommissionCount:       missingCommissionPolicies.length,
      // Legacy fields — kept so existing dashboard tests and API consumers don't break.
      missingCommissionPercentCount,
      missingCommissionAmountCount,
      duplicatePolicyNumberCount:   duplicatePolicyNumbers.length,
    },
    inactiveInsurerPolicies,
    missingLeadExecutivePolicies,
    confirmedZeroPolicies,
    missingCommissionPolicies,
    duplicatePolicyNumbers,
  };
}

module.exports = { overview };
