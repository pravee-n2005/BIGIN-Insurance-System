import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, Input, Select, Textarea, SectionHeading } from './FormField';
import { fetchInsurers, fetchProductsByInsurer, fetchLeadMembers } from '../api/masters';

const CATEGORIES     = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const FREQUENCIES    = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
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

  // Load insurers on mount
  useEffect(() => {
    fetchInsurers()
      .then((list) => {
        setInsurers(list);
        // Pre-select insurer if editing
        if (form.insurerName) {
          const match = list.find((i) => i.name === form.insurerName);
          if (match) setSelectedInsurerId(String(match.id));
        }
      })
      .catch(() => {/* silent — falls back to free-text */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load products when insurer changes
  useEffect(() => {
    if (!selectedInsurerId) { setProducts([]); return; }
    fetchProductsByInsurer(selectedInsurerId)
      .then((list) => {
        setProducts(list);
        if (form.productName) {
          const match = list.find((p) => p.name === form.productName);
          if (match) setSelectedProductId(String(match.id));
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
    setSelectedInsurerId(idStr);
    setSelectedProductId('');                              // reset cascade
    const insurer = insurers.find((i) => String(i.id) === idStr);
    setForm((f) => ({ ...f, insurerName: insurer?.name ?? '', productName: '' }));
  }

  function handleProductChange(idStr) {
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
            {insurers.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
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
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
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
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
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
          calculated automatically by the server.
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

        <Field label="Commission %" required error={fieldErrors.commissionPercent}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.0001"
            value={form.commissionPercent}
            onChange={(e) => set('commissionPercent', e.target.value)}
            placeholder="e.g. 29.66"
            required
            error={fieldErrors.commissionPercent}
          />
        </Field>

        <Field label="TDS %" required error={fieldErrors.tdsPercent}>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.tdsPercent}
            onChange={(e) => set('tdsPercent', e.target.value)}
            placeholder="10"
            required
            error={fieldErrors.tdsPercent}
          />
        </Field>

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
