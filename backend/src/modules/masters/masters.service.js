const prisma = require('../../config/prisma');

const INSURER_SELECT = {
  id: true, name: true, insurerType: true, gstin: true, state: true,
  active: true, createdAt: true, updatedAt: true,
};

const PRODUCT_SELECT = {
  id: true, name: true, insurerId: true, insuranceCategory: true,
  active: true, createdAt: true, updatedAt: true,
  insurer: { select: { id: true, name: true, insurerType: true } },
};

const LEAD_MEMBER_SELECT = {
  id: true, name: true, leadType: true, active: true,
  createdAt: true, updatedAt: true,
};

// ─── Insurers ─────────────────────────────────────────────────────────────────

const listInsurers = ({ activeOnly = true, insurerType } = {}) =>
  prisma.insurer.findMany({
    where: {
      ...(activeOnly  && { active: true }),
      ...(insurerType && { insurerType }),
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: INSURER_SELECT,
  });

const getInsurer = (id) =>
  prisma.insurer.findUnique({ where: { id }, select: INSURER_SELECT });

const createInsurer = (data) =>
  prisma.insurer.create({
    data: {
      name:        data.name.trim(),
      insurerType: data.insurerType ?? null,
      gstin:       data.gstin?.trim().toUpperCase() || null,
      state:       data.state?.trim() || null,
      active:      data.active ?? true,
    },
    select: INSURER_SELECT,
  });

const updateInsurer = (id, data) =>
  prisma.insurer.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name: data.name.trim() }),
      ...('insurerType'    in data       && { insurerType: data.insurerType || null }),
      ...('gstin'          in data       && { gstin: data.gstin?.trim().toUpperCase() || null }),
      ...('state'          in data       && { state: data.state?.trim() || null }),
      ...(data.active      !== undefined && { active: data.active }),
    },
    select: INSURER_SELECT,
  });

const setInsurerActive = (id, active) =>
  prisma.insurer.update({ where: { id }, data: { active }, select: INSURER_SELECT });

// ─── Products ─────────────────────────────────────────────────────────────────

const listProducts = ({ insurerId, activeOnly = true, insuranceCategory } = {}) =>
  prisma.product.findMany({
    where: {
      ...(insurerId         && { insurerId }),
      ...(activeOnly        && { active: true }),
      ...(insuranceCategory && { insuranceCategory }),
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: PRODUCT_SELECT,
  });

const getProduct = (id) =>
  prisma.product.findUnique({ where: { id }, select: PRODUCT_SELECT });

const createProduct = (data) =>
  prisma.product.create({
    data: {
      name:              data.name.trim(),
      insurerId:         Number(data.insurerId),
      insuranceCategory: data.insuranceCategory ?? null,
      active:            data.active ?? true,
    },
    select: PRODUCT_SELECT,
  });

const updateProduct = (id, data) =>
  prisma.product.update({
    where: { id },
    data: {
      ...(data.name              !== undefined && { name: data.name.trim() }),
      ...('insuranceCategory'    in data       && { insuranceCategory: data.insuranceCategory || null }),
      ...(data.active            !== undefined && { active: data.active }),
    },
    select: PRODUCT_SELECT,
  });

const setProductActive = (id, active) =>
  prisma.product.update({ where: { id }, data: { active }, select: PRODUCT_SELECT });

// ─── Lead Members ─────────────────────────────────────────────────────────────

const listLeadMembers = ({ leadType, activeOnly = true } = {}) =>
  prisma.leadMember.findMany({
    where: {
      ...(leadType   && { leadType }),
      ...(activeOnly && { active: true }),
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: LEAD_MEMBER_SELECT,
  });

const getLeadMember = (id) =>
  prisma.leadMember.findUnique({ where: { id }, select: LEAD_MEMBER_SELECT });

const createLeadMember = (data) =>
  prisma.leadMember.create({
    data: {
      name:     data.name.trim(),
      leadType: data.leadType,
      active:   data.active ?? true,
    },
    select: LEAD_MEMBER_SELECT,
  });

const updateLeadMember = (id, data) =>
  prisma.leadMember.update({
    where: { id },
    data: {
      ...(data.name     !== undefined && { name: data.name.trim() }),
      ...(data.leadType !== undefined && { leadType: data.leadType }),
      ...(data.active   !== undefined && { active: data.active }),
    },
    select: LEAD_MEMBER_SELECT,
  });

const setLeadMemberActive = (id, active) =>
  prisma.leadMember.update({ where: { id }, data: { active }, select: LEAD_MEMBER_SELECT });

module.exports = {
  listInsurers, getInsurer, createInsurer, updateInsurer, setInsurerActive,
  listProducts, getProduct, createProduct, updateProduct, setProductActive,
  listLeadMembers, getLeadMember, createLeadMember, updateLeadMember, setLeadMemberActive,
};
