import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Field, Input, Select, Textarea } from '../components/FormField';
import { fetchAllLeadMembers } from '../api/masters';
import {
  fetchIncentiveSettings, updateIncentiveSettings,
  fetchDailyIncentives, createDailyIncentive, updateDailyIncentive, deleteDailyIncentive,
  fetchWeeklyIncentiveReport, downloadWeeklyIncentiveXlsx,
} from '../api/dailyIncentives';

// Filename-safe blob download helper
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const fmt = (n) =>
  '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Local-calendar-date helpers (avoid toISOString(), which shifts to UTC and
// can land on the wrong calendar day for timezones ahead of UTC, e.g. IST).
function toLocalISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const todayISO = () => toLocalISODate(new Date());

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

const TABS = [
  { key: 'entries', label: 'Daily Entries' },
  { key: 'weekly', label: 'Weekly Report' },
  { key: 'settings', label: 'Settings', adminOnly: true },
];

export default function DailyIncentives() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState('entries');
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState(null);

  const loadSettings = useCallback(() => {
    fetchIncentiveSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAllLeadMembers()
      .then((members) => setEmployees(members.filter((m) => m.leadType === 'LEAD_EXECUTIVE' && m.active)))
      .catch(() => {});
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Incentives — Daily Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">
          Daily call activity tracking and configurable points-based incentive calculation.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
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

      {tab === 'entries' && <EntriesTab employees={employees} isAdmin={isAdmin} settings={settings} />}
      {tab === 'weekly' && <WeeklyReportTab employees={employees} />}
      {tab === 'settings' && isAdmin && <SettingsTab settings={settings} onSaved={loadSettings} />}
    </div>
  );
}

// ─── Daily Entries Tab ──────────────────────────────────────────────────────

function EntriesTab({ employees, isAdmin, settings }) {
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [editing, setEditing] = useState(null); // null | 'NEW' | { ...entry }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback((p = 1) => {
    setLoading(true);
    setError('');
    const params = { page: p, limit: 20 };
    if (filterEmployee) params.employeeId = filterEmployee;
    if (filterDateFrom) params.dateFrom = filterDateFrom;
    if (filterDateTo) params.dateTo = filterDateTo;
    fetchDailyIncentives(params)
      .then((res) => { setEntries(res.data); setMeta(res.meta); })
      .catch(() => setError('Failed to load incentive entries.'))
      .finally(() => setLoading(false));
  }, [filterEmployee, filterDateFrom, filterDateTo]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  function handlePageChange(p) {
    setPage(p);
    load(p);
  }

  async function confirmAndDelete() {
    const entry = confirmDelete;
    if (!entry) return;
    setDeleting(entry.id);
    try {
      await deleteDailyIncentive(entry.id);
      setConfirmDelete(null);
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
          <label className="text-xs font-medium text-gray-600">Employee</label>
          <Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">From</label>
          <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">To</label>
          <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
        {(filterEmployee || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterEmployee(''); setFilterDateFrom(''); setFilterDateTo(''); }}
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
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No incentive entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Employee', 'Total Calls', 'Touch Base', 'Interested', 'Follow Up', 'Conversion', 'Points', 'Amount', 'Remarks', isAdmin ? 'Actions' : null]
                    .filter(Boolean)
                    .map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((en) => (
                  <tr key={en.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{fmtDate(en.date)}</td>
                    <td className="px-4 py-3 text-gray-800">{en.employee?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{en.totalCalls}</td>
                    <td className="px-4 py-3 text-gray-600">{en.touchBase}</td>
                    <td className="px-4 py-3 text-gray-600">{en.interested}</td>
                    <td className="px-4 py-3 text-gray-600">{en.followUp}</td>
                    <td className="px-4 py-3 text-gray-600">{en.conversion}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(en.calculatedPoints)}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">{fmt(en.calculatedAmount)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{en.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(en)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(en)}
                            disabled={deleting === en.id}
                            className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === en.id ? '…' : 'Delete'}
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
        <EntryModal
          entry={editing === 'NEW' ? null : editing}
          employees={employees}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Incentive Entry"
          message={`Are you sure you want to delete the incentive entry for "${confirmDelete.employee?.name}" on ${fmtDate(confirmDelete.date)}? This cannot be undone.`}
          confirmLabel={deleting === confirmDelete.id ? 'Deleting…' : 'Delete'}
          confirming={deleting === confirmDelete.id}
          onConfirm={confirmAndDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

// ─── Modals ─────────────────────────────────────────────────────────────────

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

function ConfirmModal({ title, message, confirmLabel = 'Confirm', confirming = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add/Edit Entry Modal ───────────────────────────────────────────────────

function EntryModal({ entry, employees, settings, onClose, onSaved }) {
  const isNew = !entry;
  const [form, setForm] = useState({
    employeeId: entry?.employeeId ? String(entry.employeeId) : '',
    date:       entry?.date ? entry.date.slice(0, 10) : todayISO(),
    totalCalls: entry ? String(entry.totalCalls) : '',
    touchBase:  entry ? String(entry.touchBase) : '',
    interested: entry ? String(entry.interested) : '',
    followUp:   entry ? String(entry.followUp) : '',
    conversion: entry ? String(entry.conversion) : '',
    remarks:    entry?.remarks ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  const n = (v) => Number(v) || 0;
  const previewPoints = settings ? round2(
    n(form.touchBase) * Number(settings.touchBasePoints) +
    n(form.interested) * Number(settings.interestedPoints) +
    n(form.followUp) * Number(settings.followUpPoints) +
    n(form.conversion) * Number(settings.conversionPoints)
  ) : 0;
  const previewAmount = settings ? round2(previewPoints * Number(settings.amountPerPoint)) : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.employeeId) { setError('Employee is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }

    for (const [key, label] of [
      ['totalCalls', 'Total Calls Made'], ['touchBase', 'Touch Base'], ['interested', 'Interested'],
      ['followUp', 'Follow Up'], ['conversion', 'Conversion'],
    ]) {
      if (form[key] === '' || !Number.isInteger(Number(form[key])) || Number(form[key]) < 0) {
        setError(`${label} must be a non-negative whole number.`);
        return;
      }
    }

    setSaving(true);
    const payload = {
      employeeId: parseInt(form.employeeId),
      date: form.date,
      totalCalls: Number(form.totalCalls),
      touchBase: Number(form.touchBase),
      interested: Number(form.interested),
      followUp: Number(form.followUp),
      conversion: Number(form.conversion),
      remarks: form.remarks.trim() || undefined,
    };

    try {
      const result = isNew
        ? await createDailyIncentive(payload)
        : await updateDailyIncentive(entry.id, payload);
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0] || 'Failed to save incentive entry.');
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add Daily Entry' : 'Edit Daily Entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
        )}

        <Field label="Employee" required>
          <Select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Calls Made" required>
            <Input type="number" min="0" step="1" value={form.totalCalls} onChange={(e) => set('totalCalls', e.target.value)} />
          </Field>
          <Field label="Touch Base" required>
            <Input type="number" min="0" step="1" value={form.touchBase} onChange={(e) => set('touchBase', e.target.value)} />
          </Field>
          <Field label="Interested" required>
            <Input type="number" min="0" step="1" value={form.interested} onChange={(e) => set('interested', e.target.value)} />
          </Field>
          <Field label="Follow Up" required>
            <Input type="number" min="0" step="1" value={form.followUp} onChange={(e) => set('followUp', e.target.value)} />
          </Field>
          <Field label="Conversion" required>
            <Input type="number" min="0" step="1" value={form.conversion} onChange={(e) => set('conversion', e.target.value)} />
          </Field>
        </div>

        <Field label="Remarks">
          <Textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Optional" />
        </Field>

        <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 space-y-1">
          <div className="flex items-center justify-between">
            <span>Calculated Points</span>
            <span className="font-mono font-semibold">{previewPoints}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Calculated Amount</span>
            <span className="font-mono font-semibold">{fmt(previewAmount)}</span>
          </div>
          {!settings && <p className="text-xs text-blue-600 pt-1">Loading point settings…</p>}
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

// ─── Weekly Report Tab ──────────────────────────────────────────────────────

function defaultWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? 6 : day - 1); // back to Monday
  d.setDate(d.getDate() - diff);
  return toLocalISODate(d);
}

function defaultWeekEnd(start) {
  const d = parseLocalDate(start);
  d.setDate(d.getDate() + 6);
  return toLocalISODate(d);
}

function WeeklyReportTab({ employees }) {
  const [weekStart, setWeekStart] = useState(defaultWeekStart());
  const [weekEnd, setWeekEnd] = useState(() => defaultWeekEnd(defaultWeekStart()));
  const [filterEmployee, setFilterEmployee] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    if (!weekStart || !weekEnd) return;
    setLoading(true);
    setError('');
    const params = { weekStart, weekEnd };
    if (filterEmployee) params.employeeId = filterEmployee;
    fetchWeeklyIncentiveReport(params)
      .then(setData)
      .catch(() => setError('Failed to load weekly report.'))
      .finally(() => setLoading(false));
  }, [weekStart, weekEnd, filterEmployee]);

  useEffect(() => { load(); }, [load]);

  async function exportXlsx() {
    if (!weekStart || !weekEnd) return;
    setExporting(true);
    setError('');
    try {
      const params = { weekStart, weekEnd };
      if (filterEmployee) params.employeeId = filterEmployee;
      const blob = await downloadWeeklyIncentiveXlsx(params);
      downloadBlob(blob, `Weekly_Incentive_Report_${weekStart}_to_${weekEnd}.xlsx`);
    } catch {
      setError('Failed to export weekly report.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Week Start</label>
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Week End</label>
          <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Employee</label>
          <Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
        {filterEmployee && (
          <button onClick={() => setFilterEmployee('')} className="text-xs text-blue-600 hover:underline">
            Clear filter
          </button>
        )}
        <button
          onClick={exportXlsx}
          disabled={exporting || !weekStart || !weekEnd}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'Exporting…' : 'Download Excel'}
        </button>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : !data || data.employees.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No incentive data for this week.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Employee', 'Total Calls', 'Touch Base', 'Interested', 'Follow Up', 'Conversion', 'Total Points', 'Total Incentive Amount'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.employees.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium">{row.employeeName}</td>
                    <td className="px-4 py-3 text-gray-600">{row.totalCalls}</td>
                    <td className="px-4 py-3 text-gray-600">{row.touchBase}</td>
                    <td className="px-4 py-3 text-gray-600">{row.interested}</td>
                    <td className="px-4 py-3 text-gray-600">{row.followUp}</td>
                    <td className="px-4 py-3 text-gray-600">{row.conversion}</td>
                    <td className="px-4 py-3 text-gray-600">{row.totalPoints}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">{fmt(row.totalIncentiveAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-gray-800">Overall</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.totalCalls}</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.touchBase}</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.interested}</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.followUp}</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.conversion}</td>
                  <td className="px-4 py-3 text-gray-700">{data.overall.totalPoints}</td>
                  <td className="px-4 py-3 text-gray-900 font-mono">{fmt(data.overall.totalIncentiveAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ─── Settings Tab (Admin only) ──────────────────────────────────────────────

function SettingsTab({ settings, onSaved }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        touchBasePoints: String(settings.touchBasePoints),
        interestedPoints: String(settings.interestedPoints),
        followUpPoints: String(settings.followUpPoints),
        conversionPoints: String(settings.conversionPoints),
        amountPerPoint: String(settings.amountPerPoint),
      });
    }
  }, [settings]);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    for (const [key, label] of [
      ['touchBasePoints', 'Touch Base Points'], ['interestedPoints', 'Interested Points'],
      ['followUpPoints', 'Follow Up Points'], ['conversionPoints', 'Conversion Points'],
      ['amountPerPoint', 'Amount Per Point'],
    ]) {
      if (form[key] === '' || isNaN(Number(form[key])) || Number(form[key]) < 0) {
        setError(`${label} must be a non-negative number.`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateIncentiveSettings({
        touchBasePoints: Number(form.touchBasePoints),
        interestedPoints: Number(form.interestedPoints),
        followUpPoints: Number(form.followUpPoints),
        conversionPoints: Number(form.conversionPoints),
        amountPerPoint: Number(form.amountPerPoint),
      });
      setSuccess('Settings saved.');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.errors?.[0] || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-6 py-12 text-sm text-gray-400">
        Loading settings…
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 max-w-xl">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Incentive Point Settings</h2>
      <p className="text-xs text-gray-500 mb-4">
        Configure the point values and amount-per-point used to calculate daily incentive entries.
        These values default to 0 — set them before relying on calculated amounts.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{success}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Touch Base Points" required>
            <Input type="number" min="0" step="0.01" value={form.touchBasePoints} onChange={(e) => set('touchBasePoints', e.target.value)} />
          </Field>
          <Field label="Interested Points" required>
            <Input type="number" min="0" step="0.01" value={form.interestedPoints} onChange={(e) => set('interestedPoints', e.target.value)} />
          </Field>
          <Field label="Follow Up Points" required>
            <Input type="number" min="0" step="0.01" value={form.followUpPoints} onChange={(e) => set('followUpPoints', e.target.value)} />
          </Field>
          <Field label="Conversion Points" required>
            <Input type="number" min="0" step="0.01" value={form.conversionPoints} onChange={(e) => set('conversionPoints', e.target.value)} />
          </Field>
        </div>

        <Field label="Amount Per Point (₹)" required>
          <Input type="number" min="0" step="0.01" value={form.amountPerPoint} onChange={(e) => set('amountPerPoint', e.target.value)} />
        </Field>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </section>
  );
}
