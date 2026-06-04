import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchInsurers } from '../api/masters';
import { generateDraft, saveInvoice, fetchInvoices, cancelInvoice } from '../api/invoices';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

const monthLabel = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export default function Invoices() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [insurers, setInsurers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta]         = useState(null);
  const [page, setPage]         = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError]     = useState('');

  // Cancel confirmation state
  const [cancelTarget, setCancelTarget] = useState(null);  // invoice object | null
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState('');

  // Draft form state
  const [insurerId, setInsurerId]       = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [draft, setDraft]               = useState(null);
  const [drafting, setDrafting]         = useState(false);
  const [draftError, setDraftError]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [saveSuccess, setSaveSuccess]   = useState('');

  async function loadInvoices(p = 1) {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetchInvoices({ page: p, limit: 20 });
      setInvoices(res.data);
      setMeta(res.meta);
    } catch {
      setListError('Failed to load invoices.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    fetchInsurers().then(setInsurers).catch(() => {});
    loadInvoices(1);
  }, []);

  async function handleGenerateDraft(e) {
    e.preventDefault();
    setDraft(null);
    setDraftError('');
    setSaveError('');
    setSaveSuccess('');
    if (!insurerId || !billingMonth) return;
    setDrafting(true);
    try {
      const d = await generateDraft(parseInt(insurerId), billingMonth);
      setDraft(d);
    } catch (err) {
      setDraftError(err.response?.data?.error || 'Failed to generate draft.');
    } finally {
      setDrafting(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaveError('');
    setSaveSuccess('');
    setSaving(true);
    try {
      const saved = await saveInvoice(parseInt(insurerId), billingMonth);
      setSaveSuccess(`Invoice ${saved.invoiceNumber} finalized and saved.`);
      setDraft(null);
      setInsurerId('');
      setBillingMonth('');
      setPage(1);
      loadInvoices(1);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelError('');
    setCancelling(true);
    try {
      await cancelInvoice(cancelTarget.id);
      setCancelTarget(null);
      loadInvoices(page);
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Failed to cancel invoice.');
    } finally {
      setCancelling(false);
    }
  }

  function handlePageChange(p) {
    setPage(p);
    loadInvoices(p);
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and manage brokerage invoices.</p>
      </div>

      {/* Draft generation — admin only */}
      {isAdmin && (
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Generate Invoice</h2>
          </div>
          <div className="px-6 py-5">
            <form onSubmit={handleGenerateDraft} className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-600">Insurer</label>
                <select
                  value={insurerId}
                  onChange={(e) => { setInsurerId(e.target.value); setDraft(null); }}
                  required
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select insurer…</option>
                  {insurers.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Billing Month</label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => { setBillingMonth(e.target.value); setDraft(null); }}
                  required
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={drafting || !insurerId || !billingMonth}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {drafting ? 'Generating…' : 'Preview Draft'}
              </button>
            </form>

            {draftError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{draftError}</p>
            )}

            {saveSuccess && (
              <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{saveSuccess}</p>
            )}

            {draft && (
              <DraftPreview
                draft={draft}
                onSave={handleSave}
                saving={saving}
                saveError={saveError}
              />
            )}
          </div>
        </section>
      )}

      {/* Saved invoices list */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Saved Invoices</h2>
        </div>

        {listError && (
          <div className="px-6 py-4 text-sm text-red-600">{listError}</div>
        )}

        {listLoading ? (
          <div className="px-6 py-8 text-sm text-gray-400">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No invoices saved yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Invoice No.', 'Insurer', 'Billing Month', 'Policies', 'Taxable Value', 'Total Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">
                      <Link to={`/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{inv.insurer?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{monthLabel(inv.billingMonth)}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{inv.policyCount}</td>
                    <td className="px-4 py-3 text-gray-800 font-mono">₹{fmt(inv.taxableValue)}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">₹{fmt(inv.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/invoices/${inv.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                        {isAdmin && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => { setCancelTarget(inv); setCancelError(''); }}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <span>{meta.total} total</span>
            <div className="ml-auto flex gap-1">
              {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    p === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Cancel Invoice</h3>
            <p className="text-sm text-gray-600 mb-1">
              You are about to cancel <span className="font-mono font-semibold">{cancelTarget.invoiceNumber}</span> —{' '}
              {cancelTarget.insurer?.name}, {monthLabel(cancelTarget.billingMonth)}.
            </p>
            <p className="text-xs text-gray-400 mb-4">
              The invoice record is never deleted. Status will be set to CANCELLED and it can no longer be downloaded or submitted.
              A new invoice can be regenerated for the same insurer and month after cancellation.
            </p>

            {cancelError && (
              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{cancelError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Invoice'}
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Keep Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Draft preview panel ──────────────────────────────────────────────────────

function DraftPreview({ draft, onSave, saving, saveError }) {
  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

  const isIntraState = draft.cgstRate > 0;

  return (
    <div className="mt-6 border border-blue-200 rounded-lg bg-blue-50/30">
      <div className="px-5 py-3 border-b border-blue-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-800">Draft Preview — {draft.invoiceNumber}</span>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-medium">NOT SAVED</span>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        {/* Recipient */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
          <p className="font-bold text-gray-900">{draft.recipient.header}</p>
          <p className="text-gray-700">{draft.recipient.legalName}</p>
          <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">{draft.recipient.address}</p>
          <p className="text-gray-500 text-xs">{draft.recipient.state} — {draft.recipient.stateCode}</p>
          <p className="font-mono text-xs text-gray-700 mt-1">GSTIN: {draft.recipient.gstin}</p>
        </div>

        {/* Supplier */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill From</p>
          <p className="font-bold text-gray-900">{draft.supplier.legalName}</p>
          <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">{draft.supplier.address}</p>
          <p className="text-gray-500 text-xs">{draft.supplier.state} — {draft.supplier.stateCode}</p>
          <p className="font-mono text-xs text-gray-700 mt-1">GSTIN: {draft.supplier.gstin}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="px-5 pb-4">
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Line Item</th>
                <th className="px-4 py-2 text-right">Taxable Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-800">{draft.description}</td>
                <td className="px-4 py-3 text-gray-600">{draft.lineItemText || '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">₹{fmt(draft.taxableValue)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax rows */}
          <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 text-sm">
            {isIntraState ? (
              <>
                <TaxRow label={`CGST @ ${draft.cgstRate}%`} amount={draft.cgstAmount} />
                <TaxRow label={`SGST @ ${draft.sgstRate}%`} amount={draft.sgstAmount} />
              </>
            ) : (
              <TaxRow label={`IGST @ ${draft.igstRate}%`} amount={draft.igstAmount} />
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="font-mono">₹{fmt(draft.totalAmount)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2 italic">{draft.totalInWords}</p>

        {/* Policy samples */}
        {draft.policySamples?.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer select-none hover:text-gray-700">
              Policy samples ({draft.policyCount} total, showing up to 5)
            </summary>
            <ul className="mt-2 text-xs text-gray-600 space-y-0.5 list-disc ml-5">
              {draft.policySamples.map((p, i) => (
                <li key={i}>{p.policyNumber} — {p.customerName} ({p.category}) — ₹{fmt(p.commission)}</li>
              ))}
            </ul>
          </details>
        )}

        {draft.policyCount === 0 && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            No policies found for this insurer and month. The invoice will have a zero taxable value.
          </p>
        )}
      </div>

      <div className="px-5 py-4 border-t border-blue-200 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Invoice'}
        </button>
        <span className="text-xs text-gray-500">This will issue and lock the invoice.</span>
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}

function TaxRow({ label, amount }) {
  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="font-mono">₹{fmt(amount)}</span>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    DRAFT:     'bg-yellow-100 text-yellow-700',
    FINALIZED: 'bg-green-100 text-green-700',
    ISSUED:    'bg-green-100 text-green-700',   // legacy alias
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
