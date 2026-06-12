const prisma = require('../../config/prisma');

// ─── Calculation ────────────────────────────────────────────────────────────

const DEFAULT_POINT_VALUE = 0.50;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizePointValue(val) {
  if (val === undefined || val === null || val === '') return DEFAULT_POINT_VALUE;
  return Number(val);
}

function calcIncentiveAmount({ points, pointValue }) {
  return round2(Number(points) * normalizePointValue(pointValue));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const INCENTIVE_INCLUDE = {
  leadMember: { select: { id: true, name: true, leadType: true, active: true } },
  createdBy: { select: { id: true, name: true } },
};

const DELETED_INCENTIVE_INCLUDE = {
  ...INCENTIVE_INCLUDE,
  deletedBy: { select: { id: true, name: true } },
};

async function assertLeadExecutive(leadMemberId) {
  const leadMember = await prisma.leadMember.findUnique({ where: { id: Number(leadMemberId) } });
  if (!leadMember) {
    const err = new Error('Lead member not found.');
    err.status = 404;
    throw err;
  }
  if (leadMember.leadType !== 'LEAD_EXECUTIVE') {
    const err = new Error('leadMemberId must reference a Lead Executive.');
    err.status = 400;
    err.validationErrors = ['leadMemberId must reference a Lead Executive.'];
    throw err;
  }
  return leadMember;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

async function create(body, userId) {
  await assertLeadExecutive(body.leadMemberId);

  const points = Number(body.points);
  const pointValue = normalizePointValue(body.pointValue);
  const incentiveAmount = calcIncentiveAmount({ points, pointValue });

  return prisma.incentive.create({
    data: {
      leadMemberId: Number(body.leadMemberId),
      month: body.month,
      points,
      pointValue,
      incentiveAmount,
      remarks: body.remarks?.trim() || null,
      createdById: userId,
    },
    include: INCENTIVE_INCLUDE,
  });
}

async function list({ leadMemberId, month, year, page = 1, limit = 20 } = {}) {
  const where = { isDeleted: false };

  if (leadMemberId) where.leadMemberId = Number(leadMemberId);
  if (month) where.month = month;
  else if (year) where.month = { startsWith: `${year}-` };

  const skip = (page - 1) * limit;

  const [incentives, total] = await Promise.all([
    prisma.incentive.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ month: 'desc' }, { id: 'desc' }],
      include: INCENTIVE_INCLUDE,
    }),
    prisma.incentive.count({ where }),
  ]);

  return { incentives, total };
}

async function getById(id) {
  const incentive = await prisma.incentive.findUnique({ where: { id }, include: INCENTIVE_INCLUDE });
  if (!incentive || incentive.isDeleted) return null;
  return incentive;
}

async function update(id, body, userId) {
  const existing = await prisma.incentive.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;

  const leadMemberId = body.leadMemberId !== undefined ? Number(body.leadMemberId) : existing.leadMemberId;
  if (body.leadMemberId !== undefined) await assertLeadExecutive(leadMemberId);

  const points = body.points !== undefined ? Number(body.points) : Number(existing.points);
  const pointValue = body.pointValue !== undefined ? normalizePointValue(body.pointValue) : Number(existing.pointValue);
  const incentiveAmount = calcIncentiveAmount({ points, pointValue });

  return prisma.incentive.update({
    where: { id },
    data: {
      leadMemberId,
      month: body.month ?? existing.month,
      points,
      pointValue,
      incentiveAmount,
      remarks: 'remarks' in body ? (body.remarks?.trim() || null) : existing.remarks,
      createdById: userId,
    },
    include: INCENTIVE_INCLUDE,
  });
}

async function remove(id, userId) {
  const existing = await prisma.incentive.findUnique({ where: { id } });
  if (!existing || existing.isDeleted) return null;

  return prisma.incentive.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: userId,
    },
    include: INCENTIVE_INCLUDE,
  });
}

async function listDeleted({ leadMemberId, month, year, page = 1, limit = 20 } = {}) {
  const where = { isDeleted: true };

  if (leadMemberId) where.leadMemberId = Number(leadMemberId);
  if (month) where.month = month;
  else if (year) where.month = { startsWith: `${year}-` };

  const skip = (page - 1) * limit;

  const [incentives, total] = await Promise.all([
    prisma.incentive.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ deletedAt: 'desc' }],
      include: DELETED_INCENTIVE_INCLUDE,
    }),
    prisma.incentive.count({ where }),
  ]);

  return { incentives, total };
}

async function restore(id) {
  const existing = await prisma.incentive.findUnique({ where: { id } });
  if (!existing || !existing.isDeleted) return null;

  return prisma.incentive.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
    },
    include: INCENTIVE_INCLUDE,
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function executiveWiseReport({ year, leadMemberId } = {}) {
  const where = { isDeleted: false };
  if (leadMemberId) where.leadMemberId = Number(leadMemberId);
  if (year) where.month = { startsWith: `${year}-` };

  const incentives = await prisma.incentive.findMany({
    where,
    include: INCENTIVE_INCLUDE,
    orderBy: [{ month: 'asc' }],
  });

  const byExecutive = new Map();
  for (const inc of incentives) {
    const key = inc.leadMemberId;
    if (!byExecutive.has(key)) {
      byExecutive.set(key, {
        leadMemberId: key,
        leadMemberName: inc.leadMember.name,
        active: inc.leadMember.active,
        totalPoints: 0,
        totalIncentiveAmount: 0,
        months: [],
      });
    }
    const entry = byExecutive.get(key);
    entry.totalPoints = round2(entry.totalPoints + Number(inc.points));
    entry.totalIncentiveAmount = round2(entry.totalIncentiveAmount + Number(inc.incentiveAmount));
    entry.months.push({
      month: inc.month,
      points: Number(inc.points),
      pointValue: Number(inc.pointValue),
      incentiveAmount: Number(inc.incentiveAmount),
    });
  }

  return Array.from(byExecutive.values()).sort((a, b) => a.leadMemberName.localeCompare(b.leadMemberName));
}

async function monthWiseReport({ year, leadMemberId } = {}) {
  const where = { isDeleted: false };
  if (leadMemberId) where.leadMemberId = Number(leadMemberId);
  if (year) where.month = { startsWith: `${year}-` };

  const incentives = await prisma.incentive.findMany({
    where,
    include: INCENTIVE_INCLUDE,
    orderBy: [{ month: 'asc' }],
  });

  const byMonth = new Map();
  for (const inc of incentives) {
    const key = inc.month;
    if (!byMonth.has(key)) {
      byMonth.set(key, {
        month: key,
        totalPoints: 0,
        totalIncentiveAmount: 0,
        executives: [],
      });
    }
    const entry = byMonth.get(key);
    entry.totalPoints = round2(entry.totalPoints + Number(inc.points));
    entry.totalIncentiveAmount = round2(entry.totalIncentiveAmount + Number(inc.incentiveAmount));
    entry.executives.push({
      leadMemberId: inc.leadMemberId,
      leadMemberName: inc.leadMember.name,
      points: Number(inc.points),
      pointValue: Number(inc.pointValue),
      incentiveAmount: Number(inc.incentiveAmount),
    });
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

module.exports = {
  create, list, getById, update, remove, listDeleted, restore,
  executiveWiseReport, monthWiseReport,
  calcIncentiveAmount, normalizePointValue, round2, DEFAULT_POINT_VALUE,
};
