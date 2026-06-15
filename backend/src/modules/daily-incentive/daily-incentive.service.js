const prisma = require('../../config/prisma');

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

const ENTRY_INCLUDE = {
  employee: { select: { id: true, name: true, leadType: true, active: true } },
  createdBy: { select: { id: true, name: true } },
};

// ─── Settings (singleton, id = 1) ──────────────────────────────────────────
// All point values default to 0 — no business rules are hardcoded. Admin
// must configure these via PUT before entries produce non-zero calculations.

async function getSettings() {
  const settings = await prisma.incentiveSetting.findUnique({ where: { id: 1 } });
  if (settings) return settings;

  return prisma.incentiveSetting.create({
    data: {
      id: 1,
      touchBasePoints: 0,
      interestedPoints: 0,
      followUpPoints: 0,
      conversionPoints: 0,
      amountPerPoint: 0,
    },
  });
}

async function updateSettings(body) {
  const current = await getSettings();

  const data = {
    touchBasePoints: body.touchBasePoints !== undefined ? Number(body.touchBasePoints) : current.touchBasePoints,
    interestedPoints: body.interestedPoints !== undefined ? Number(body.interestedPoints) : current.interestedPoints,
    followUpPoints: body.followUpPoints !== undefined ? Number(body.followUpPoints) : current.followUpPoints,
    conversionPoints: body.conversionPoints !== undefined ? Number(body.conversionPoints) : current.conversionPoints,
    amountPerPoint: body.amountPerPoint !== undefined ? Number(body.amountPerPoint) : current.amountPerPoint,
  };

  return prisma.incentiveSetting.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

// ─── Calculation ────────────────────────────────────────────────────────────

function calcPointsAndAmount({ touchBase, interested, followUp, conversion }, settings) {
  const points = round2(
    Number(touchBase) * Number(settings.touchBasePoints) +
    Number(interested) * Number(settings.interestedPoints) +
    Number(followUp) * Number(settings.followUpPoints) +
    Number(conversion) * Number(settings.conversionPoints)
  );
  const amount = round2(points * Number(settings.amountPerPoint));
  return { points, amount };
}

// ─── Entry CRUD ─────────────────────────────────────────────────────────────

async function create(body, userId) {
  const settings = await getSettings();
  const { points, amount } = calcPointsAndAmount(body, settings);

  return prisma.incentiveEntry.create({
    data: {
      employeeId: Number(body.employeeId),
      date: new Date(body.date),
      totalCalls: Number(body.totalCalls),
      touchBase: Number(body.touchBase),
      interested: Number(body.interested),
      followUp: Number(body.followUp),
      conversion: Number(body.conversion),
      calculatedPoints: points,
      calculatedAmount: amount,
      remarks: body.remarks?.trim() || null,
      createdById: userId,
    },
    include: ENTRY_INCLUDE,
  });
}

async function list({ employeeId, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
  const where = {};
  if (employeeId) where.employeeId = Number(employeeId);
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.incentiveEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: ENTRY_INCLUDE,
    }),
    prisma.incentiveEntry.count({ where }),
  ]);

  return { entries, total };
}

async function getById(id) {
  return prisma.incentiveEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
}

async function update(id, body, userId) {
  const existing = await prisma.incentiveEntry.findUnique({ where: { id } });
  if (!existing) return null;

  const merged = {
    employeeId: body.employeeId !== undefined ? Number(body.employeeId) : existing.employeeId,
    date: body.date !== undefined ? new Date(body.date) : existing.date,
    totalCalls: body.totalCalls !== undefined ? Number(body.totalCalls) : existing.totalCalls,
    touchBase: body.touchBase !== undefined ? Number(body.touchBase) : existing.touchBase,
    interested: body.interested !== undefined ? Number(body.interested) : existing.interested,
    followUp: body.followUp !== undefined ? Number(body.followUp) : existing.followUp,
    conversion: body.conversion !== undefined ? Number(body.conversion) : existing.conversion,
    remarks: 'remarks' in body ? (body.remarks?.trim() || null) : existing.remarks,
  };

  const settings = await getSettings();
  const { points, amount } = calcPointsAndAmount(merged, settings);

  return prisma.incentiveEntry.update({
    where: { id },
    data: {
      employeeId: merged.employeeId,
      date: merged.date,
      totalCalls: merged.totalCalls,
      touchBase: merged.touchBase,
      interested: merged.interested,
      followUp: merged.followUp,
      conversion: merged.conversion,
      calculatedPoints: points,
      calculatedAmount: amount,
      remarks: merged.remarks,
      createdById: userId,
    },
    include: ENTRY_INCLUDE,
  });
}

async function remove(id) {
  const existing = await prisma.incentiveEntry.findUnique({ where: { id } });
  if (!existing) return null;

  await prisma.incentiveEntry.delete({ where: { id } });
  return existing;
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

async function weeklyReport({ weekStart, weekEnd, employeeId } = {}) {
  const where = {
    date: {
      gte: new Date(weekStart),
      lte: new Date(weekEnd),
    },
  };
  if (employeeId) where.employeeId = Number(employeeId);

  const entries = await prisma.incentiveEntry.findMany({
    where,
    include: ENTRY_INCLUDE,
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
  });

  const byEmployee = new Map();
  for (const e of entries) {
    const key = e.employeeId;
    if (!byEmployee.has(key)) {
      byEmployee.set(key, {
        employeeId: key,
        employeeName: e.employee.name,
        active: e.employee.active,
        totalCalls: 0,
        touchBase: 0,
        interested: 0,
        followUp: 0,
        conversion: 0,
        totalPoints: 0,
        totalIncentiveAmount: 0,
        entries: [],
      });
    }
    const row = byEmployee.get(key);
    row.totalCalls += e.totalCalls;
    row.touchBase += e.touchBase;
    row.interested += e.interested;
    row.followUp += e.followUp;
    row.conversion += e.conversion;
    row.totalPoints = round2(row.totalPoints + Number(e.calculatedPoints));
    row.totalIncentiveAmount = round2(row.totalIncentiveAmount + Number(e.calculatedAmount));
    row.entries.push({
      id: e.id,
      date: e.date,
      totalCalls: e.totalCalls,
      touchBase: e.touchBase,
      interested: e.interested,
      followUp: e.followUp,
      conversion: e.conversion,
      calculatedPoints: Number(e.calculatedPoints),
      calculatedAmount: Number(e.calculatedAmount),
      remarks: e.remarks,
    });
  }

  const rows = Array.from(byEmployee.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  const overall = rows.reduce((acc, r) => ({
    totalCalls: acc.totalCalls + r.totalCalls,
    touchBase: acc.touchBase + r.touchBase,
    interested: acc.interested + r.interested,
    followUp: acc.followUp + r.followUp,
    conversion: acc.conversion + r.conversion,
    totalPoints: round2(acc.totalPoints + r.totalPoints),
    totalIncentiveAmount: round2(acc.totalIncentiveAmount + r.totalIncentiveAmount),
  }), { totalCalls: 0, touchBase: 0, interested: 0, followUp: 0, conversion: 0, totalPoints: 0, totalIncentiveAmount: 0 });

  return { weekStart, weekEnd, employees: rows, overall };
}

module.exports = {
  getSettings, updateSettings,
  create, list, getById, update, remove,
  weeklyReport,
  calcPointsAndAmount, round2,
};
