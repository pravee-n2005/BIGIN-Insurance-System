'use strict';

/**
 * One-time fix: correct POSPIncentiveEntry rows where pospCommission is
 * clearly wrong (Excel formula cells multiplied by decimal share 0.65 instead
 * of 65, making pospCommission 1/100th of the expected value).
 *
 * Detection heuristic: pospCommission / brokerage < 0.01  AND  brokerage > 0
 * (i.e., commission is less than 1% of brokerage — impossible at 52–70% share).
 *
 * Also fixes commissionRate stored as decimal fraction (e.g. 0.12 → 12).
 *
 * Run: node scripts/fix-posp-pospshare.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function main() {
  const all = await prisma.pOSPIncentiveEntry.findMany({
    where: { isDeleted: false },
    select: {
      id: true, policyNumber: true, customerName: true,
      premium: true, commissionRate: true, pospShare: true,
      brokerage: true, pospCommission: true, orgCommission: true,
    },
  });

  const toFix = all.filter((e) => {
    const brok = Number(e.brokerage);
    const pComm = Number(e.pospCommission);
    const share = Number(e.pospShare);
    if (brok <= 0 || share <= 0) return false;
    const expectedApprox = brok * share / 100;
    // Flag if actual pospCommission is less than 1% of expected (100x off)
    return pComm < expectedApprox * 0.01;
  });

  // Also find entries with commissionRate stored as decimal fraction (< 1 and > 0)
  const badCommRate = all.filter((e) => {
    const r = Number(e.commissionRate);
    return r > 0 && r < 1;
  });

  console.log(`\n=== pospCommission fix (pospComm << expected) ===`);
  if (toFix.length === 0) {
    console.log('No pospCommission issues found.');
  } else {
    console.log(`Found ${toFix.length} records:\n`);
    console.log('ID  | Policy Number            | Customer                | Brok     | Share | pospComm (before) | pospComm (after) | orgComm (after)');
    console.log('-'.repeat(125));
    for (const e of toFix) {
      const brok = Number(e.brokerage);
      const share = Number(e.pospShare);
      const newPospComm = round2(brok * share / 100);
      const newOrgComm  = round2(brok - newPospComm);
      console.log(
        `${String(e.id).padEnd(4)}| ${e.policyNumber.padEnd(25)}| ${e.customerName.padEnd(24)}| ${String(brok).padEnd(9)}| ${String(share).padEnd(6)}| ${String(Number(e.pospCommission)).padEnd(18)}| ${String(newPospComm).padEnd(17)}| ${newOrgComm}`
      );
      await prisma.pOSPIncentiveEntry.update({
        where: { id: e.id },
        data: { pospCommission: newPospComm, orgCommission: newOrgComm },
      });
    }
    console.log(`\nFixed ${toFix.length} records.`);
  }

  console.log(`\n=== commissionRate fix (stored as decimal fraction) ===`);
  if (badCommRate.length === 0) {
    console.log('No commissionRate issues found.');
  } else {
    console.log(`Found ${badCommRate.length} records:`);
    for (const e of badCommRate) {
      const oldRate = Number(e.commissionRate);
      const newRate = round2(oldRate * 100);
      console.log(`  id=${e.id} pn=${e.policyNumber} commRate: ${oldRate} → ${newRate}`);
      await prisma.pOSPIncentiveEntry.update({
        where: { id: e.id },
        data: { commissionRate: newRate },
      });
    }
    console.log(`Fixed ${badCommRate.length} records.`);
  }

  console.log('\n=== Final verification ===');
  const all2 = await prisma.pOSPIncentiveEntry.findMany({
    where: { isDeleted: false },
    select: { id: true, policyNumber: true, brokerage: true, pospCommission: true, orgCommission: true },
  });
  let ok = 0, bad = 0;
  for (const e of all2) {
    const sum = Number(e.pospCommission) + Number(e.orgCommission);
    const diff = Math.abs(sum - Number(e.brokerage));
    if (diff > 0.02) {
      bad++;
      console.log(`  STILL BAD id=${e.id} pn=${e.policyNumber} brok=${Number(e.brokerage)} pospComm=${Number(e.pospCommission)} orgComm=${Number(e.orgCommission)} sum=${sum.toFixed(2)} diff=${diff.toFixed(2)}`);
    } else ok++;
  }
  console.log(`\nVerification: ${ok} OK, ${bad} still have pospComm+orgComm≠brokerage`);
  if (bad > 0) console.log('  (remaining discrepancies may be source data issues — TDS deductions or commission-exempt policies)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
