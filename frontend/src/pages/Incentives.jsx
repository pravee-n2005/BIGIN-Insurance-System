import { useEffect, useState, useCallback, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { Field, Input, Select } from '../components/FormField';
import { fetchAllLeadMembers } from '../api/masters';
import {
  fetchIncentives, createIncentive, updateIncentive, deleteIncentive,
  fetchExecutiveWiseReport, fetchMonthWiseReport,
} from '../api/incentives';

const fmt = (n) =>
  '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const monthLabel = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const TABS = [
  { key: 'entries',    label: 'Entries' },
  { key: 'executive',  label: 'Executive-wise Report' },
  { key: 'month',      label: 'Month-wise Report' },
];

export default function Incentives() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState('entries');
  const [executives, setExecutives] = useState([]);

  useEffect(() => {
    fetchAllLeadMembers()
      .then((members) => setExecutives(members.filter((m) => m.leadType === 'LEAD_EXECUTIVE')))
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Lead Executive Incentives</h1>
        <p className="text-sm text-gray-500 mt-1">Monthly incentive points and auto-calculated amounts for Lead Executives.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'entries' && <EntriesTab executives={executives} isAdmin={isAdmin} />}
      {tab === 'executive' && <ExecutiveWiseReport executives={executives} />}
      {tab === 'month' && <MonthWiseReport executives={executives} />}
    </div>
  );
}

// ─── Entries Tab ────────────────────────────────────────────────────────────

function EntriesTab({ executives, isAdmin }) {
  const [incentives, setIncentives] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [filterExecutive, setFilterExecutive] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [editing, setEditing] = useState(null); // null | 'NEW' | { ...incentive }
  const [deleting, setDeleting] = useState(null);

  const load = useCallback((p = 1) => {
    setLoading(true);
    setError('');
    const params = { page: p, limit: 20 };
    if (filterExecutive) params.leadMemberId = filterExecutive;
    if (filterMonth) params.month = filterMonth;
    else if (filterYear) params.year = filterYear;
    fetchIncentives(params)
      .then((res) => { setIncentives(res.data); setMeta(res.meta); })
      .catch(() => setError('Failed to load incentives.'))
      .finally(() => setLoading(false));
  }, [filterExecutive, filterMonth, filterYear]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  function handlePageChange(p) {
    setPage(p);
    load(p);
  }

  async function handleDelete(incentive) {
    if (!window.confirm(`Delete incentive entry for ${incentive.leadMember?.name} — ${monthLabel(incentive.month)}?`)) return;
    setDeleting(incentive.id);
    try {
      await deleteIncentive(incentive.id);
      load(page);
    } catch {
      setError('Failed to delete incentive entry.');
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved() {
    setEditing(null);
    load(page);
  }

  return (
    <>
      {/* Filters + actions */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Lead Executive</label>
          <Select value={filterExecutive} onChange={(e) => setFilterExecutive(e.target.value)}>
            <option value="">All executives</option>
            {executives.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Month</label>
          <Input type="month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setFilterYear(''); }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Year</label>
          <Input
            type="number"
            placeholder="e.g. 2026"
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); }}
          />
        </div>
        {(filterExecutive || filterMonth || filterYear) && (
          <button
            onClick={() => { setFilterExecutive(''); setFilterMonth(''); setFilterYear(''); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setEditing('NEW')}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Entry
          </button>
        )}
      </section>

      {/* List */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : incentives.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No incentive entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Lead Executive', 'Month', 'Points', 'Point Value', 'Incentive Amount', 'Remarks', isAdmin ? 'Actions' : null]
                    .filter(Boolean)
                    .map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incentives.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium">{inc.leadMember?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{monthLabel(inc.month)}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(inc.points)}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(inc.pointValue).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">{fmt(inc.incentiveAmount)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{inc.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(inc)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(inc)}
                            disabled={deleting === inc.id}
                            className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === inc.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    )}
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

      {editing && (
        <IncentiveModal
          incentive={editing === 'NEW' ? null : editing}
          executives={executives}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

// ─── Add/Edit Modal ─────────────────────────────────────────────────────────

const DEFAULT_POINT_VALUE = 0.50;

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IncentiveModal({ incentive, executives, onClose, onSaved }) {
  const isNew = !incentive;
  const [form, setForm] = useState({
    leadMemberId: incentive?.leadMemberId ? String(incentive.leadMemberId) : '',
    month:        incentive?.month ?? '',
    points:       incentive ? String(incentive.points) : '',
    pointValue:   incentive ? String(incentive.pointValue) : String(DEFAULT_POINT_VALUE),
    remarks:      incentive?.remarks ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  const points = Number(form.points) || 0;
  const pointValue = form.pointValue === '' ? DEFAULT_POINT_VALUE : Number(form.pointValue) || 0;
  const previewAmount = Math.round((points * pointValue + Number.EPSILON) * 100) / 100;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.leadMemberId) { setError('Lead Executive is required.'); return; }
    if (!form.month) { setError('Month is required.'); return; }
    if (form.points === '' || Number(form.points) < 0) { setError('Points must be a non-negative number.'); return; }

    setSaving(true);
    const payload = {
      leadMemberId: parseInt(form.leadMemberId),
      month: form.month,
      points: Number(form.points),
      pointValue: form.pointValue === '' ? undefined : Number(form.pointValue),
      remarks: form.remarks.trim() || undefined,
    };

    try {
      const result = isNew
        ? await createIncentive(payload)
        : await updateIncentive(incentive.id, payload);
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0] || 'Failed to save incentive entry.');
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add Incentive Entry' : 'Edit Incentive Entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
        )}

        <Field label="Lead Executive" required>
          <Select value={form.leadMemberId} onChange={(e) => set('leadMemberId', e.target.value)}>
            <option value="">Select lead executive…</option>
            {executives.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}{!ex.active ? ' (Inactive)' : ''}</option>
            ))}
          </Select>
        </Field>

        <Field label="Month" required>
          <Input type="month" value={form.month} onChange={(e) => set('month', e.target.value)} />
        </Field>

        <Field label="Points" required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.points}
            onChange={(e) => set('points', e.target.value)}
            placeholder="e.g. 100"
          />
        </Field>

        <Field label="Point Value">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.pointValue}
            onChange={(e) => set('pointValue', e.target.value)}
            placeholder={`Default ${DEFAULT_POINT_VALUE.toFixed(2)}`}
          />
          <p className="mt-1 text-xs text-gray-500">Defaults to {DEFAULT_POINT_VALUE.toFixed(2)} if left blank.</p>
        </Field>

        <Field label="Remarks">
          <Input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Optional" />
        </Field>

        <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex items-center justify-between">
          <span>Incentive Amount</span>
          <span className="font-mono font-semibold">{fmt(previewAmount)}</span>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : isNew ? 'Add Entry' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Executive-wise Report ──────────────────────────────────────────────────

function ExecutiveWiseReport({ executives }) {
  const [year, setYear] = useState('');
  const [filterExecutive, setFilterExecutive] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (year) params.year = year;
    if (filterExecutive) params.leadMemberId = filterExecutive;
    fetchExecutiveWiseReport(params)
      .then(setData)
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [year, filterExecutive]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Lead Executive</label>
          <Select value={filterExecutive} onChange={(e) => setFilterExecutive(e.target.value)}>
            <option value="">All executives</option>
            {executives.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Year</label>
          <Input type="number" placeholder="e.g. 2026" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        {(year || filterExecutive) && (
          <button onClick={() => { setYear(''); setFilterExecutive(''); }} className="text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No incentive data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Lead Executive', 'Status', 'Total Points', 'Total Incentive Amount', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row) => (
                  <Fragment key={row.leadMemberId}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{row.leadMemberName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${row.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {row.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.totalPoints}</td>
                      <td className="px-4 py-3 text-gray-900 font-mono font-medium">{fmt(row.totalIncentiveAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpanded(expanded === row.leadMemberId ? null : row.leadMemberId)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {expanded === row.leadMemberId ? 'Hide months' : 'Show months'}
                        </button>
                      </td>
                    </tr>
                    {expanded === row.leadMemberId && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-gray-50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 uppercase tracking-wide">
                                <th className="px-3 py-1 text-left">Month</th>
                                <th className="px-3 py-1 text-left">Points</th>
                                <th className="px-3 py-1 text-left">Point Value</th>
                                <th className="px-3 py-1 text-left">Incentive Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.months.map((m) => (
                                <tr key={m.month} className="border-t border-gray-200">
                                  <td className="px-3 py-1.5">{monthLabel(m.month)}</td>
                                  <td className="px-3 py-1.5">{Number(m.points)}</td>
                                  <td className="px-3 py-1.5">{Number(m.pointValue).toFixed(2)}</td>
                                  <td className="px-3 py-1.5 font-mono">{fmt(m.incentiveAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ─── Month-wise Report ──────────────────────────────────────────────────────

function MonthWiseReport({ executives }) {
  const [year, setYear] = useState('');
  const [filterExecutive, setFilterExecutive] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (year) params.year = year;
    if (filterExecutive) params.leadMemberId = filterExecutive;
    fetchMonthWiseReport(params)
      .then(setData)
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [year, filterExecutive]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Lead Executive</label>
          <Select value={filterExecutive} onChange={(e) => setFilterExecutive(e.target.value)}>
            <option value="">All executives</option>
            {executives.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Year</label>
          <Input type="number" placeholder="e.g. 2026" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        {(year || filterExecutive) && (
          <button onClick={() => { setYear(''); setFilterExecutive(''); }} className="text-xs text-blue-600 hover:underline">
            Clear filters
          </button>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No incentive data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Month', 'Total Points', 'Total Incentive Amount', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row) => (
                  <Fragment key={row.month}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{monthLabel(row.month)}</td>
                      <td className="px-4 py-3 text-gray-600">{row.totalPoints}</td>
                      <td className="px-4 py-3 text-gray-900 font-mono font-medium">{fmt(row.totalIncentiveAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpanded(expanded === row.month ? null : row.month)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {expanded === row.month ? 'Hide executives' : 'Show executives'}
                        </button>
                      </td>
                    </tr>
                    {expanded === row.month && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 bg-gray-50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 uppercase tracking-wide">
                                <th className="px-3 py-1 text-left">Lead Executive</th>
                                <th className="px-3 py-1 text-left">Points</th>
                                <th className="px-3 py-1 text-left">Point Value</th>
                                <th className="px-3 py-1 text-left">Incentive Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.executives.map((ex) => (
                                <tr key={ex.leadMemberId} className="border-t border-gray-200">
                                  <td className="px-3 py-1.5">{ex.leadMemberName}</td>
                                  <td className="px-3 py-1.5">{Number(ex.points)}</td>
                                  <td className="px-3 py-1.5">{Number(ex.pointValue).toFixed(2)}</td>
                                  <td className="px-3 py-1.5 font-mono">{fmt(ex.incentiveAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
