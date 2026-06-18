'use strict';

const prisma = require('../../config/prisma');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// ─── Financial calculations (backend only) ────────────────────────────────────

function calcFields(premium, commissionRate, pospShare) {
  const brokerage      = round2(Number(premium) * Number(commissionRate) / 100);
  const pospCommission = round2(brokerage * Number(pospShare) / 100);
  const orgCommission  = round2(brokerage - pospCommission);
  return { brokerage, pospCommission, orgCommission };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fyDateRange(fy) {
  // "2025-26" → Apr 1 2025 to Apr 1 2026
  const startYr = Number(fy.split('-')[0]);
  return { gte: new Date(startYr, 3, 1), lt: new Date(startYr + 1, 3, 1) };
}

function monthDateRange(month) {
  // "2026-03" → Mar 1 2026 to Apr 1 2026
  const [y, m] = month.split('-').map(Number);
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
}

// ─── Member CRUD ──────────────────────────────────────────────────────────────

async function listMembers({ page = 1, limit = 20, search, status, includeDeleted = false } = {}) {
  const where = {};
  if (!includeDeleted) where.isDeleted = false;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [members, total] = await Promise.all([
    prisma.pOSPMember.findMany({
      where, skip, take: Number(limit),
      orderBy: { name: 'asc' },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.pOSPMember.count({ where }),
  ]);

  return { members, total, page: Number(page), pages: Math.ceil(total / limit) };
}

async function listAllActiveMembers() {
  return prisma.pOSPMember.findMany({
    where: { isDeleted: false, status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

async function getMemberById(id) {
  return prisma.pOSPMember.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

async function createMember(body, userId) {
  return prisma.pOSPMember.create({
    data: {
      name:        body.name.trim(),
      code:        body.code.trim(),
      mobile:      body.mobile?.trim() || null,
      email:       body.email?.trim()  || null,
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
      status:      body.status || 'ACTIVE',
      remarks:     body.remarks?.trim() || null,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

async function updateMember(id, body, userId) {
  const existing = await prisma.pOSPMember.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;

  const data = {};
  if (body.name        !== undefined) data.name        = body.name.trim();
  if (body.code        !== undefined) data.code        = body.code.trim();
  if (body.mobile      !== undefined) data.mobile      = body.mobile?.trim() || null;
  if (body.email       !== undefined) data.email       = body.email?.trim()  || null;
  if (body.joiningDate !== undefined) data.joiningDate = body.joiningDate ? new Date(body.joiningDate) : null;
  if (body.status      !== undefined) data.status      = body.status;
  if (body.remarks     !== undefined) data.remarks     = body.remarks?.trim() || null;

  return prisma.pOSPMember.update({
    where: { id }, data,
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

async function deleteMember(id) {
  const existing = await prisma.pOSPMember.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;
  return prisma.pOSPMember.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

// ─── Policy suggestions (leadSource fuzzy match, exclude already imported) ────

async function suggestPolicies({ pospMemberId, fy, month }) {
  const member = await prisma.pOSPMember.findUnique({
    where: { id: Number(pospMemberId) },
    select: { name: true },
  });
  if (!member) return [];

  // Build OR conditions: full name + each word >= 4 chars
  const name  = member.name.trim();
  const words = name.split(/\s+/).filter((w) => w.length >= 4);
  const uniqueTerms = [...new Set([name, ...words])];
  const leadSourceConditions = uniqueTerms.map((term) => ({
    leadSource: { contains: term, mode: 'insensitive' },
  }));

  // Date range filter
  const dateFilter = (() => {
    if (month) {
      const [y, m] = month.split('-').map(Number);
      return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }
    if (fy) {
      const startYr = Number(fy.split('-')[0]);
      return { gte: new Date(startYr, 3, 1), lt: new Date(startYr + 1, 3, 1) };
    }
    return undefined;
  })();

  // IDs already in the register for this POSP (any period) so we don't re-suggest
  const existing = await prisma.pOSPIncentiveEntry.findMany({
    where: { pospMemberId: Number(pospMemberId), isDeleted: false, policyId: { not: null } },
    select: { policyId: true },
  });
  const excludeIds = existing.map((e) => e.policyId);

  const where = {
    status: { not: 'CANCELLED' },
    OR: leadSourceConditions,
  };
  if (dateFilter) where.issueDate = dateFilter;
  if (excludeIds.length) where.id = { notIn: excludeIds };

  return prisma.policy.findMany({
    where,
    select: {
      id: true, policyNumber: true, customerName: true,
      insurerName: true, insuranceCategory: true,
      issueDate: true, netPremium: true, commissionPercent: true,
      leadSource: true,
    },
    orderBy: { issueDate: 'desc' },
    take: 200,
  });
}

// ─── Bulk import: create entries from suggested policies ──────────────────────

async function bulkCreateEntries({ pospMemberId, policyIds, pospShare = 65 }, userId) {
  if (!policyIds || policyIds.length === 0) return [];

  // Re-check which are already imported (race safety)
  const existing = await prisma.pOSPIncentiveEntry.findMany({
    where: {
      pospMemberId: Number(pospMemberId),
      isDeleted:    false,
      policyId:     { in: policyIds.map(Number) },
    },
    select: { policyId: true },
  });
  const alreadyIn = new Set(existing.map((e) => e.policyId));
  const toImport  = policyIds.map(Number).filter((id) => !alreadyIn.has(id));
  if (toImport.length === 0) return [];

  const policies = await prisma.policy.findMany({
    where: { id: { in: toImport } },
    select: {
      id: true, policyNumber: true, customerName: true,
      insuranceCategory: true, issueDate: true,
      netPremium: true, commissionPercent: true,
    },
  });

  const share = Number(pospShare);
  const created = [];

  await prisma.$transaction(async (tx) => {
    for (const p of policies) {
      const commissionRate = Number(p.commissionPercent);
      const { brokerage, pospCommission, orgCommission } = calcFields(
        Number(p.netPremium), commissionRate, share
      );
      const entry = await tx.pOSPIncentiveEntry.create({
        data: {
          pospMemberId:   Number(pospMemberId),
          policyId:       p.id,
          isManual:       false,
          entryDate:      p.issueDate,
          policyNumber:   p.policyNumber,
          customerName:   p.customerName,
          policyType:     p.insuranceCategory || null,
          premium:        Number(p.netPremium),
          commissionRate,
          pospShare:      share,
          brokerage,
          pospCommission,
          orgCommission,
          paymentStatus:  'PENDING',
          createdById:    userId,
        },
      });
      created.push(entry);
    }
  });

  return created;
}

// ─── Policy search (for linking existing policies) ────────────────────────────

async function searchPoliciesForLink({ q, limit = 20 }) {
  if (!q || String(q).trim().length < 2) return [];
  const term = String(q).trim();
  return prisma.policy.findMany({
    where: {
      status: { not: 'CANCELLED' },
      OR: [
        { policyNumber:  { contains: term, mode: 'insensitive' } },
        { customerName:  { contains: term, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, policyNumber: true, customerName: true,
      insurerName: true, insuranceCategory: true,
      issueDate: true, netPremium: true, commissionPercent: true,
    },
    orderBy: { issueDate: 'desc' },
    take: Number(limit),
  });
}

// ─── Incentive entries CRUD ───────────────────────────────────────────────────

async function listEntries({ pospMemberId, fy, month, paymentStatus, page = 1, limit = 100 } = {}) {
  const where = { isDeleted: false };
  if (pospMemberId) where.pospMemberId = Number(pospMemberId);
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (month) {
    where.entryDate = monthDateRange(month);
  } else if (fy) {
    where.entryDate = fyDateRange(fy);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [entries, total] = await Promise.all([
    prisma.pOSPIncentiveEntry.findMany({
      where, skip, take: Number(limit),
      orderBy: [{ entryDate: 'asc' }, { policyNumber: 'asc' }],
      include: { pospMember: { select: { id: true, name: true, code: true } } },
    }),
    prisma.pOSPIncentiveEntry.count({ where }),
  ]);

  // Summary aggregation
  const agg = await prisma.pOSPIncentiveEntry.aggregate({
    where,
    _sum: { premium: true, brokerage: true, pospCommission: true, orgCommission: true },
    _count: { id: true },
  });

  const summary = {
    totalPolicies:        agg._count.id,
    totalPremium:         round2(agg._sum.premium      || 0),
    totalBrokerage:       round2(agg._sum.brokerage    || 0),
    totalPospCommission:  round2(agg._sum.pospCommission || 0),
    totalOrgCommission:   round2(agg._sum.orgCommission  || 0),
  };

  return { entries, total, page: Number(page), pages: Math.ceil(total / limit), summary };
}

async function getEntryById(id) {
  return prisma.pOSPIncentiveEntry.findUnique({
    where: { id },
    include: { pospMember: { select: { id: true, name: true, code: true } } },
  });
}

async function createEntry(body, userId) {
  const { brokerage, pospCommission, orgCommission } = calcFields(
    body.premium, body.commissionRate, body.pospShare
  );

  return prisma.pOSPIncentiveEntry.create({
    data: {
      pospMemberId:     Number(body.pospMemberId),
      policyId:         body.policyId ? Number(body.policyId) : null,
      isManual:         !body.policyId,
      entryDate:        new Date(body.entryDate),
      policyNumber:     String(body.policyNumber).trim(),
      customerName:     String(body.customerName).trim(),
      policyType:       body.policyType?.trim() || null,
      premium:          Number(body.premium),
      commissionRate:   Number(body.commissionRate),
      pospShare:        Number(body.pospShare),
      brokerage,
      pospCommission,
      orgCommission,
      paymentStatus:    body.paymentStatus || 'PENDING',
      invoiceReference: body.invoiceReference?.trim() || null,
      invoiceDate:      body.invoiceDate ? new Date(body.invoiceDate) : null,
      remarks:          body.remarks?.trim() || null,
      createdById:      userId,
    },
    include: { pospMember: { select: { id: true, name: true, code: true } } },
  });
}

async function updateEntry(id, body, userId) {
  const existing = await prisma.pOSPIncentiveEntry.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;

  const data = {};

  // Editable fields — recalculate financials if rate/share changed
  if (body.commissionRate !== undefined) data.commissionRate = Number(body.commissionRate);
  if (body.pospShare      !== undefined) data.pospShare      = Number(body.pospShare);

  // Recalculate when either rate or share changes
  const newCommissionRate = data.commissionRate ?? Number(existing.commissionRate);
  const newPospShare      = data.pospShare      ?? Number(existing.pospShare);
  const premiumForCalc    = Number(existing.premium);

  if (body.commissionRate !== undefined || body.pospShare !== undefined) {
    const { brokerage, pospCommission, orgCommission } = calcFields(
      premiumForCalc, newCommissionRate, newPospShare
    );
    data.brokerage      = brokerage;
    data.pospCommission = pospCommission;
    data.orgCommission  = orgCommission;
  }

  if (body.paymentStatus    !== undefined) data.paymentStatus    = body.paymentStatus;
  if (body.invoiceReference !== undefined) data.invoiceReference = body.invoiceReference?.trim() || null;
  if (body.invoiceDate      !== undefined) data.invoiceDate      = body.invoiceDate ? new Date(body.invoiceDate) : null;
  if (body.remarks          !== undefined) data.remarks          = body.remarks?.trim() || null;

  // Also allow updating non-financial fields for manual entries
  if (existing.isManual) {
    if (body.entryDate    !== undefined) data.entryDate    = new Date(body.entryDate);
    if (body.policyNumber !== undefined) data.policyNumber = String(body.policyNumber).trim();
    if (body.customerName !== undefined) data.customerName = String(body.customerName).trim();
    if (body.policyType   !== undefined) data.policyType   = body.policyType?.trim() || null;
    if (body.premium      !== undefined) {
      data.premium = Number(body.premium);
      const { brokerage, pospCommission, orgCommission } = calcFields(
        Number(body.premium), newCommissionRate, newPospShare
      );
      data.brokerage      = brokerage;
      data.pospCommission = pospCommission;
      data.orgCommission  = orgCommission;
    }
  }

  return prisma.pOSPIncentiveEntry.update({
    where: { id }, data,
    include: { pospMember: { select: { id: true, name: true, code: true } } },
  });
}

async function deleteEntry(id) {
  const existing = await prisma.pOSPIncentiveEntry.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;
  return prisma.pOSPIncentiveEntry.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

// ─── Excel import ─────────────────────────────────────────────────────────────

const { parseImportBuffer } = require('./posp.import.xlsx');

async function previewExcelImport(buffer) {
  // Parse only — no DB writes. Returns mode + groups + warnings so the UI can show a preview.
  return parseImportBuffer(buffer);
}

// ─── Generate a unique POSP member code from a name ──────────────────────────

async function generatePospCode(name) {
  // e.g. "Shalini D" → "SHAL", "Aruna Devi" → "ARUN"
  const base = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
  const exists = await prisma.pOSPMember.findFirst({ where: { code: base } });
  if (!exists) return base;
  for (let i = 1; i <= 99; i++) {
    const code = base + String(i).padStart(2, '0');
    const taken = await prisma.pOSPMember.findFirst({ where: { code } });
    if (!taken) return code;
  }
  // Fallback: timestamp suffix
  return base + Date.now().toString().slice(-4);
}

// ─── Find-or-create a POSP member by name (case-insensitive) ─────────────────

async function findOrCreatePospMember(name, userId) {
  // Try exact match first, then case-insensitive
  const existing = await prisma.pOSPMember.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, isDeleted: false },
  });
  if (existing) return { member: existing, isNew: false };

  const code = await generatePospCode(name);
  const member = await prisma.pOSPMember.create({
    data: {
      name,
      code,
      status:      'ACTIVE',
      createdById: userId,
    },
  });
  return { member, isNew: true };
}

// ─── Import rows for a single member (shared by both modes) ──────────────────

async function importRowsForMember(tx, rows, memberId, defaultPospShare, warnings) {
  const existingNumbers = await tx.pOSPIncentiveEntry.findMany({
    where:  { pospMemberId: memberId, isDeleted: false },
    select: { policyNumber: true },
  });
  const existingSet = new Set(existingNumbers.map((e) => e.policyNumber.trim().toLowerCase()));

  let imported = 0;
  let skipped  = 0;
  let totalPremium = 0, totalBrokerage = 0, totalPospCommission = 0, totalOrgCommission = 0;

  for (const row of rows) {
    const pnKey = row.policyNumber.trim().toLowerCase();
    if (existingSet.has(pnKey)) {
      warnings.push(`Policy "${row.policyNumber}" already exists for this POSP member — skipped.`);
      skipped++;
      continue;
    }

    const share = row.pospShare ?? defaultPospShare;
    let { brokerage, pospCommission, orgCommission } = row;

    if (brokerage === null || pospCommission === null || orgCommission === null) {
      const calc = calcFields(row.premium, row.commissionRate, share);
      if (brokerage      === null) brokerage      = calc.brokerage;
      if (pospCommission === null) pospCommission = calc.pospCommission;
      if (orgCommission  === null) orgCommission  = calc.orgCommission;
    }

    await tx.pOSPIncentiveEntry.create({
      data: {
        pospMemberId:     memberId,
        policyId:         null,
        isManual:         true,
        isImported:       true,
        entryDate:        row.entryDate,
        policyNumber:     row.policyNumber,
        customerName:     row.customerName,
        policyType:       row.policyType    || null,
        premium:          row.premium,
        commissionRate:   row.commissionRate,
        pospShare:        share,
        brokerage,
        pospCommission,
        orgCommission,
        paymentStatus:    row.paymentStatus,
        invoiceReference: row.invoiceReference || null,
        invoiceDate:      row.invoiceDate || null,
        remarks:          row.remarks || null,
        createdById:      tx._userId,  // set externally before call
      },
    });

    existingSet.add(pnKey);
    imported++;
    totalPremium        = round2(totalPremium        + row.premium);
    totalBrokerage      = round2(totalBrokerage      + brokerage);
    totalPospCommission = round2(totalPospCommission + pospCommission);
    totalOrgCommission  = round2(totalOrgCommission  + orgCommission);
  }

  return {
    imported, skipped,
    totals: { premium: totalPremium, brokerage: totalBrokerage, pospCommission: totalPospCommission, orgCommission: totalOrgCommission },
  };
}

async function importExcelEntries(buffer, { pospMemberId, defaultPospShare = 65 }, userId) {
  const parsed = await parseImportBuffer(buffer);
  const { mode, groups, warnings } = parsed;

  if (mode === 'grouped') {
    // ── Grouped mode: auto-create members, import per group ─────────────────
    const groupResults = [];
    let totalImported = 0;
    let totalSkipped  = 0;

    // Resolve / create all members first (outside transaction to avoid long locks)
    const resolvedGroups = [];
    for (const group of groups) {
      if (!group.memberName) {
        warnings.push(`${group.rows.length} rows have no Lead Source header — skipped.`);
        totalSkipped += group.rows.length;
        continue;
      }
      const { member, isNew } = await findOrCreatePospMember(group.memberName, userId);
      resolvedGroups.push({ group, member, isNew });
    }

    // Import each group in its own transaction
    for (const { group, member, isNew } of resolvedGroups) {
      const groupWarnings = [];
      const result = await prisma.$transaction(async (tx) => {
        tx._userId = userId;
        return importRowsForMember(tx, group.rows, member.id, defaultPospShare, groupWarnings);
      });

      warnings.push(...groupWarnings);
      totalImported += result.imported;
      totalSkipped  += result.skipped;
      groupResults.push({
        memberName: member.name,
        memberCode: member.code,
        memberId:   member.id,
        isNew,
        imported:   result.imported,
        skipped:    result.skipped,
        totals:     result.totals,
      });
    }

    // Overall totals
    const overall = groupResults.reduce(
      (acc, g) => ({
        premium:        round2(acc.premium        + g.totals.premium),
        brokerage:      round2(acc.brokerage      + g.totals.brokerage),
        pospCommission: round2(acc.pospCommission + g.totals.pospCommission),
        orgCommission:  round2(acc.orgCommission  + g.totals.orgCommission),
      }),
      { premium: 0, brokerage: 0, pospCommission: 0, orgCommission: 0 },
    );

    return { mode: 'grouped', imported: totalImported, skipped: totalSkipped, groups: groupResults, totals: overall, warnings };

  } else {
    // ── Single mode: pospMemberId required ───────────────────────────────────
    if (!pospMemberId) throw new Error('This file has no Lead Source sections. Please select a POSP member before importing.');
    const memberId = Number(pospMemberId);
    const member   = await prisma.pOSPMember.findUnique({ where: { id: memberId } });
    if (!member || member.isDeleted) throw new Error('POSP member not found.');

    const allRows = groups.flatMap((g) => g.rows);
    if (allRows.length === 0) return { mode: 'single', imported: 0, skipped: 0, warnings, totals: { premium: 0, brokerage: 0, pospCommission: 0, orgCommission: 0 } };

    const singleWarnings = [];
    const result = await prisma.$transaction(async (tx) => {
      tx._userId = userId;
      return importRowsForMember(tx, allRows, memberId, defaultPospShare, singleWarnings);
    });
    warnings.push(...singleWarnings);

    return { mode: 'single', imported: result.imported, skipped: result.skipped, warnings, totals: result.totals };
  }
}

// ─── Report data (for reports page + Excel export) ────────────────────────────

async function getReportData({ pospMemberId, fy, month, paymentStatus }) {
  const memberId = pospMemberId ? Number(pospMemberId) : null;
  const member = memberId
    ? await prisma.pOSPMember.findUnique({ where: { id: memberId }, select: { id: true, name: true, code: true } })
    : null;

  const result = await listEntries({ pospMemberId, fy, month, paymentStatus, limit: 1000 });

  return {
    member,
    fy:     fy    || null,
    month:  month || null,
    entries: result.entries,
    summary: result.summary,
  };
}

module.exports = {
  listMembers, listAllActiveMembers, getMemberById,
  createMember, updateMember, deleteMember,
  suggestPolicies, bulkCreateEntries,
  searchPoliciesForLink,
  listEntries, getEntryById, createEntry, updateEntry, deleteEntry,
  previewExcelImport, importExcelEntries,
  getReportData,
  calcFields,
};
