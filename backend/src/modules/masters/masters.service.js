const prisma = require('../../config/prisma');

// ─── Insurers ─────────────────────────────────────────────────────────────────

const listInsurers = ({ activeOnly = true } = {}) =>
  prisma.insurer.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, active: true },
  });

const createInsurer = (data) =>
  prisma.insurer.create({
    data: { name: data.name.trim(), active: data.active ?? true },
    select: { id: true, name: true, active: true },
  });

const updateInsurer = (id, data) =>
  prisma.insurer.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.active !== undefined && { active: data.active }),
    },
    select: { id: true, name: true, active: true },
  });

// ─── Products ─────────────────────────────────────────────────────────────────

const listProducts = ({ insurerId, activeOnly = true } = {}) =>
  prisma.product.findMany({
    where: {
      ...(insurerId && { insurerId }),
      ...(activeOnly && { active: true }),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, active: true, insurerId: true,
      insurer: { select: { id: true, name: true } },
    },
  });

const createProduct = (data) =>
  prisma.product.create({
    data: {
      name: data.name.trim(),
      insurerId: data.insurerId,
      active: data.active ?? true,
    },
    select: { id: true, name: true, active: true, insurerId: true },
  });

const updateProduct = (id, data) =>
  prisma.product.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.active !== undefined && { active: data.active }),
    },
    select: { id: true, name: true, active: true, insurerId: true },
  });

// ─── Lead Members ─────────────────────────────────────────────────────────────

const listLeadMembers = ({ leadType, activeOnly = true } = {}) =>
  prisma.leadMember.findMany({
    where: {
      ...(leadType && { leadType }),
      ...(activeOnly && { active: true }),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, leadType: true, active: true },
  });

const createLeadMember = (data) =>
  prisma.leadMember.create({
    data: {
      name: data.name.trim(),
      leadType: data.leadType,
      active: data.active ?? true,
    },
    select: { id: true, name: true, leadType: true, active: true },
  });

const updateLeadMember = (id, data) =>
  prisma.leadMember.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.leadType && { leadType: data.leadType }),
      ...(data.active !== undefined && { active: data.active }),
    },
    select: { id: true, name: true, leadType: true, active: true },
  });

module.exports = {
  listInsurers, createInsurer, updateInsurer,
  listProducts, createProduct, updateProduct,
  listLeadMembers, createLeadMember, updateLeadMember,
};
