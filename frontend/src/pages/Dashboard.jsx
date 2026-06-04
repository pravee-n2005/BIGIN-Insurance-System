import { useEffect, useState } from 'react';
import api from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function monthDisplay(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Month picker ─────────────────────────────────────────────────────────────
// Shows only months that have at least one policy. Months are grouped by year.

function MonthPicker({ availableMonths, selected, onChange }) {
  if (!availableMonths || availableMonths.length === 0) return null;

  // Group by year
  const byYear = {};
  for (const ym of availableMonths) {
    const [y] = ym.split('-');
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(ym);
  }
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Select Month
      </p>
      <div className="space-y-3">
        {years.map((year) => (
          <div key={year}>
            <p className="text-xs font-semibold text-gray-400 mb-1.5">{year}</p>
            <div className="flex flex-wrap gap-1.5">
              {MONTH_NAMES.map((name, idx) => {
                const ym       = `${year}-${String(idx + 1).padStart(2, '0')}`;
                const hasData  = byYear[year].includes(ym);
                const isActive = ym === selected;

                if (!hasData) {
                  // Show empty slot so the grid stays aligned
                  return (
                    <div
                      key={ym}
                      className="w-10 h-8 rounded text-xs flex items-center justify-center text-gray-200 select-none"
                    >
                      {name}
                    </div>
                  );
                }
                return (
                  <button
                    key={ym}
                    onClick={() => onChange(ym)}
                    className={`w-10 h-8 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth,   setSelectedMonth]   = useState('');
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  // Load available months on mount, then default to the most recent one
  useEffect(() => {
    api.get('/reports/months')
      .then((res) => {
        const months = res.data.months ?? [];
        setAvailableMonths(months);
        // Default: most recent month with data (last in sorted array)
        if (months.length > 0) {
          setSelectedMonth(months[months.length - 1]);
        }
      })
      .catch(() => {
        // Fallback: current month
        setSelectedMonth(new Date().toISOString().slice(0, 7));
      });
  }, []);

  // Fetch report whenever selected month changes
  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setError('');
    api.get(`/reports/monthly?month=${selectedMonth}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {selectedMonth
            ? `Monthly summary — ${monthDisplay(selectedMonth)}`
            : 'Monthly summary'}
        </p>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left: month picker */}
        <div className="xl:w-64 flex-shrink-0">
          <MonthPicker
            availableMonths={availableMonths}
            selected={selectedMonth}
            onChange={setSelectedMonth}
          />
        </div>

        {/* Right: stats + table */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stat cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Policies"
                value={data?.totalPolicies ?? 0}
                sub={monthDisplay(selectedMonth)}
              />
              <StatCard
                label="Total Gross Premium"
                value={fmt(data?.totalGrossPremium)}
                sub={monthDisplay(selectedMonth)}
              />
              <StatCard
                label="Total Commission"
                value={fmt(data?.totalCommission)}
                sub={monthDisplay(selectedMonth)}
              />
              <StatCard
                label="Net Receivable"
                value={fmt(data?.totalReceivable)}
                sub="After TDS"
              />
            </div>
          )}

          {/* Recent policies table */}
          {!loading && data?.policies?.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                Policies — {monthDisplay(selectedMonth)}
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Customer','Insurer','Product','Category','Premium','Lead Source','Status'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.policies.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.customerName}</td>
                        <td className="px-4 py-3 text-gray-600">{p.insurerName}</td>
                        <td className="px-4 py-3 text-gray-600">{p.productName}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                            {p.insuranceCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-900">{fmt(p.grossPremium)}</td>
                        <td className="px-4 py-3 text-gray-600">{p.leadSource}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && selectedMonth && data?.totalPolicies === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-400">
              No policies found for {monthDisplay(selectedMonth)}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE:    'bg-green-50 text-green-700',
    PENDING:   'bg-yellow-50 text-yellow-700',
    EXPIRED:   'bg-red-50 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}
