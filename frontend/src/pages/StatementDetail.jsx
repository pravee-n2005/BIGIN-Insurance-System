import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchStatement, fetchAvailablePolicies,
  attachPolicies, updateStatementPolicy, detachPolicy,
  finalizeStatement, generateInvoiceFromStatement, cancelStatement,
  updateCreditDetails,
} from '../api/statements';
import { StatementStatusBadge } from './Statements';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const monthLabel = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [stmt, setStmt]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Action state
  const [actionError, setActionError]   = useState('');
  const [actionBusy,  setActionBusy]    = useState('');  // 'finalize' | 'invoice' | 'cancel' | ''
  const [showAddPolicies, setShowAddPolicies] = useState(false);
  const [confirmCancel,   setConfirmCancel]   = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmInvoice,  setConfirmInvoice]  = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStatement(parseInt(id));
      setStmt(data);
    } catch {
      setError('Statement not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleFinalize() {
    setActionError('');
    setActionBusy('finalize');
    try {
      const updated = await finalizeStatement(stmt.id);
      setStmt(updated);
      setConfirmFinalize(false);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to finalize.');
    } finally {
      setActionBusy('');
    }
  }

  async function handleGenerateInvoice() {
    setActionError('');
    setActionBusy('invoice');
    try {
      const { statement, invoice } = await generateInvoiceFromStatement(stmt.id);
      setStmt(statement);
      setConfirmInvoice(false);
      // Brief delay so user sees the success state before redirect
      setTimeout(() => navigate(`/invoices/${invoice.id}`), 600);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to generate invoice.');
    } finally {
      setActionBusy('');
    }
  }

  async function handleCancel() {
    setActionError('');
    setActionBusy('cancel');
    try {
      const updated = await cancelStatement(stmt.id);
      setStmt(updated);
      setConfirmCancel(false);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to cancel.');
    } finally {
      setActionBusy('');
    }
  }

  async function handleRemovePolicy(spId) {
    if (!window.confirm('Remove this policy from the statement?')) return;
    try {
      await detachPolicy(stmt.id, spId);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to remove policy.');
    }
  }

  async function handleEditPolicy(spId, newValue) {
    try {
      await updateStatementPolicy(stmt.id, spId, newValue);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update.');
      throw err;
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error)   return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!stmt)   return null;

  const isDraft     = stmt.status === 'DRAFT';
  const isFinalized = stmt.status === 'FINALIZED';
  const isInvoiced  = stmt.status === 'INVOICED';
  const isCancelled = stmt.status === 'CANCELLED';

  const policyCount = stmt.policies?.length ?? 0;
  const draftTotal  = stmt.policies?.reduce((s, p) => s + Number(p.taxableValue), 0) ?? 0;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Breadcrumb + status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/statements" className="text-sm text-blue-600 hover:underline">← GST Module</Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm font-semibold text-gray-900">{stmt.statementRefNo}</span>
        <StatementStatusBadge status={stmt.status} />
      </div>

      {actionError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {actionError}
        </div>
      )}

      {/* Status-aware banner */}
      {isFinalized && (
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-3">
          Statement is finalized. Review the totals below and generate the GST invoice when ready.
        </div>
      )}
      {isInvoiced && stmt.invoice && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3 flex items-center gap-2">
          <span>GST Invoice generated:</span>
          <Link to={`/invoices/${stmt.invoice.id}`} className="font-mono font-semibold hover:underline">
            {stmt.invoice.invoiceNumber}
          </Link>
        </div>
      )}
      {isCancelled && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3">
          This statement is cancelled. Its policies are available for attachment to other statements.
        </div>
      )}

      {/* Metadata card */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Statement Details</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <Meta label="Insurer"          value={stmt.insurer?.name} />
          <Meta label="Business Month"   value={monthLabel(stmt.businessMonth)} />
          <Meta label="Statement Date"   value={fmtDate(stmt.statementDate)} />
          <Meta label="Credit Date"      value={fmtDate(stmt.creditDate)} />
          <Meta label="Created By"       value={stmt.createdBy?.name} />
          <Meta label="Created At"       value={fmtDate(stmt.createdAt)} />
          {stmt.remarks && <Meta label="Remarks" value={stmt.remarks} wide />}
          {stmt.statementFileUrl && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Statement File</p>
              <a href={stmt.statementFileUrl} target="_blank" rel="noopener noreferrer"
                 className="text-blue-600 hover:underline text-sm break-all">
                {stmt.statementFileUrl}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Policies */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Attached Policies</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {policyCount} {policyCount === 1 ? 'policy' : 'policies'}
              {isDraft && ' — admin enters actual taxable value per policy'}
            </p>
          </div>
          {isAdmin && isDraft && (
            <button
              onClick={() => setShowAddPolicies(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Policies
            </button>
          )}
        </div>

        {policyCount === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No policies attached yet.
            {isAdmin && isDraft && ' Click "+ Add Policies" to begin.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Policy No.', 'Customer', 'Category', 'Product', 'Issue Date', 'Net Premium', 'System Estimate', 'Taxable Value', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stmt.policies.map((sp) => (
                  <AttachedRow
                    key={sp.id}
                    sp={sp}
                    editable={isAdmin && isDraft}
                    onSave={(val) => handleEditPolicy(sp.id, val)}
                    onRemove={() => handleRemovePolicy(sp.id)}
                  />
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold text-gray-700">
                    {isDraft ? 'Running Total (will be frozen on finalize)' : 'Total Taxable Value'}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">
                    ₹{fmt(isDraft ? draftTotal : stmt.totalTaxableValue)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* GST breakdown — visible from FINALIZED onwards */}
      {(isFinalized || isInvoiced || isCancelled) && (
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Frozen GST Breakdown</h2>
          </div>
          <div className="px-6 py-5">
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              <SummaryRow label="Taxable Value"  value={stmt.totalTaxableValue} />
              {Number(stmt.cgstRate) > 0 ? (
                <>
                  <SummaryRow label={`CGST @ ${Number(stmt.cgstRate)}%`} value={stmt.cgstAmount} />
                  <SummaryRow label={`SGST @ ${Number(stmt.sgstRate)}%`} value={stmt.sgstAmount} />
                </>
              ) : (
                <SummaryRow label={`IGST @ ${Number(stmt.igstRate)}%`} value={stmt.igstAmount} />
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Invoice Value</span>
                <span className="font-mono">₹{fmt(stmt.invoiceValue)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Module 4 — Credit Details panel (INVOICED only) */}
      {isInvoiced && (
        <CreditDetailsPanel
          statement={stmt}
          editable={isAdmin}
          onSaved={(updated) => setStmt(updated)}
        />
      )}

      {/* Action bar */}
      {isAdmin && !isCancelled && (
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-4 flex flex-wrap items-center gap-3">
          {isDraft && (
            <button
              onClick={() => setConfirmFinalize(true)}
              disabled={policyCount === 0}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={policyCount === 0 ? 'Attach at least one policy first' : ''}
            >
              Finalize Statement
            </button>
          )}
          {isFinalized && (
            <button
              onClick={() => setConfirmInvoice(true)}
              className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
            >
              Generate GST Invoice
            </button>
          )}

          {/* Cancel — blocked for INVOICED statements whose invoice is still active */}
          {isInvoiced && stmt.invoice && stmt.invoice.status !== 'CANCELLED' ? (
            <div className="ml-auto flex items-center gap-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 max-w-sm">
                Invoice{' '}
                <Link
                  to={`/invoices/${stmt.invoice.id}`}
                  className="font-mono font-semibold hover:underline"
                >
                  {stmt.invoice.invoiceNumber}
                </Link>
                {' '}must be cancelled before this statement can be cancelled.
              </p>
              <button
                disabled
                className="px-4 py-2 border border-red-200 text-red-300 text-sm font-medium rounded-md cursor-not-allowed"
                title="Cancel the linked invoice first"
              >
                Cancel Statement
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              className="ml-auto px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              Cancel Statement
            </button>
          )}
        </section>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {showAddPolicies && (
        <AddPoliciesModal
          statement={stmt}
          onClose={() => setShowAddPolicies(false)}
          onAttached={() => { setShowAddPolicies(false); load(); }}
        />
      )}

      {confirmFinalize && (
        <ConfirmModal
          title="Finalize Statement"
          message={`Finalize ${stmt.statementRefNo}? Totals and GST split will be locked. You can still cancel the statement, but you cannot edit policies after this step.`}
          confirmLabel="Yes, Finalize"
          confirmStyle="bg-blue-600 hover:bg-blue-700"
          busy={actionBusy === 'finalize'}
          onConfirm={handleFinalize}
          onClose={() => setConfirmFinalize(false)}
        />
      )}

      {confirmInvoice && (
        <ConfirmModal
          title="Generate GST Invoice"
          message={`Generate a GST tax invoice (BG###) for ${stmt.statementRefNo}? This will create a finalized Invoice record and mark the statement as INVOICED.`}
          confirmLabel="Yes, Generate Invoice"
          confirmStyle="bg-green-600 hover:bg-green-700"
          busy={actionBusy === 'invoice'}
          onConfirm={handleGenerateInvoice}
          onClose={() => setConfirmInvoice(false)}
        />
      )}

      {confirmCancel && (
        <ConfirmModal
          title="Cancel Statement"
          message={`Cancel ${stmt.statementRefNo}? The record is preserved. Its policies will become available for attachment to other statements.`}
          confirmLabel="Yes, Cancel Statement"
          confirmStyle="bg-red-600 hover:bg-red-700"
          busy={actionBusy === 'cancel'}
          onConfirm={handleCancel}
          onClose={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Meta({ label, value, wide }) {
  return (
    <div className={wide ? 'col-span-2 md:col-span-4' : ''}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="font-mono">₹{fmt(value)}</span>
    </div>
  );
}

// ─── Inline-editable attached policy row ──────────────────────────────────────

function AttachedRow({ sp, editable, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(String(sp.taxableValue));
  const [saving,  setSaving]  = useState(false);

  async function save() {
    if (Number(value) < 0 || isNaN(Number(value))) return;
    setSaving(true);
    try {
      await onSave(Number(value));
      setEditing(false);
    } catch { /* parent shows error */ }
    finally { setSaving(false); }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-xs text-gray-800">{sp.policy.policyNumber}</td>
      <td className="px-4 py-3 text-gray-700">{sp.policy.customerName}</td>
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
          {sp.policy.insuranceCategory}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-xs">{sp.policy.productName}</td>
      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmtDate(sp.policy.issueDate)}</td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs">₹{fmt(sp.policy.netPremium)}</td>
      <td className="px-4 py-3 text-gray-400 font-mono text-xs">₹{fmt(sp.policy.commissionAmount)}</td>
      <td className="px-4 py-3 font-mono font-semibold text-gray-900">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 border border-blue-300 rounded px-2 py-1 text-sm"
              autoFocus
            />
            <button onClick={save} disabled={saving}
              className="text-xs text-green-600 hover:underline">{saving ? '…' : 'Save'}</button>
            <button onClick={() => { setEditing(false); setValue(String(sp.taxableValue)); }}
              className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        ) : (
          <span>₹{fmt(sp.taxableValue)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editable && !editing && (
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
            <button onClick={onRemove} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Add Policies modal ───────────────────────────────────────────────────────

function AddPoliciesModal({ statement, onClose, onAttached }) {
  const [available, setAvailable] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [serverError, setServerError] = useState('');
  const [saving,    setSaving]    = useState(false);

  // selected[policyId] = taxableValueString
  const [selected, setSelected] = useState({});

  // Optional filter — only show policies issued in the statement's business month
  const [restrictToMonth, setRestrictToMonth] = useState(false);

  useEffect(() => {
    loadAvailable();
    // eslint-disable-next-line
  }, [restrictToMonth]);

  async function loadAvailable() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAvailablePolicies(
        statement.insurer.id,
        restrictToMonth ? statement.businessMonth : undefined
      );
      setAvailable(data);
    } catch {
      setError('Failed to load available policies.');
    } finally {
      setLoading(false);
    }
  }

  function toggle(p) {
    setSelected((s) => {
      const next = { ...s };
      if (p.id in next) delete next[p.id];
      else next[p.id] = String(p.commissionAmount);   // default = system estimate
      return next;
    });
  }

  function setTaxable(pid, value) {
    setSelected((s) => ({ ...s, [pid]: value }));
  }

  const selectedCount = Object.keys(selected).length;
  const selectedTotal = Object.values(selected).reduce((s, v) => s + (Number(v) || 0), 0);

  async function handleAttach() {
    setServerError('');
    if (selectedCount === 0) return;
    setSaving(true);
    try {
      const policies = Object.entries(selected).map(([pid, val]) => ({
        policyId:     Number(pid),
        taxableValue: Number(val),
      }));
      // Reject negatives client-side (the server will too)
      if (policies.some((p) => isNaN(p.taxableValue) || p.taxableValue < 0)) {
        setServerError('Taxable values must be non-negative numbers.');
        setSaving(false);
        return;
      }
      await attachPolicies(statement.id, policies);
      onAttached();
    } catch (err) {
      const res = err.response?.data;
      if (Array.isArray(res?.errors)) setServerError(res.errors.join(' '));
      else setServerError(res?.error || 'Failed to attach policies.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add Policies — {statement.insurer.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select policies and enter the actual taxable value (brokerage credited) per policy.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={restrictToMonth}
              onChange={(e) => setRestrictToMonth(e.target.checked)}
            />
            Only show policies issued in {monthLabel(statement.businessMonth)}
          </label>
          <span className="ml-auto text-gray-500">
            {available.length} available
            {selectedCount > 0 && ` · ${selectedCount} selected · ₹${fmt(selectedTotal)} total`}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}
          {loading ? (
            <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
          ) : available.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              No available policies for this insurer
              {restrictToMonth && ` in ${monthLabel(statement.businessMonth)}`}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['', 'Policy No.', 'Customer', 'Category', 'Product', 'Issue Date', 'Net Premium', 'System Estimate', 'Taxable Value (₹)'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {available.map((p) => {
                  const isSelected = p.id in selected;
                  return (
                    <tr key={p.id} className={isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggle(p)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-800">{p.policyNumber}</td>
                      <td className="px-3 py-2 text-gray-700">{p.customerName}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                          {p.insuranceCategory}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{p.productName}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{fmtDate(p.issueDate)}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">₹{fmt(p.netPremium)}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">₹{fmt(p.commissionAmount)}</td>
                      <td className="px-3 py-2">
                        {isSelected ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={selected[p.id]}
                            onChange={(e) => setTaxable(p.id, e.target.value)}
                            className="w-28 border border-blue-300 rounded px-2 py-1 text-sm text-right font-mono"
                          />
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          {serverError && <span className="text-sm text-red-600 mr-auto">{serverError}</span>}
          <button
            onClick={handleAttach}
            disabled={saving || selectedCount === 0}
            className="ml-auto px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Attaching…' : `Attach ${selectedCount} ${selectedCount === 1 ? 'Policy' : 'Policies'}`}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module 4 — Credit Details panel ──────────────────────────────────────────
// Shown only when status === 'INVOICED'. Captures actual money received in the
// bank. The suggested value (invoice value minus calculated TDS) is shown as a
// hint but never auto-saved — admin must enter / confirm the actual amount.

function CreditDetailsPanel({ statement, editable, onSaved }) {
  // Suggested amount = invoiceValue - (totalTaxableValue × 0.10)
  // Uses 10% as the default heuristic. Admin sees this as a typing hint only.
  const taxable      = Number(statement.totalTaxableValue);
  const invoiceValue = Number(statement.invoiceValue);
  const suggested    = invoiceValue - taxable * 0.10;

  const [amountCredited, setAmountCredited] = useState(
    statement.amountCredited !== null && statement.amountCredited !== undefined
      ? String(statement.amountCredited)
      : ''
  );
  const [bankReference, setBankReference] = useState(statement.bankReference ?? '');
  const [bankAccount,   setBankAccount]   = useState(statement.bankAccount ?? '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [success, setSuccess] = useState('');

  const dirty =
    String(statement.amountCredited ?? '') !== amountCredited ||
    (statement.bankReference ?? '') !== bankReference ||
    (statement.bankAccount   ?? '') !== bankAccount;

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        amountCredited: amountCredited === '' ? null : Number(amountCredited),
        bankReference:  bankReference.trim() || null,
        bankAccount:    bankAccount.trim() || null,
      };
      const updated = await updateCreditDetails(statement.id, payload);
      onSaved(updated);
      setSuccess('Credit details saved.');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.join(' ') || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  const variance =
    amountCredited !== '' && !isNaN(Number(amountCredited))
      ? Number(amountCredited) - suggested
      : null;

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Credit Details</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Captured when the brokerage payment hits the bank. Used by the Credits Report.
        </p>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount Credited (₹) {editable && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number" step="0.01" min="0"
            value={amountCredited}
            onChange={(e) => setAmountCredited(e.target.value)}
            disabled={!editable}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          {editable && (
            <p className="text-xs text-gray-500 mt-1">
              Suggested: <span className="font-mono">₹{fmt(suggested)}</span>{' '}
              <button
                type="button"
                onClick={() => setAmountCredited(suggested.toFixed(2))}
                className="text-blue-600 hover:underline ml-1"
              >
                Use suggested
              </button>
              <span className="text-gray-400"> (invoice value − 10% TDS estimate)</span>
            </p>
          )}
          {variance !== null && Math.abs(variance) > 0.01 && (
            <p className={`text-xs mt-1 font-medium ${variance < 0 ? 'text-amber-700' : 'text-blue-700'}`}>
              Variance vs suggested: ₹{fmt(Math.abs(variance))} {variance < 0 ? 'short' : 'over'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Reference</label>
          <input
            type="text"
            value={bankReference}
            onChange={(e) => setBankReference(e.target.value)}
            disabled={!editable}
            placeholder="e.g. S98019073"
            maxLength={100}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            disabled={!editable}
            placeholder="e.g. Bank-1 (Old)"
            maxLength={100}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>
      </div>

      {editable && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Credit Details'}
          </button>
          {success && <span className="text-sm text-green-700">{success}</span>}
          {error   && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </section>
  );
}

// ─── Generic confirmation modal ───────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmStyle, busy, onConfirm, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => !busy && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors ${confirmStyle}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
