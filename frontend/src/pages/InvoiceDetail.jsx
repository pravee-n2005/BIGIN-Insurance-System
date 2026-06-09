import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { fetchInvoice, downloadInvoicePdf, cancelInvoice, setGstExempt } from '../api/invoices';
import { useAuth } from '../context/AuthContext';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const monthLabel = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const SUPPLIER = {
  legalName: 'Bigin Insurance Brokers Private Limited',
  address:   '26/1 Sree Building, Sarojini Street, T Nagar Chennai 600017',
  state:     'Tamil Nadu',
  stateCode: '033',
  gstin:     '33AALCB7296B1ZN',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [invoice, setInvoice]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [downloading, setDownloading]   = useState(false);
  const [dlError, setDlError]           = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState('');

  useEffect(() => {
    fetchInvoice(parseInt(id))
      .then(setInvoice)
      .catch(() => setError('Invoice not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload() {
    setDlError('');
    setDownloading(true);
    try {
      const blob = await downloadInvoicePdf(invoice.id);
      const url  = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDlError('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleToggleExempt() {
    try {
      const updated = await setGstExempt(invoice.id, !invoice.isGstExempt);
      setInvoice({ ...invoice, isGstExempt: updated.isGstExempt });
    } catch (err) {
      setDlError(err.response?.data?.error || 'Failed to update GST classification.');
    }
  }

  async function handleCancel() {
    setCancelError('');
    setCancelling(true);
    try {
      await cancelInvoice(invoice.id);
      setShowCancelModal(false);
      // Refresh invoice data to reflect new CANCELLED status
      const updated = await fetchInvoice(invoice.id);
      setInvoice(updated);
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Failed to cancel invoice.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error)   return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!invoice) return null;

  const isIntraState = Number(invoice.cgstRate) > 0;
  // Use frozen insurer name snapshot; fall back to live relation name for legacy rows
  const displayInsurerName = invoice.insurerName || invoice.insurer?.name || '—';

  return (
    <div className="p-8 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link to="/invoices" className="text-sm text-blue-600 hover:underline">← Invoices</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-mono font-semibold text-gray-900">{invoice.invoiceNumber}</span>
        <StatusBadge status={invoice.status} />

        <div className="ml-auto flex items-center gap-2">
          {/* Download PDF — only for finalized invoices */}
          {(invoice.status === 'FINALIZED' || invoice.status === 'ISSUED') && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          )}

          {/* Cancel — admin only, not already cancelled */}
          {isAdmin && invoice.status !== 'CANCELLED' && (
            <button
              onClick={() => { setCancelError(''); setShowCancelModal(true); }}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      {dlError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {dlError}
        </div>
      )}

      {/* Invoice card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">

        {/* Top band */}
        <div className="bg-gray-900 px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-lg">BIGIN</p>
            <p className="text-gray-400 text-xs mt-0.5">Tax Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-white font-mono font-semibold text-base">{invoice.invoiceNumber}</p>
            <p className="text-gray-400 text-xs mt-0.5">{fmtDate(invoice.invoiceDate)}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
            <p className="font-bold text-gray-900 text-sm">{SUPPLIER.legalName}</p>
            <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">{SUPPLIER.address}</p>
            <p className="text-gray-500 text-xs">{SUPPLIER.state} — {SUPPLIER.stateCode}</p>
            <p className="font-mono text-xs text-gray-700 mt-1">GSTIN: {SUPPLIER.gstin}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-bold text-gray-900 text-sm">{invoice.recipientHeader}</p>
            <p className="text-gray-700 text-sm">{invoice.recipientLegalName}</p>
            <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">{invoice.recipientAddress}</p>
            <p className="text-gray-500 text-xs">{invoice.recipientState} — {invoice.recipientStateCode}</p>
            <p className="font-mono text-xs text-gray-700 mt-1">GSTIN: {invoice.recipientGstin}</p>
          </div>
        </div>

        {/* Invoice meta */}
        <div className="px-6 py-4 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <MetaField label="Billing Month"  value={monthLabel(invoice.billingMonth)} />
          <MetaField label="Policy Count"   value={invoice.policyCount} />
          <MetaField label="HSN / SAC"      value="997161" />
          <MetaField label="Supply Type"    value={isIntraState ? 'Intra-state (TN)' : 'Inter-state'} />
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-b border-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Particulars</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-4 text-gray-800 font-medium">{invoice.description}</td>
                <td className="px-4 py-4 text-gray-600">{invoice.lineItemText || '—'}</td>
                <td className="px-4 py-4 text-right font-mono text-gray-900">{fmt(invoice.taxableValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tax summary */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <SummaryRow label="Taxable Value" value={fmt(invoice.taxableValue)} />
            {isIntraState ? (
              <>
                <SummaryRow label={`CGST @ ${Number(invoice.cgstRate)}%`} value={fmt(invoice.cgstAmount)} />
                <SummaryRow label={`SGST @ ${Number(invoice.sgstRate)}%`} value={fmt(invoice.sgstAmount)} />
              </>
            ) : (
              <SummaryRow label={`IGST @ ${Number(invoice.igstRate)}%`} value={fmt(invoice.igstAmount)} />
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-300">
              <span>Total Amount</span>
              <span className="font-mono">₹{fmt(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* In words */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-xs text-gray-600 italic">
          Amount in words: <span className="font-medium not-italic text-gray-800">{invoice.totalInWords}</span>
        </div>

        {/* Audit footer */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Insurer</p>
            <p className="text-gray-700">{displayInsurerName}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Created By</p>
            <p className="text-gray-700">{invoice.createdBy?.name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Created At</p>
            <p className="text-gray-700">{fmtDateTime(invoice.createdAt)}</p>
          </div>
        </div>

        {/* Module 4 — GST classification flag (admin only) */}
        {isAdmin && invoice.status !== 'CANCELLED' && (
          <div className="px-6 py-3 border-t border-gray-200 bg-amber-50/40 flex items-center gap-3">
            <input
              type="checkbox"
              id="gst-exempt-toggle"
              checked={!!invoice.isGstExempt}
              onChange={handleToggleExempt}
              className="w-4 h-4"
            />
            <label htmlFor="gst-exempt-toggle" className="text-xs text-gray-700 cursor-pointer">
              <span className="font-semibold">GST-Exempt Invoice</span>
              <span className="text-gray-500 ml-1">
                — when ticked, this invoice's taxable value moves to "EXEMPTED TURNOVER" on the GST Sales Report. Use only for genuinely exempt brokerage cases.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => !cancelling && setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Cancel Invoice</h3>
            <p className="text-sm text-gray-600 mb-1">
              Cancel <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-4">
              The record is never deleted. Status will become CANCELLED and the PDF will no longer be downloadable.
              A new invoice can be generated for the same insurer and month after cancellation.
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
                onClick={() => setShowCancelModal(false)}
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

function MetaField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 font-medium mt-0.5">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="font-mono">₹{value}</span>
    </div>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT:     'bg-yellow-100 text-yellow-700',
    FINALIZED: 'bg-green-100 text-green-700',
    ISSUED:    'bg-green-100 text-green-700',   // legacy
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
