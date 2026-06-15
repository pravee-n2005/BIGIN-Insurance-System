const test = require('node:test');
const assert = require('node:assert');

const prisma = require('../../config/prisma');
const service = require('./daily-incentive.service');

let employeeId;
let adminUserId;
let createdEntryId;

test('setup — find a lead member and admin user', async () => {
  const employee = await prisma.leadMember.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  assert.ok(employee, 'expected at least one lead member to exist');
  assert.ok(admin, 'expected at least one admin user to exist');

  employeeId = employee.id;
  adminUserId = admin.id;
});

test('getSettings() returns a singleton row defaulting to zero', async () => {
  const settings = await service.getSettings();

  assert.strictEqual(settings.id, 1);
  assert.strictEqual(Number(settings.touchBasePoints), 0);
  assert.strictEqual(Number(settings.interestedPoints), 0);
  assert.strictEqual(Number(settings.followUpPoints), 0);
  assert.strictEqual(Number(settings.conversionPoints), 0);
  assert.strictEqual(Number(settings.amountPerPoint), 0);
});

test('updateSettings() persists configurable point values', async () => {
  const settings = await service.updateSettings({
    touchBasePoints: 1,
    interestedPoints: 2,
    followUpPoints: 3,
    conversionPoints: 5,
    amountPerPoint: 10,
  });

  assert.strictEqual(Number(settings.touchBasePoints), 1);
  assert.strictEqual(Number(settings.interestedPoints), 2);
  assert.strictEqual(Number(settings.followUpPoints), 3);
  assert.strictEqual(Number(settings.conversionPoints), 5);
  assert.strictEqual(Number(settings.amountPerPoint), 10);
});

test('calcPointsAndAmount() applies configured settings, not hardcoded values', async () => {
  const settings = await service.getSettings();

  const { points, amount } = service.calcPointsAndAmount(
    { touchBase: 2, interested: 1, followUp: 1, conversion: 1 },
    settings
  );

  // points = (2*1) + (1*2) + (1*3) + (1*5) = 12
  assert.strictEqual(points, 12);
  // amount = 12 * 10 = 120
  assert.strictEqual(amount, 120);
});

test('create() stores frozen calculatedPoints/calculatedAmount', async () => {
  const entry = await service.create({
    employeeId,
    date: '2026-06-01',
    totalCalls: 50,
    touchBase: 2,
    interested: 1,
    followUp: 1,
    conversion: 1,
    remarks: 'test entry',
  }, adminUserId);

  createdEntryId = entry.id;

  assert.strictEqual(Number(entry.calculatedPoints), 12);
  assert.strictEqual(Number(entry.calculatedAmount), 120);
  assert.strictEqual(entry.employee.id, employeeId);
});

test('changing settings after create does not retroactively alter the stored entry', async () => {
  await service.updateSettings({ amountPerPoint: 100 });

  const entry = await service.getById(createdEntryId);
  assert.strictEqual(Number(entry.calculatedAmount), 120);

  // restore for subsequent tests
  await service.updateSettings({ amountPerPoint: 10 });
});

test('list() returns the created entry', async () => {
  const { entries, total } = await service.list({ employeeId, page: 1, limit: 20 });

  assert.ok(total >= 1);
  assert.ok(entries.some((e) => e.id === createdEntryId));
});

test('update() recomputes calculated fields using current settings', async () => {
  const updated = await service.update(createdEntryId, { touchBase: 3 }, adminUserId);

  // points = (3*1) + (1*2) + (1*3) + (1*5) = 13
  assert.strictEqual(Number(updated.calculatedPoints), 13);
  assert.strictEqual(Number(updated.calculatedAmount), 130);
});

test('weeklyReport() aggregates totals for the date range', async () => {
  const report = await service.weeklyReport({
    weekStart: '2026-06-01',
    weekEnd: '2026-06-07',
    employeeId,
  });

  assert.ok(report.employees.length >= 1);
  const row = report.employees.find((r) => r.employeeId === employeeId);
  assert.ok(row);
  assert.ok(row.totalPoints >= 13);
  assert.ok(row.totalIncentiveAmount >= 130);
});

test('weeklyReport() without employeeId aggregates across all employees', async () => {
  const report = await service.weeklyReport({
    weekStart: '2026-06-01',
    weekEnd: '2026-06-07',
  });

  const row = report.employees.find((r) => r.employeeId === employeeId);
  assert.ok(row, 'expected the test employee to appear in the unfiltered report');
  assert.ok(row.totalPoints >= 13);
  assert.ok(report.overall.totalPoints >= row.totalPoints);
});

test('cleanup — remove created entry and reset settings', async () => {
  await service.remove(createdEntryId);
  await service.updateSettings({
    touchBasePoints: 0,
    interestedPoints: 0,
    followUpPoints: 0,
    conversionPoints: 0,
    amountPerPoint: 0,
  });

  const entry = await service.getById(createdEntryId);
  assert.strictEqual(entry, null);
});

test('daily incentive — cleanup', async () => {
  await prisma.$disconnect();
});
