import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, Input, Select, Textarea, SectionHeading } from './FormField';
import { fetchAllInsurers, fetchAllProductsByInsurer, fetchLeadMembers } from '../api/masters';

const CATEGORIES     = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const FREQUENCIES    = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const FREQUENCY_LABELS = {
  MONTHLY: 'MONTHLY', QUARTERLY: 'QUARTERLY', HALF_YEARLY: 'HALF YEARLY', YEARLY: 'YEARLY',
};

const TERM_OPTIONS = [
  { value: 1,  label: '1 YEAR'  },
  { value: 2,  label: '2 YEARS' },
  { value: 3,  label: '3 YEARS' },
  { value: 4,  label: '4 YEARS' },
  { value: 5,  label: '5 YEARS' },
  { value: 10, label: '10 YEARS' },
  { value: 15, label: '15 YEARS' },
];
const STATUSES       = ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];
const PAYMENT_MODES  = ['ONLINE', 'CARD', 'UPI', 'CHEQUE', 'BNPL', 'FINSALL', 'FIBE', 'CC', 'BIMAPAY'];

const CANCELLATION_REASONS = [
  { value: 'CUSTOMER_DECLINED',               label: 'Customer Declined' },
  { value: 'CUSTOMER_REQUESTED_CANCELLATION', label: 'Customer Requested Cancellation' },
  { value: 'PREMIUM_TOO_HIGH',                label: 'Premium Too High' },
  { value: 'CUSTOMER_PURCHASED_ELSEWHERE',    label: 'Customer Purchased Elsewhere' },
  { value: 'CUSTOMER_NOT_REACHABLE',          label: 'Customer Not Reachable' },
  { value: 'POLICY_ISSUED_INCORRECTLY',       label: 'Policy Issued Incorrectly' },
  { value: 'WRONG_POLICY_DETAILS',            label: 'Wrong Policy Details' },
  { value: 'KYC_DOCUMENTS_NOT_PROVIDED',      label: 'KYC Documents Not Provided' },
  { value: 'INSURER_REJECTED_PROPOSAL',       label: 'Insurer Rejected Proposal' },
  { value: 'PAYMENT_NOT_RECEIVED',            label: 'Payment Not Received' },
  { value: 'PROPOSAL_EXPIRED',                label: 'Proposal Expired' },
  { value: 'POLICY_REPLACED',                 label: 'Policy Replaced' },
  { value: 'RENEWAL_NOT_PROCEEDED',           label: 'Renewal Not Proceeded' },
  { value: 'DUPLICATE_ENTRY',                 label: 'Duplicate Entry' },
  { value: 'DUPLICATE_POLICY_IMPORTED',       label: 'Duplicate Policy (Imported)' },
  { value: 'TEST_DUMMY_ENTRY',                label: 'Test / Dummy Entry' },
  { value: 'OTHER',                           label: 'Other (specify below)' },
];

// Synthetic dropdown option used when a policy's stored insurerName/productName
// doesn't match any (active or inactive) master record — keeps the field's
// current value visible instead of showing a blank "Select…" placeholder.
const CUSTOM_OPTION_VALUE = '__custom__';

const EMPTY = {
  insurerName: '',
  insuranceCategory: '',
  productName: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  policyNumber: '',
  issueDate: '',
  paymentFrequency: 'YEARLY',
  term: '',
  status: 'ACTIVE',
  grossPremium: '',
  netPremium: '',
  gstPercent: '18',
  commissionPercent: '',
  tdsPercent: '10',
  leadSource: '',
  paymentMode: '',
  invoiceNumber: '',
  invoiceDate: '',
  creditedDate: '',
  remarks: '',
  cancellationReason: '',
  cancellationReasonOther: '',
};

// Normalise a date coming from the API (ISO string) to yyyy-MM-dd for <input type="date">
function toDateInput(val) {
  if (!val) return '';
  return val.slice(0, 10);
}

// Decimal-safe rounding to 2 places — mirrors round2() in policy.service.js
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Blank Commission %/TDS % is treated as 0% — mirrors normalizePercent() in policy.service.js
function normalizePercent(val) {
  if (val === '' || val === null || val === undefined) return 0;
  return Number(val);
}

const fmtMoney = (n) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mirrors calcFinancials() in policy.service.js — same formula, same rounding,
// so the live preview always matches what the server will persist.
function calcFinancials({ netPremium, gstPercent, commissionPercent, tdsPercent }) {
  const net = Number(netPremium) || 0;
  const gstPct = normalizePercent(gstPercent);
  const commPct = normalizePercent(commissionPercent);
  const tdsPct = normalizePercent(tdsPercent);

  const gstAmount = round2(net * gstPct / 100);
  const commissionAmount = round2(net * commPct / 100);
  const tdsAmount = round2(commissionAmount * tdsPct / 100);
  const finalReceivable = round2(commissionAmount - tdsAmount);

  return { gstAmount, commissionAmount, tdsAmount, finalReceivable };
}

export default function PolicyForm({ initialData, onSubmit, submitLabel = 'Save Policy' }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...Object.fromEntries(
      Object.entries(initialData ?? {}).map(([k, v]) => {
        if (['issueDate', 'invoiceDate', 'creditedDate'].includes(k)) return [k, toDateInput(v)];
        if (v === null || v === undefined) return [k, ''];
        return [k, String(v)];
      })
    ),
  }));

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError]  = useState('');
  const [success, setSuccess]          = useState(false);
  const [loading, setLoading]          = useState(false);

  // ── Master dropdown data (loaded from /api/masters/*) ────────────────────
  const [insurers, setInsurers]       = useState([]);
  const [products, setProducts]       = useState([]);
  const [leadMembers, setLeadMembers] = useState([]);

  // Dropdown selections (parallel to free-text form fields)
  // Initial values: try to match initialData strings against loaded masters.
  const [selectedInsurerId, setSelectedInsurerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLeadType, setSelectedLeadType]   = useState('POSP');
  const [selectedLeadMemberId, setSelectedLeadMemberId] = useState('');

  // Load insurers on mount. Fetch active + inactive so that policies created
  // against an insurer that has since been deactivated still pre-select and
  // display correctly when edited.
  useEffect(() => {
    fetchAllInsurers()
      .then((list) => {
        setInsurers(list);
        // Pre-select insurer if editing
        if (form.insurerName) {
          const match = list.find((i) => i.name === form.insurerName);
          // No master record matches this policy's insurerName (e.g. legacy
          // imported data) — fall back to a synthetic "current value" option
          // so the dropdown still shows it instead of appearing blank.
          setSelectedInsurerId(match ? String(match.id) : CUSTOM_OPTION_VALUE);
        }
      })
      .catch(() => {/* silent — falls back to free-text */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load products when insurer changes. Fetch active + inactive for the same
  // reason as insurers above — an existing policy's product may have been
  // deactivated since it was created.
  useEffect(() => {
    if (!selectedInsurerId) { setProducts([]); return; }
    if (selectedInsurerId === CUSTOM_OPTION_VALUE) {
      // Insurer itself isn't a master record, so there's nothing to fetch
      // products against — just show the policy's existing product as-is.
      setProducts([]);
      if (form.productName) setSelectedProductId(CUSTOM_OPTION_VALUE);
      return;
    }
    fetchAllProductsByInsurer(selectedInsurerId)
      .then((list) => {
        setProducts(list);
        if (form.productName) {
          const match = list.find((p) => p.name === form.productName);
          // No product master record matches this policy's productName under
          // the matched insurer (very common for legacy imported policies) —
          // fall back to a synthetic "current value" option.
          setSelectedProductId(match ? String(match.id) : CUSTOM_OPTION_VALUE);
        }
      })
      .catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInsurerId]);

  // Pre-detect leadType from existing leadSource (for edit mode)
  // and load lead members for the selected type.
  useEffect(() => {
    // If editing and leadSource is non-empty, try to detect type by lookup across all 3 tiers
    if (form.leadSource && !selectedLeadMemberId) {
      Promise.all([
        fetchLeadMembers('POSP'),
        fetchLeadMembers('LEAD_EXECUTIVE'),
        fetchLeadMembers('LEADERSHIP'),
      ])
        .then(([posp, leadExec, leadership]) => {
          const tiers = [
            { type: 'POSP',           list: posp },
            { type: 'LEAD_EXECUTIVE', list: leadExec },
            { type: 'LEADERSHIP',     list: leadership },
          ];
          for (const { type, list } of tiers) {
            const match = list.find((m) => m.name === form.leadSource);
            if (match) {
              setSelectedLeadType(type);
              setLeadMembers(list);
              setSelectedLeadMemberId(String(match.id));
              return;
            }
          }
          // No match — show current selected type's list (default POSP)
          setLeadMembers(posp);
        })
        .catch(() => {});
    } else {
      fetchLeadMembers(selectedLeadType).then(setLeadMembers).catch(() => setLeadMembers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadType]);

  // ── Dropdown handlers: write through to form's string fields ─────────────
  function handleInsurerChange(idStr) {
    // The "current value" placeholder is only ever shown as the already-
    // selected option — re-selecting it is a no-op so we never wipe out the
    // policy's existing insurerName/productName.
    if (idStr === CUSTOM_OPTION_VALUE) return;
    setSelectedInsurerId(idStr);
    setSelectedProductId('');                              // reset cascade
    const insurer = insurers.find((i) => String(i.id) === idStr);
    setForm((f) => ({ ...f, insurerName: insurer?.name ?? '', productName: '' }));
  }

  function handleProductChange(idStr) {
    if (idStr === CUSTOM_OPTION_VALUE) return;
    setSelectedProductId(idStr);
    const product = products.find((p) => String(p.id) === idStr);
    setForm((f) => ({ ...f, productName: product?.name ?? '' }));
  }

  function handleLeadTypeChange(newType) {
    setSelectedLeadType(newType);
    setSelectedLeadMemberId('');
    setForm((f) => ({ ...f, leadSource: '' }));
  }

  function handleLeadMemberChange(idStr) {
    setSelectedLeadMemberId(idStr);
    const member = leadMembers.find((m) => String(m.id) === idStr);
    setForm((f) => ({ ...f, leadSource: member?.name ?? '' }));
  }

  // Live financial preview — recalculates on every change to the inputs below.
  const preview = useMemo(
    () => calcFinancials({
      netPremium: form.netPremium,
      gstPercent: form.gstPercent,
      commissionPercent: form.commissionPercent,
      tdsPercent: form.tdsPercent,
    }),
    [form.netPremium, form.gstPercent, form.commissionPercent, form.tdsPercent]
  );

  function validate() {
    const errors = {};
    if (!form.insurerName.trim()) errors.insurerName = 'Insurer is required.';
    if (!form.insuranceCategory) errors.insuranceCategory = 'Insurance category is required.';
    if (!form.productName.trim()) errors.productName = 'Product is required.';
    if (!form.customerName.trim()) errors.customerName = 'Customer name is required.';
    if (!form.policyNumber.trim()) errors.policyNumber = 'Policy number is required.';
    if (!form.issueDate) errors.issueDate = 'Issue date is required.';
    const gross = Number(form.grossPremium);
    if (!form.grossPremium || isNaN(gross) || gross <= 0) errors.grossPremium = 'Gross premium must be greater than 0.';
    const net = Number(form.netPremium);
    if (!form.netPremium || isNaN(net) || net <= 0) errors.netPremium = 'Net premium must be greater than 0.';
    const gst = form.gstPercent === '' ? NaN : Number(form.gstPercent);
    if (isNaN(gst) || gst < 0) errors.gstPercent = 'GST % must be 0 or greater.';
    if (!form.leadSource.trim()) errors.leadSource = 'Lead member is required.';
    return errors;
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear field error on change
    if (fieldErrors[key]) setFieldErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function parsePayload() {
    return {
      insurerName: form.insurerName.trim(),
      insuranceCategory: form.insuranceCategory,
      productName: form.productName.trim(),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      customerEmail: form.customerEmail.trim() || undefined,
      policyNumber: form.policyNumber.trim(),
      issueDate: form.issueDate,
      paymentFrequency: form.paymentFrequency,
      term: form.term !== '' ? Number(form.term) : undefined,
      status: form.status,
      // Numeric fields — backend calculates derived amounts
      grossPremium: Number(form.grossPremium),
      netPremium: Number(form.netPremium),
      gstPercent: Number(form.gstPercent),
      commissionPercent: Number(form.commissionPercent),
      tdsPercent: Number(form.tdsPercent),
      leadSource: form.leadSource.trim(),
      paymentMode: form.paymentMode || undefined,
      invoiceNumber: form.invoiceNumber.trim() || undefined,
      invoiceDate: form.invoiceDate || undefined,
      creditedDate: form.creditedDate || undefined,
      remarks: form.remarks.trim() || undefined,
      cancellationReason: form.cancellationReason || undefined,
      cancellationReasonOther: form.cancellationReasonOther.trim() || undefined,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await onSubmit(parsePayload());
      setSuccess(true);
      setTimeout(() => navigate('/policies'), 1200);
    } catch (err) {
      const res = err.response?.data;
      if (Array.isArray(res?.errors)) {
        // Backend validation errors array → map to field keys
        const mapped = {};
        res.errors.forEach((msg) => {
          const key = Object.keys(EMPTY).find((k) => msg.toLowerCase().includes(k.toLowerCase()));
          if (key) mapped[key] = msg;
          else setServerError((prev) => prev ? `${prev}\n${msg}` : msg);
        });
        setFieldErrors(mapped);
      } else {
        setServerError(res?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium">Policy saved successfully.</p>
          <p className="text-sm text-gray-500 mt-1">Redirecting to policies…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">

        {/* ── Insurer & Product ─────────────────────────────────────────── */}
        <SectionHeading>Insurer & Product</SectionHeading>

        <Field label="Insurer" required error={fieldErrors.insurerName}>
          <Select
            value={selectedInsurerId}
            onChange={(e) => handleInsurerChange(e.target.value)}
            required
            error={fieldErrors.insurerName}
          >
            <option value="">Select insurer…</option>
            {selectedInsurerId === CUSTOM_OPTION_VALUE && form.insurerName && (
              <option value={CUSTOM_OPTION_VALUE}>{form.insurerName}</option>
            )}
            {insurers
              .filter((i) => i.active || i.name === form.insurerName)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}{!i.active ? ' (Inactive)' : ''}
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Insurance Category" required error={fieldErrors.insuranceCategory}>
          <Select
            value={form.insuranceCategory}
            onChange={(e) => set('insuranceCategory', e.target.value)}
            required
            error={fieldErrors.insuranceCategory}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <Field label="Product" required error={fieldErrors.productName}>
          <Select
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            required
            disabled={!selectedInsurerId}
            error={fieldErrors.productName}
          >
            <option value="">
              {!selectedInsurerId ? 'Select insurer first' : 'Select product…'}
            </option>
            {selectedProductId === CUSTOM_OPTION_VALUE && form.productName && (
              <option value={CUSTOM_OPTION_VALUE}>{form.productName}</option>
            )}
            {products
              .filter((p) => p.active || p.name === form.productName)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{!p.active ? ' (Inactive)' : ''}
                </option>
              ))}
          </Select>
        </Field>

        {/* ── Customer ──────────────────────────────────────────────────── */}
        <SectionHeading>Customer Information</SectionHeading>

        <Field label="Customer Name" required error={fieldErrors.customerName}>
          <Input
            value={form.customerName}
            onChange={(e) => set('customerName', e.target.value)}
            placeholder="Full name"
            required
            error={fieldErrors.customerName}
          />
        </Field>

        <Field label="Phone Number" error={fieldErrors.customerPhone}>
          <Input
            type="tel"
            value={form.customerPhone}
            onChange={(e) => set('customerPhone', e.target.value)}
            placeholder="10-digit mobile"
            error={fieldErrors.customerPhone}
          />
        </Field>

        <Field label="Email Address" error={fieldErrors.customerEmail}>
          <Input
            type="email"
            value={form.customerEmail}
            onChange={(e) => set('customerEmail', e.target.value)}
            placeholder="customer@example.com"
            error={fieldErrors.customerEmail}
          />
        </Field>

        {/* ── Policy Details ─────────────────────────────────────────────── */}
        <SectionHeading>Policy Details</SectionHeading>

        <Field label="Policy Number" required error={fieldErrors.policyNumber}>
          <Input
            value={form.policyNumber}
            onChange={(e) => set('policyNumber', e.target.value)}
            placeholder="e.g. 1708003125P109242990"
            required
            error={fieldErrors.policyNumber}
          />
        </Field>

        <Field label="Issue Date" required error={fieldErrors.issueDate}>
          <Input
            type="date"
            value={form.issueDate}
            onChange={(e) => set('issueDate', e.target.value)}
            required
            error={fieldErrors.issueDate}
          />
        </Field>

        <Field label="Payment Frequency" required error={fieldErrors.paymentFrequency}>
          <Select
            value={form.paymentFrequency}
            onChange={(e) => set('paymentFrequency', e.target.value)}
            error={fieldErrors.paymentFrequency}
          >
            {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
          </Select>
        </Field>

        <Field label="Term" error={fieldErrors.term}>
          <Select
            value={form.term}
            onChange={(e) => set('term', e.target.value)}
            error={fieldErrors.term}
          >
            <option value="">Select term…</option>
            {TERM_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Policy Status" error={fieldErrors.status}>
          <Select
            value={form.status}
            onChange={(e) => {
              set('status', e.target.value);
              // Clear cancellation fields when moving away from CANCELLED
              if (e.target.value !== 'CANCELLED') {
                set('cancellationReason', '');
                set('cancellationReasonOther', '');
              }
            }}
            error={fieldErrors.status}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>

        {/* Cancellation fields — shown only when status is CANCELLED */}
        {form.status === 'CANCELLED' && (
          <>
            <Field label="Cancellation Reason" required error={fieldErrors.cancellationReason}>
              <Select
                value={form.cancellationReason}
                onChange={(e) => {
                  set('cancellationReason', e.target.value);
                  if (e.target.value !== 'OTHER') set('cancellationReasonOther', '');
                }}
                error={fieldErrors.cancellationReason}
              >
                <option value="">Select reason…</option>
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </Field>

            {form.cancellationReason === 'OTHER' && (
              <Field label="Reason Details" required error={fieldErrors.cancellationReasonOther} className="col-span-full">
                <textarea
                  value={form.cancellationReasonOther}
                  onChange={(e) => set('cancellationReasonOther', e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Describe the reason for cancellation…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 text-right">{form.cancellationReasonOther.length}/500</p>
              </Field>
            )}
          </>
        )}

        {/* ── Premium & Financial ────────────────────────────────────────── */}
        <SectionHeading>Premium & Financial</SectionHeading>

        <div className="col-span-full bg-blue-50 border border-blue-200 rounded-md px-4 py-2 text-xs text-blue-700">
          Enter percentages only. GST amount, commission amount, TDS amount and net receivable are
          calculated automatically and shown below as you type. Commission % and TDS % are optional —
          leave blank to treat as 0%.
        </div>

        <Field label="Gross Premium (₹)" required error={fieldErrors.grossPremium}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.grossPremium}
            onChange={(e) => set('grossPremium', e.target.value)}
            placeholder="0.00"
            required
            error={fieldErrors.grossPremium}
          />
        </Field>

        <Field label="Net Premium (₹)" required error={fieldErrors.netPremium}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.netPremium}
            onChange={(e) => set('netPremium', e.target.value)}
            placeholder="0.00"
            required
            error={fieldErrors.netPremium}
          />
        </Field>

        <Field label="GST %" required error={fieldErrors.gstPercent}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.gstPercent}
            onChange={(e) => set('gstPercent', e.target.value)}
            placeholder="18"
            required
            error={fieldErrors.gstPercent}
          />
        </Field>

        <Field label="Commission %" error={fieldErrors.commissionPercent}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.0001"
            value={form.commissionPercent}
            onChange={(e) => set('commissionPercent', e.target.value)}
            placeholder="Optional — leave blank for 0%"
            error={fieldErrors.commissionPercent}
          />
        </Field>

        <Field label="TDS %" error={fieldErrors.tdsPercent}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.tdsPercent}
            onChange={(e) => set('tdsPercent', e.target.value)}
            placeholder="Optional — leave blank for 0%"
            error={fieldErrors.tdsPercent}
          />
        </Field>

        {/* ── Live calculation preview ─────────────────────────────────── */}
        <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-3">
          <div>
            <p className="text-xs text-gray-500">GST Amount</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(preview.gstAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Commission Amount</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(preview.commissionAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TDS Amount</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(preview.tdsAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Receivable</p>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(preview.finalReceivable)}</p>
          </div>
        </div>

        {/* ── Business & Tracking ───────────────────────────────────────── */}
        <SectionHeading>Business & Tracking</SectionHeading>

        <Field label="Lead Type" required>
          <div className="flex gap-2">
            {[
              { value: 'POSP',           label: 'POSP' },
              { value: 'LEAD_EXECUTIVE', label: 'Lead Executive' },
              { value: 'LEADERSHIP',     label: 'Leadership' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleLeadTypeChange(value)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  selectedLeadType === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Lead Member" required error={fieldErrors.leadSource}>
          <Select
            value={selectedLeadMemberId}
            onChange={(e) => handleLeadMemberChange(e.target.value)}
            required
            error={fieldErrors.leadSource}
          >
            <option value="">Select {selectedLeadType.toLowerCase().replace('_', ' ')} member…</option>
            {leadMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Payment Mode" error={fieldErrors.paymentMode}>
          <Select
            value={form.paymentMode}
            onChange={(e) => set('paymentMode', e.target.value)}
            error={fieldErrors.paymentMode}
          >
            <option value="">Select mode</option>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>

        <Field label="Invoice Number" error={fieldErrors.invoiceNumber}>
          <Input
            value={form.invoiceNumber}
            onChange={(e) => set('invoiceNumber', e.target.value)}
            placeholder="e.g. BG001"
            error={fieldErrors.invoiceNumber}
          />
        </Field>

        <Field label="Invoice Date" error={fieldErrors.invoiceDate}>
          <Input
            type="date"
            value={form.invoiceDate}
            onChange={(e) => set('invoiceDate', e.target.value)}
            error={fieldErrors.invoiceDate}
          />
        </Field>

        <Field label="Credited Date" error={fieldErrors.creditedDate}>
          <Input
            type="date"
            value={form.creditedDate}
            onChange={(e) => set('creditedDate', e.target.value)}
            error={fieldErrors.creditedDate}
          />
        </Field>

        <Field label="Remarks" error={fieldErrors.remarks}>
          <Textarea
            value={form.remarks}
            onChange={(e) => set('remarks', e.target.value)}
            placeholder="Any additional notes"
            error={fieldErrors.remarks}
          />
        </Field>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 whitespace-pre-line">
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => navigate('/policies')}
          className="px-6 py-2.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
