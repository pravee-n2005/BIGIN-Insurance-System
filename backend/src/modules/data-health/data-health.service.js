const prisma = require('../../config/prisma');

// ─── Read-only Data Health Dashboard ───────────────────────────────────────
// All queries here are SELECT-only. Nothing in this module writes to the
// database, and it does not touch policy/commission/import/report/incentive
// business logic.

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

  const inactiveInsurerPolicies = [];
  const missingLeadExecutivePolicies = [];
  const missingCommissionPolicies = [];

  let missingCommissionPercentCount = 0;
  let missingCommissionAmountCount = 0;

  const policyNumberGroups = new Map();

  for (const p of policies) {
    if (inactiveInsurerNames.has((p.insurerName || '').trim().toLowerCase())) {
      inactiveInsurerPolicies.push(toRow(p, `Insurer "${p.insurerName}" is marked inactive`));
    }

    if (isBlank(p.leadSource)) {
      missingLeadExecutivePolicies.push(toRow(p, 'Lead Executive / Lead Source is missing'));
    }

    const commissionPercent = Number(p.commissionPercent);
    const commissionAmount = Number(p.commissionAmount);
    const commissionIssues = [];
    if (commissionPercent === 0) {
      missingCommissionPercentCount++;
      commissionIssues.push('Commission Percent is 0');
    }
    if (commissionAmount === 0) {
      missingCommissionAmountCount++;
      commissionIssues.push('Commission Amount is 0');
    }
    if (commissionIssues.length) {
      missingCommissionPolicies.push(toRow(p, commissionIssues.join('; ')));
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

  return {
    summary: {
      totalPolicies: policies.length,
      inactiveInsurerCount: inactiveInsurerPolicies.length,
      missingLeadExecutiveCount: missingLeadExecutivePolicies.length,
      missingCommissionPercentCount,
      missingCommissionAmountCount,
      duplicatePolicyNumberCount: duplicatePolicyNumbers.length,
    },
    inactiveInsurerPolicies,
    missingLeadExecutivePolicies,
    missingCommissionPolicies,
    duplicatePolicyNumbers,
  };
}

module.exports = { overview };
