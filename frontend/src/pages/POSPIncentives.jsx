import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAllPOSPMembers, fetchPOSPEntries, fetchPOSPSuggestions,
  bulkImportPOSPEntries, createPOSPEntry, updatePOSPEntry, deletePOSPEntry,
  searchPoliciesForPOSP, previewPOSPExcel, importPOSPExcel,
} from '../api/posp';

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmt = (n) =>
  '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));
const fmtPct  = (n) => `${Number(n ?? 0).toFixed(2)}%`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

// ─── Period helpers ───────────────────────────────────────────────────────────

function currentFY() {
  const now = new Date();
  const yr  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${yr}-${String(yr + 1).slice(-2)}`;
}

function fyOptions() {
  const cur = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const yr = cur - 1 + i;
    return { value: `${yr}-${String(yr + 1).slice(-2)}`, label: `FY ${yr}-${String(yr + 1).slice(-2)}` };
  });
}

function fyMonths(fy) {
  const startYr = Number(fy.split('-')[0]);
  const months = [];
  for (let m = 3; m < 15; m++) {
    const d = new Date(startYr + (m >= 12 ? 1 : 0), m % 12, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

function calcPreview(premium, commissionRate, pospShare) {
  const brokerage      = Math.round(Number(premium) * Number(commissionRate) / 100 * 100) / 100;
  const pospCommission = Math.round(brokerage * Number(pospShare) / 100 * 100) / 100;
  const orgCommission  = Math.round((brokerage - pospCommission) * 100) / 100;
  return { brokerage, pospCommission, orgCommission };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POSP_SHARE_OPTIONS = ['52', '55', '60', '65', '70'];

const PAYMENT_STATUSES = [
  { value: 'PENDING',        label: 'Pending',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'PAID',           label: 'Paid',         color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'PARTIALLY_PAID', label: 'Partly Paid',  color: 'bg-blue-50 text-blue-700 border-blue-200'   },
];

// ─── Slab reference card ──────────────────────────────────────────────────────

const POSP_SLABS = [
  { range: 'Less than ₹20,000',       share: '52%' },
  { range: '₹20,001 – ₹50,000',       share: '55%' },
  { range: '₹50,001 – ₹1,00,000',     share: '60%' },
  { range: '₹1,00,001 – ₹3,00,000',   share: '65%' },
  { range: 'Above ₹3,00,000',         share: '70%' },
];

function SlabCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left">
        <span className="text-sm font-semibold text-gray-800">POSP Slab Reference</span>
        <span className="text-xs text-gray-400">{open ? 'Hide ▲' : 'Show ▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Premium Collection</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">POSP Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {POSP_SLABS.map((r) => (
                <tr key={r.range}>
                  <td className="px-4 py-2 text-gray-700">{r.range}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900">{r.share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Policy search panel (for single-link flow) ───────────────────────────────

function PolicySearchPanel({ onSelect }) {
  const [q, setQ]             = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce              = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setLoading(true);
      searchPoliciesForPOSP(q).then(setResults).finally(() => setLoading(false));
    }, 300);
  }, [q]);

  return (
    <div className="space-y-3">
      <input autoFocus type="text" placeholder="Search by policy number or customer name…"
        value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {loading && <p className="text-xs text-gray-400">Searching…</p>}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 font-mono">{p.policyNumber}</span>
                <span className="text-xs text-gray-400">{fmtDate(p.issueDate)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{p.customerName} · {p.insurerName}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Premium: {fmt(p.netPremium)} · Commission: {fmtPct(p.commissionPercent)}
              </div>
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-xs text-gray-400">No matching policies found.</p>
      )}
    </div>
  );
}

// ─── Entry form (shared by link-existing and manual-entry modals) ─────────────

const EMPTY_FORM = {
  policyNumber: '', customerName: '', policyType: '', entryDate: '',
  premium: '', commissionRate: '', pospShare: '65',
  paymentStatus: 'PENDING', invoiceReference: '', invoiceDate: '', remarks: '',
};

function EntryForm({ pospMemberId, prefill, isManual, onSaved, onClose }) {
  const [form, setForm]     = useState({ ...EMPTY_FORM, ...prefill });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const preview = form.premium && form.commissionRate && form.pospShare
    ? calcPreview(form.premium, form.commissionRate, form.pospShare)
    : null;

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.policyNumber.trim()) { setError('Policy number is required.'); return; }
    if (!form.customerName.trim()) { setError('Customer name is required.'); return; }
    if (!form.entryDate)           { setError('Date is required.'); return; }
    if (form.premium === '')       { setError('Premium is required.'); return; }
    if (form.commissionRate === '') { setError('Commission rate is required.'); return; }
    if (form.pospShare === '')     { setError('POSP share is required.'); return; }
    setSaving(true);
    try {
      await createPOSPEntry({
        pospMemberId,
        policyId:         prefill?.policyId || undefined,
        entryDate:        form.entryDate,
        policyNumber:     form.policyNumber.trim(),
        customerName:     form.customerName.trim(),
        policyType:       form.policyType.trim() || undefined,
        premium:          Number(form.premium),
        commissionRate:   Number(form.commissionRate),
        pospShare:        Number(form.pospShare),
        paymentStatus:    form.paymentStatus,
        invoiceReference: form.invoiceReference.trim() || undefined,
        invoiceDate:      form.invoiceDate || undefined,
        remarks:          form.remarks.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || err.response?.data?.error || 'Failed to save entry.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-6 py-5 space-y-4">
      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Policy Number <span className="text-red-500">*</span></label>
          <input value={form.policyNumber} onChange={(e) => set('policyNumber', e.target.value)}
            readOnly={!isManual}
            className={`w-full border rounded-md px-3 py-2 text-sm ${!isManual ? 'bg-gray-50 text-gray-600' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name <span className="text-red-500">*</span></label>
          <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)}
            readOnly={!isManual}
            className={`w-full border rounded-md px-3 py-2 text-sm ${!isManual ? 'bg-gray-50 text-gray-600' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
          <input type="date" value={form.entryDate} onChange={(e) => set('entryDate', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Policy Type</label>
          <input value={form.policyType} onChange={(e) => set('policyType', e.target.value)}
            placeholder="Motor / Health / Life…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Premium (₹) <span className="text-red-500">*</span></label>
          <input type="number" min="0" step="0.01" value={form.premium} onChange={(e) => set('premium', e.target.value)}
            readOnly={!isManual}
            className={`w-full border rounded-md px-3 py-2 text-sm ${!isManual ? 'bg-gray-50 text-gray-600' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate % <span className="text-red-500">*</span></label>
          <input type="number" min="0" max="100" step="0.01" value={form.commissionRate}
            onChange={(e) => set('commissionRate', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 12.00" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">POSP Share % <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <select value={POSP_SHARE_OPTIONS.includes(String(form.pospShare)) ? form.pospShare : 'custom'}
              onChange={(e) => { if (e.target.value !== 'custom') set('pospShare', e.target.value); }}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {POSP_SHARE_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
              {!POSP_SHARE_OPTIONS.includes(String(form.pospShare)) && <option value="custom">Custom</option>}
            </select>
            <input type="number" min="0" max="100" step="0.01" value={form.pospShare}
              onChange={(e) => set('pospShare', e.target.value)}
              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
        </div>
      </div>
      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 grid grid-cols-3 gap-4 text-center">
          <div><p className="text-xs text-blue-600">Brokerage</p><p className="text-sm font-bold text-blue-900">{fmt(preview.brokerage)}</p></div>
          <div><p className="text-xs text-blue-600">POSP Commission</p><p className="text-sm font-bold text-blue-900">{fmt(preview.pospCommission)}</p></div>
          <div><p className="text-xs text-blue-600">Org Commission</p><p className="text-sm font-bold text-blue-900">{fmt(preview.orgCommission)}</p></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
          <select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Reference</label>
          <input value={form.invoiceReference} onChange={(e) => set('invoiceReference', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
          <input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
          <input value={form.remarks} onChange={(e) => set('remarks', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Add to Register'}
        </button>
        <button type="button" onClick={onClose}
          className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

// ─── Link existing policy modal ───────────────────────────────────────────────

function LinkPolicyModal({ pospMemberId, onClose, onSaved }) {
  const [step, setStep]     = useState('search');
  const [policy, setPolicy] = useState(null);

  if (step === 'form' && policy) {
    return (
      <Modal title={`Add Policy — ${policy.policyNumber}`} onClose={onClose} wide>
        <EntryForm pospMemberId={pospMemberId} isManual={false}
          prefill={{
            policyId:       policy.id,
            policyNumber:   policy.policyNumber,
            customerName:   policy.customerName,
            policyType:     policy.insuranceCategory || '',
            entryDate:      policy.issueDate ? new Date(policy.issueDate).toISOString().slice(0, 10) : '',
            premium:        String(Number(policy.netPremium)),
            commissionRate: String(Number(policy.commissionPercent)),
          }}
          onSaved={onSaved} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal title="Link Existing Policy" onClose={onClose} wide>
      <div className="px-6 py-5">
        <p className="text-sm text-gray-500 mb-4">Search for a specific policy to add to this POSP's register.</p>
        <PolicySearchPanel onSelect={(p) => { setPolicy(p); setStep('form'); }} />
        <div className="mt-4 border-t pt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm text-gray-600 rounded-md hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit entry modal ─────────────────────────────────────────────────────────

function EditEntryModal({ entry, onClose, onSaved }) {
  const [form, setForm]     = useState({
    commissionRate:   String(Number(entry.commissionRate)),
    pospShare:        String(Number(entry.pospShare)),
    paymentStatus:    entry.paymentStatus,
    invoiceReference: entry.invoiceReference || '',
    invoiceDate:      entry.invoiceDate ? new Date(entry.invoiceDate).toISOString().slice(0, 10) : '',
    remarks:          entry.remarks || '',
    entryDate:        entry.isManual ? new Date(entry.entryDate).toISOString().slice(0, 10) : '',
    policyNumber:     entry.policyNumber,
    customerName:     entry.customerName,
    policyType:       entry.policyType || '',
    premium:          String(Number(entry.premium)),
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const preview = form.premium && form.commissionRate && form.pospShare
    ? calcPreview(form.premium, form.commissionRate, form.pospShare)
    : null;

  async function submit(e) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const payload = {
        commissionRate:   Number(form.commissionRate),
        pospShare:        Number(form.pospShare),
        paymentStatus:    form.paymentStatus,
        invoiceReference: form.invoiceReference.trim() || undefined,
        invoiceDate:      form.invoiceDate || undefined,
        remarks:          form.remarks.trim() || undefined,
      };
      if (entry.isManual) {
        payload.entryDate    = form.entryDate;
        payload.policyNumber = form.policyNumber.trim();
        payload.customerName = form.customerName.trim();
        payload.policyType   = form.policyType.trim() || undefined;
        payload.premium      = Number(form.premium);
      }
      await updatePOSPEntry(entry.id, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || err.response?.data?.error || 'Failed to save.');
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit — ${entry.policyNumber}`} onClose={onClose} wide>
      <form onSubmit={submit} className="px-6 py-5 space-y-4">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
        {!entry.isManual && (
          <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-500">Policy</p><p className="font-mono font-medium">{entry.policyNumber}</p></div>
            <div><p className="text-xs text-gray-500">Customer</p><p>{entry.customerName}</p></div>
            <div><p className="text-xs text-gray-500">Premium</p><p className="font-mono">{fmt(entry.premium)}</p></div>
          </div>
        )}
        {entry.isManual && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Policy Number</label>
              <input value={form.policyNumber} onChange={(e) => set('policyNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
              <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.entryDate} onChange={(e) => set('entryDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Premium (₹)</label>
              <input type="number" min="0" step="0.01" value={form.premium} onChange={(e) => set('premium', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate %</label>
            <input type="number" min="0" max="100" step="0.01" value={form.commissionRate}
              onChange={(e) => set('commissionRate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">POSP Share %</label>
            <div className="flex gap-2">
              <select value={POSP_SHARE_OPTIONS.includes(String(form.pospShare)) ? form.pospShare : 'custom'}
                onChange={(e) => { if (e.target.value !== 'custom') set('pospShare', e.target.value); }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none">
                {POSP_SHARE_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
                {!POSP_SHARE_OPTIONS.includes(String(form.pospShare)) && <option value="custom">Custom</option>}
              </select>
              <input type="number" min="0" max="100" step="0.01" value={form.pospShare}
                onChange={(e) => set('pospShare', e.target.value)}
                className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none font-mono" />
            </div>
          </div>
        </div>
        {preview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-blue-600">Brokerage</p><p className="text-sm font-bold text-blue-900">{fmt(preview.brokerage)}</p></div>
            <div><p className="text-xs text-blue-600">POSP Commission</p><p className="text-sm font-bold text-blue-900">{fmt(preview.pospCommission)}</p></div>
            <div><p className="text-xs text-blue-600">Org Commission</p><p className="text-sm font-bold text-blue-900">{fmt(preview.orgCommission)}</p></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
            <select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice Reference</label>
            <input value={form.invoiceReference} onChange={(e) => set('invoiceReference', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
            <input type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <input value={form.remarks} onChange={(e) => set('remarks', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ summary, memberName, periodLabel }) {
  if (!summary || summary.totalPolicies === 0) return null;
  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm">
      <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 rounded-t-xl flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">POSP</span>
        <div>
          <p className="text-sm font-bold text-blue-900">{memberName}</p>
          <p className="text-xs text-blue-600">{periodLabel}</p>
        </div>
      </div>
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Policies',   value: summary.totalPolicies                     },
          { label: 'Total Premium',    value: fmt(summary.totalPremium)                  },
          { label: 'Total Brokerage',  value: fmt(summary.totalBrokerage)                },
          { label: 'POSP Commission',  value: fmt(summary.totalPospCommission), hl: true },
          { label: 'Org Commission',   value: fmt(summary.totalOrgCommission)             },
        ].map(({ label, value, hl }) => (
          <div key={label} className={`rounded-lg p-4 border ${hl ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-medium ${hl ? 'text-blue-700' : 'text-gray-500'}`}>{label}</p>
            <p className={`text-lg font-bold mt-1 ${hl ? 'text-blue-900' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline payment status cell ───────────────────────────────────────────────

function PaymentStatusCell({ entryId, value, isAdmin, onUpdated }) {
  const [saving, setSaving] = useState(false);
  async function handleChange(e) {
    setSaving(true);
    try { await updatePOSPEntry(entryId, { paymentStatus: e.target.value }); onUpdated(); }
    finally { setSaving(false); }
  }
  if (!isAdmin) {
    const s = PAYMENT_STATUSES.find((p) => p.value === value) || PAYMENT_STATUSES[0];
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.color}`}>{s.label}</span>;
  }
  return (
    <select value={value} onChange={handleChange} disabled={saving}
      className={`text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
        value === 'PAID'           ? 'border-green-300 bg-green-50 text-green-700'
        : value === 'PARTIALLY_PAID' ? 'border-blue-300 bg-blue-50 text-blue-700'
        : 'border-amber-300 bg-amber-50 text-amber-700'
      }`}>
      {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

// ─── Suggested Policies section ───────────────────────────────────────────────

function SuggestedPolicies({ pospMemberId, fy, month, isAdmin, onImported }) {
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [pospShare, setPospShare]       = useState('65');
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState('');
  const [collapsed, setCollapsed]       = useState(false);

  useEffect(() => {
    setLoading(true); setSelected(new Set()); setImportError('');
    const params = { pospMemberId };
    if (month) params.month = month;
    else if (fy) params.fy = fy;
    fetchPOSPSuggestions(params)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [pospMemberId, fy, month]);

  if (loading) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-700">
        Searching for matching policies…
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  const allChecked = suggestions.length > 0 && selected.size === suggestions.length;

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(suggestions.map((p) => p.id)));
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true); setImportError('');
    try {
      const result = await bulkImportPOSPEntries({
        pospMemberId,
        policyIds: [...selected],
        pospShare:  Number(pospShare),
      });
      setSelected(new Set());
      onImported(result.imported);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed.');
    } finally { setImporting(false); }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-amber-200 bg-amber-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">
            SUGGESTED
          </span>
          <span className="text-sm font-semibold text-amber-900">
            {suggestions.length} matching {suggestions.length === 1 ? 'policy' : 'policies'} found
          </span>
          <span className="text-xs text-amber-700">— matched by Lead Source name</span>
        </div>
        <button onClick={() => setCollapsed((c) => !c)}
          className="text-xs text-amber-700 hover:text-amber-900 font-medium">
          {collapsed ? 'Show ▼' : 'Hide ▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Import controls */}
          {isAdmin && (
            <div className="px-5 py-3 flex flex-wrap items-center gap-4 bg-amber-50 border-b border-amber-100">
              <label className="flex items-center gap-2 text-sm text-amber-900 cursor-pointer select-none">
                <input type="checkbox" checked={allChecked} onChange={toggleAll}
                  className="w-4 h-4 accent-amber-600" />
                {allChecked ? 'Deselect All' : 'Select All'}
              </label>
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <label className="font-medium">POSP Share %</label>
                <select value={pospShare} onChange={(e) => setPospShare(e.target.value)}
                  className="border border-amber-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {POSP_SHARE_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
              <button onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="ml-auto px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {importing
                  ? 'Importing…'
                  : `Import Selected (${selected.size})`}
              </button>
            </div>
          )}

          {importError && (
            <div className="px-5 py-2 bg-red-50 text-sm text-red-700 border-b border-red-200">{importError}</div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-100 border-b border-amber-200">
                <tr>
                  {isAdmin && <th className="px-3 py-2 w-8"></th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Policy Number</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Insurer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-amber-800 uppercase">Premium</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-amber-800 uppercase">Comm %</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase">Lead Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {suggestions.map((p) => (
                  <tr key={p.id}
                    className={`transition-colors ${selected.has(p.id) ? 'bg-amber-100' : 'hover:bg-amber-50'}`}
                    onClick={() => isAdmin && toggleOne(p.id)}
                    style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                    {isAdmin && (
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-amber-600" />
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(p.issueDate)}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-800 text-xs whitespace-nowrap">{p.policyNumber}</td>
                    <td className="px-3 py-2.5 text-gray-800 max-w-[140px] truncate">{p.customerName}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[100px] truncate">{p.insurerName}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{p.insuranceCategory || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-mono text-right">{fmt(p.netPremium)}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-mono text-right">{fmtPct(p.commissionPercent)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 italic max-w-[100px] truncate">{p.leadSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── POSP Register table ──────────────────────────────────────────────────────

function POSPRegister({ entries, summary, isAdmin, onEdit, onDelete, onStatusChange }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-center">
        <p className="text-sm text-gray-500">No policies imported yet.</p>
        <p className="text-xs text-gray-400 mt-1">Select policies from "Suggested Policies" above and click Import, or add them manually.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Imported POSP Register — {entries.length} {entries.length === 1 ? 'policy' : 'policies'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-gray-900 text-white">
            <tr>
              {['Date', 'Policy Number', 'Customer', 'Type',
                'Premium', 'Comm %', 'Brokerage',
                'POSP %', 'POSP Commission', 'Org Commission',
                'Payment', 'Invoice Ref', 'Invoice Date', 'Remarks',
                isAdmin ? 'Actions' : null,
              ].filter(Boolean).map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                <td className="px-3 py-2.5 font-mono text-gray-800 text-xs whitespace-nowrap">
                  {e.policyNumber}
                  {e.isImported && <span className="ml-1 text-blue-400 text-xs">(I)</span>}
                  {e.isManual && !e.isImported && <span className="ml-1 text-gray-400 text-xs">(M)</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-800 max-w-[130px] truncate">{e.customerName}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{e.policyType || '—'}</td>
                <td className="px-3 py-2.5 text-gray-900 font-mono text-right">{fmt(e.premium)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-gray-700">{fmtPct(e.commissionRate)}</td>
                <td className="px-3 py-2.5 text-gray-900 font-mono text-right font-medium">{fmt(e.brokerage)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-gray-700">{fmtPct(e.pospShare)}</td>
                <td className="px-3 py-2.5 text-blue-900 font-mono text-right font-semibold">{fmt(e.pospCommission)}</td>
                <td className="px-3 py-2.5 text-gray-700 font-mono text-right">{fmt(e.orgCommission)}</td>
                <td className="px-3 py-2.5">
                  <PaymentStatusCell entryId={e.id} value={e.paymentStatus} isAdmin={isAdmin} onUpdated={onStatusChange} />
                </td>
                <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[100px] truncate">{e.invoiceReference || '—'}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(e.invoiceDate)}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs max-w-[120px] truncate">{e.remarks || '—'}</td>
                {isAdmin && (
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(e)}
                        className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50">Edit</button>
                      <button onClick={() => onDelete(e)}
                        className="px-2.5 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">Del</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-yellow-50 border-t-2 border-yellow-300">
            <tr>
              <td colSpan={4} className="px-3 py-2.5 text-xs font-bold text-gray-600 uppercase">
                Total ({entries.length} policies)
              </td>
              <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(summary.totalPremium)}</td>
              <td></td>
              <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(summary.totalBrokerage)}</td>
              <td></td>
              <td className="px-3 py-2.5 font-mono font-bold text-blue-900 text-right">{fmt(summary.totalPospCommission)}</td>
              <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(summary.totalOrgCommission)}</td>
              <td colSpan={isAdmin ? 5 : 4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Import Excel modal ───────────────────────────────────────────────────────

const PREVIEW_MAX = 5;

function SummaryTable({ totals, imported, skipped }) {
  return (
    <div className="rounded-xl border border-blue-200 overflow-hidden">
      <div className="bg-blue-700 px-4 py-2.5">
        <p className="text-xs font-bold text-blue-100 uppercase tracking-wide">Import Summary</p>
      </div>
      <div className="bg-white divide-y divide-gray-100">
        {[
          { label: 'Imported Rows',               value: imported,                  mono: false, hl: false },
          { label: 'Total Premium',               value: fmt(totals?.premium),      mono: true,  hl: false },
          { label: 'Total Brokerage',             value: fmt(totals?.brokerage),    mono: true,  hl: false },
          { label: 'Total POSP Commission',       value: fmt(totals?.pospCommission), mono: true, hl: true  },
          { label: 'Total Organization Commission', value: fmt(totals?.orgCommission), mono: true, hl: false },
        ].map(({ label, value, mono, hl }) => (
          <div key={label} className={`flex items-center justify-between px-4 py-3 ${hl ? 'bg-blue-50' : ''}`}>
            <span className={`text-sm ${hl ? 'font-semibold text-blue-800' : 'text-gray-600'}`}>{label}</span>
            <span className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${hl ? 'text-blue-900' : 'text-gray-900'}`}>{value}</span>
          </div>
        ))}
        {skipped > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50">
            <span className="text-sm text-amber-700">Skipped (duplicates)</span>
            <span className="text-sm font-bold text-amber-800">{skipped}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WarningsBlock({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 overflow-hidden">
      <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2">
        <span className="text-amber-600">⚠</span>
        <p className="text-xs font-semibold text-amber-800">
          {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
        </p>
      </div>
      <ul className="bg-white px-4 py-3 space-y-1 max-h-36 overflow-y-auto">
        {warnings.map((w, i) => (
          <li key={i} className="text-xs text-amber-700 flex gap-2">
            <span className="text-amber-400 shrink-0">·</span> {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportExcelModal({ pospMemberId, members, onClose, onImported }) {
  const [file, setFile]             = useState(null);
  const [defaultShare, setShare]    = useState('65');
  const [singleMemberId, setSingleMember] = useState(pospMemberId ? String(pospMemberId) : '');
  const [preview, setPreview]       = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const fileRef                     = useRef(null);

  async function handleFile(f) {
    if (!f) return;
    setFile(f); setError(''); setPreview(null); setResult(null);
    setPreviewing(true);
    try {
      const data = await previewPOSPExcel(f);
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not parse file.');
    } finally { setPreviewing(false); }
  }

  async function handleImport() {
    if (!file || !preview) return;
    if (preview.mode === 'single' && !singleMemberId) {
      setError('Please select a POSP member for this file (no Lead Source sections detected).');
      return;
    }
    setImporting(true); setError('');
    try {
      const memberId = preview.mode === 'single' ? singleMemberId : null;
      const data = await importPOSPExcel(file, memberId, Number(defaultShare));
      setResult(data);
      onImported(data.imported);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed.');
    } finally { setImporting(false); }
  }

  const totalPreviewRows = preview ? preview.groups.reduce((s, g) => s + g.rows.length, 0) : 0;
  const hasFinancialCols = preview && (
    preview.colsFound.includes('brokerage') ||
    preview.colsFound.includes('pospCommission') ||
    preview.colsFound.includes('orgCommission')
  );

  return (
    <Modal title="Import POSP Sheet" onClose={onClose} wide>
      <div className="px-6 py-5 space-y-5">

        {/* ── File picker (hidden after result) ────────────────────────────── */}
        {!result && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => handleFile(e.target.files[0])} />
            <div className="text-3xl mb-2">📊</div>
            {file
              ? <p className="text-sm font-medium text-blue-700">{file.name}</p>
              : <>
                  <p className="text-sm font-medium text-gray-700">Click or drag & drop your POSP Excel file here</p>
                  <p className="text-xs text-gray-400 mt-1">Accepts .xlsx or .xls — max 10 MB</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Supports grouped sheets (Lead Source : Mr Bhaskar) and flat sheets
                  </p>
                </>
            }
          </div>
        )}

        {previewing && <div className="text-sm text-gray-400">Parsing file…</div>}
        {error     && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}

        {/* ── Import result ─────────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-base font-bold text-gray-900">Import Complete</p>
                <p className="text-sm text-gray-500">
                  {result.imported} {result.imported === 1 ? 'row' : 'rows'} imported
                  {result.skipped > 0 && ` · ${result.skipped} skipped`}
                </p>
              </div>
            </div>

            {/* Grouped mode: per-member breakdown */}
            {result.mode === 'grouped' && result.groups?.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold text-white uppercase tracking-wide">
                    POSP Members — {result.groups.length} sections
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {result.groups.map((g) => (
                    <div key={g.memberCode} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{g.memberCode}</span>
                        <span className="text-sm font-semibold text-gray-900">{g.memberName}</span>
                        {g.isNew && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">NEW</span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600 flex-wrap ml-auto">
                        <span><span className="font-bold text-gray-900">{g.imported}</span> rows</span>
                        {g.skipped > 0 && <span className="text-amber-600">{g.skipped} skipped</span>}
                        <span>Premium <span className="font-mono font-medium text-gray-800">{fmt(g.totals.premium)}</span></span>
                        <span>POSP Comm <span className="font-mono font-semibold text-blue-800">{fmt(g.totals.pospCommission)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SummaryTable totals={result.totals} imported={result.imported} skipped={result.skipped} />
            <WarningsBlock warnings={result.warnings} />

            <div className="flex justify-end pt-1">
              <button onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Preview ───────────────────────────────────────────────────────── */}
        {preview && !result && (
          <div className="space-y-4">
            {/* Mode badge */}
            {preview.mode === 'grouped' ? (
              <div className="flex flex-wrap gap-3 items-center">
                <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  GROUPED — {preview.groups.length} Lead Source sections detected
                </span>
                <span className="text-xs text-gray-400">
                  {totalPreviewRows} total rows · POSP members will be created automatically
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 items-center">
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  FLAT FILE — {totalPreviewRows} rows
                </span>
                <span className="text-xs text-gray-400">No Lead Source sections found — select a POSP member below</span>
              </div>
            )}

            {/* Single mode: member selector */}
            {preview.mode === 'single' && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Assign to POSP Member</label>
                <select value={singleMemberId} onChange={(e) => setSingleMember(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select POSP member…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>
            )}

            {/* Grouped mode: member list preview */}
            {preview.mode === 'grouped' && (
              <div className="rounded-lg border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                  <p className="text-xs font-semibold text-green-800">POSP Members to be created / matched</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto bg-white">
                  {preview.groups.map((g, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{g.memberName ?? <em className="text-gray-400">No name</em>}</span>
                      <span className="text-xs text-gray-500">{g.rows.length} {g.rows.length === 1 ? 'policy' : 'policies'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POSP Share default */}
            {!preview.colsFound.includes('pospShare') && (
              <div className="flex items-center gap-3 text-sm">
                <label className="text-gray-700 font-medium whitespace-nowrap">
                  Default POSP Share %
                  <span className="ml-1 text-xs text-gray-400">(not in Excel)</span>
                </label>
                <select value={defaultShare} onChange={(e) => setShare(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {POSP_SHARE_OPTIONS.map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            )}

            {!hasFinancialCols && (
              <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                Brokerage and commission columns were not detected — they will be calculated from Premium × Commission Rate × POSP Share %.
              </div>
            )}

            {/* Row preview — show first PREVIEW_MAX rows across all groups */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    {preview.mode === 'grouped' && <th className="px-3 py-2 text-left">Member</th>}
                    <th className="px-3 py-2 text-left">Policy Number</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Premium</th>
                    <th className="px-3 py-2 text-right">Brokerage</th>
                    <th className="px-3 py-2 text-right">POSP Comm</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const flatRows = preview.groups.flatMap((g) =>
                      g.rows.map((r) => ({ ...r, _memberName: g.memberName }))
                    );
                    return flatRows.slice(0, PREVIEW_MAX).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {preview.mode === 'grouped' && (
                          <td className="px-3 py-2 text-gray-600 font-medium max-w-[100px] truncate">{row._memberName}</td>
                        )}
                        <td className="px-3 py-2 font-mono text-gray-800">{row.policyNumber}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[130px] truncate">{row.customerName}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(row.premium)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">
                          {row.brokerage != null ? fmt(row.brokerage) : <em className="text-gray-300">calc</em>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-blue-700">
                          {row.pospCommission != null ? fmt(row.pospCommission) : <em className="text-gray-300">calc</em>}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{row.paymentStatus}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
              {totalPreviewRows > PREVIEW_MAX && (
                <p className="text-xs text-gray-400 px-3 py-2 text-center border-t">
                  … and {totalPreviewRows - PREVIEW_MAX} more rows
                </p>
              )}
            </div>

            {preview.warnings?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                {preview.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={handleImport}
                disabled={importing || totalPreviewRows === 0 || (preview.mode === 'single' && !singleMemberId)}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {importing
                  ? 'Importing…'
                  : preview.mode === 'grouped'
                    ? `Import ${totalPreviewRows} rows across ${preview.groups.length} members`
                    : `Import ${totalPreviewRows} rows`}
              </button>
              <button onClick={() => { setFile(null); setPreview(null); setError(''); }}
                className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">
                Choose Different File
              </button>
              <button onClick={onClose}
                className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!file && !previewing && (
          <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-4 text-xs text-gray-500 space-y-3">
            <div>
              <p className="font-semibold text-gray-700 mb-1">Grouped sheets (recommended)</p>
              <p>Include section headers like <code className="bg-gray-100 px-1 rounded">Lead Source : Mr Bhaskar</code> to auto-create POSP members and group rows automatically.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Flat sheets</p>
              <p>No section headers — you will select a POSP member after upload.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Expected columns (any order)</p>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {['Date', 'Policy Number', 'Customer Name', 'Policy Type', 'Premium', 'Commission %',
                  'Brokerage', 'POSP Share %', 'POSP Commission', 'Org Commission',
                  'Payment Status', 'Invoice Ref', 'Invoice Date', 'Remarks'].map((c) => (
                  <span key={c} className="flex items-center gap-1"><span className="text-green-500">✓</span>{c}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function POSPIncentives() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'ADMIN';

  const [members, setMembers]           = useState([]);
  const [selectedMember, setMember]     = useState('');
  const [selectedFY, setFY]             = useState(currentFY());
  const [selectedMonth, setMonth]       = useState('');

  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const [modal, setModal]               = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [importBanner, setImportBanner] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => { fetchAllPOSPMembers().then(setMembers).catch(() => {}); }, []);

  const load = useCallback(() => {
    if (!selectedMember) { setData(null); return; }
    setLoading(true); setError('');
    const params = { pospMemberId: selectedMember };
    if (selectedMonth) params.month = selectedMonth;
    else if (selectedFY) params.fy  = selectedFY;
    fetchPOSPEntries(params)
      .then(setData)
      .catch(() => setError('Failed to load register.'))
      .finally(() => setLoading(false));
  }, [selectedMember, selectedFY, selectedMonth]);

  useEffect(() => { load(); }, [load]);

  function handleImported(count) {
    setImportBanner(`${count} ${count === 1 ? 'policy' : 'policies'} imported successfully.`);
    setTimeout(() => setImportBanner(''), 4000);
    load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePOSPEntry(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch { setError('Failed to delete entry.'); }
    finally { setDeleting(false); }
  }

  const selectedMemberObj = members.find((m) => String(m.id) === String(selectedMember));
  const months            = fyMonths(selectedFY);
  const periodLabel       = selectedMonth
    ? months.find((m) => m.value === selectedMonth)?.label || selectedMonth
    : `FY ${selectedFY}`;

  return (
    <div className="p-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">POSP Incentives</h1>
        <p className="text-sm text-gray-500 mt-1">Select a POSP member to view suggested policies and manage the payout register.</p>
      </div>

      <SlabCard />

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Financial Year</label>
            <select value={selectedFY} onChange={(e) => { setFY(e.target.value); setMonth(''); }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {fyOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Month (optional)</label>
            <select value={selectedMonth} onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All months in FY</option>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">POSP Member</label>
            <select value={selectedMember} onChange={(e) => setMember(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select POSP member…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {importBanner && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 font-medium">
          ✓ {importBanner}
        </div>
      )}

      {/* Import button — always visible for admins, no member required for grouped sheets */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm">
            <span>⬆</span> Import POSP Sheet
          </button>
          <span className="text-xs text-gray-400">Import a grouped or flat Excel sheet — POSP members are created automatically</span>
        </div>
      )}

      {!selectedMember ? (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-14 text-center">
          <p className="text-sm text-gray-500">Select a POSP member above to view the register, or import a sheet to get started.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {data && <SummaryCard summary={data.summary} memberName={selectedMemberObj?.name} periodLabel={periodLabel} />}

          {/* ── Suggested Policies ─────────────────────────────────────────── */}
          {selectedMember && (
            <SuggestedPolicies
              pospMemberId={Number(selectedMember)}
              fy={selectedMonth ? undefined : selectedFY}
              month={selectedMonth || undefined}
              isAdmin={isAdmin}
              onImported={handleImported}
            />
          )}

          {/* ── Add entry buttons (import moved above filter bar) ─────────── */}
          {isAdmin && (
            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={() => setModal('link')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                + Link Specific Policy
              </button>
              <button onClick={() => setModal('manual')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                + Add Manual Entry
              </button>
            </div>
          )}

          {/* ── POSP Register ──────────────────────────────────────────────── */}
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-sm text-gray-400">Loading…</div>
          ) : data ? (
            <POSPRegister
              entries={data.entries}
              summary={data.summary}
              isAdmin={isAdmin}
              onEdit={(e) => setModal({ type: 'edit', entry: e })}
              onDelete={setConfirmDelete}
              onStatusChange={load}
            />
          ) : null}
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showImportModal && (
        <ImportExcelModal
          pospMemberId={selectedMember ? Number(selectedMember) : null}
          members={members}
          onClose={() => setShowImportModal(false)}
          onImported={(count) => {
            setShowImportModal(false);
            setImportBanner(`${count} ${count === 1 ? 'row' : 'rows'} imported from Excel.`);
            setTimeout(() => setImportBanner(''), 5000);
            // Reload members list (grouped import may have created new members)
            fetchAllPOSPMembers().then(setMembers).catch(() => {});
            load();
          }}
        />
      )}

      {modal === 'link' && (
        <LinkPolicyModal
          pospMemberId={Number(selectedMember)}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {modal === 'manual' && (
        <Modal title="Add Manual Entry" onClose={() => setModal(null)} wide>
          <EntryForm pospMemberId={Number(selectedMember)} isManual={true}
            prefill={{ entryDate: new Date().toISOString().slice(0, 10) }}
            onSaved={() => { setModal(null); load(); }}
            onClose={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <EditEntryModal entry={modal.entry}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }} />
      )}

      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-600">
              Remove <span className="font-mono font-medium">{confirmDelete.policyNumber}</span> — {confirmDelete.customerName} from the register?
            </p>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={handleDelete} disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Remove Entry'}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
