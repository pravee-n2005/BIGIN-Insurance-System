import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/FormField';
import { fetchRenewalWorklist } from '../api/renewals';

// ─── Summary card ───────────────────────────────────────────────────────────

function StatCard({ label, value, tone = 'default' }) {
  const valueColor = tone === 'alert' && Number(value) > 0 ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  );
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'bg-green-50 text-green-700',
    PENDING: 'bg-yellow-50 text-yellow-700',
    EXPIRED: 'bg-red-50 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Quick filter buttons ───────────────────────────────────────────────────

const QUICK_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'TODAY', label: 'Today' },
  { key: '7', label: '7 Days' },
  { key: '15', label: '15 Days' },
  { key: '30', label: '30 Days' },
  { key: '60', label: '60 Days' },
  { key: '90', label: '90 Days' },
  { key: 'OVERDUE', label: 'Overdue' },
];

// Maps the "window" query param (?window=30/60/90, as linked from the
// Dashboard renewal cards) to a quick filter key.
const WINDOW_PARAM_TO_FILTER = {
  30: '30',
  60: '60',
  90: '90',
};

function matchesQuickFilter(row, quickFilter) {
  switch (quickFilter) {
    case 'TODAY':
      return row.isToday;
    case '7':
      return row.isWithin7;
    case '15':
      return row.isWithin15;
    case '30':
      return row.isWithin30;
    case '60':
      return row.isWithin60;
    case '90':
      return row.isWithin90;
    case 'OVERDUE':
      return row.isOverdue;
    default:
      return true;
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Renewals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Activate the matching quick filter when arriving via ?window=30/60/90
  // (e.g. from the Dashboard renewal cards). Falls back to "All" otherwise.
  const [quickFilter, setQuickFilter] = useState(() => {
    const windowParam = Number(searchParams.get('window'));
    return WINDOW_PARAM_TO_FILTER[windowParam] ?? 'ALL';
  });
  const [searchPolicyNumber, setSearchPolicyNumber] = useState('');
  const [searchCustomerName, setSearchCustomerName] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchInsurer, setSearchInsurer] = useState('');
  const [searchLeadExecutive, setSearchLeadExecutive] = useState('');

  useEffect(() => {
    fetchRenewalWorklist()
      .then(setData)
      .catch(() => setError('Failed to load renewal worklist.'))
      .finally(() => setLoading(false));
  }, []);

  const filters = {
    policyNumber: searchPolicyNumber.trim().toLowerCase(),
    customerName: searchCustomerName.trim().toLowerCase(),
    mobile: searchMobile.trim().toLowerCase(),
    insurer: searchInsurer.trim().toLowerCase(),
    leadExecutive: searchLeadExecutive.trim().toLowerCase(),
  };

  const hasFilters =
    filters.policyNumber || filters.customerName || filters.mobile || filters.insurer || filters.leadExecutive;

  const rows = useMemo(() => {
    if (!data?.policies) return [];
    return data.policies.filter((row) =>
      matchesQuickFilter(row, quickFilter) &&
      (!filters.policyNumber || (row.policyNumber || '').toLowerCase().includes(filters.policyNumber)) &&
      (!filters.customerName || (row.customerName || '').toLowerCase().includes(filters.customerName)) &&
      (!filters.mobile || (row.customerPhone || '').toLowerCase().includes(filters.mobile)) &&
      (!filters.insurer || (row.insurerName || '').toLowerCase().includes(filters.insurer)) &&
      (!filters.leadExecutive || (row.leadSource || '').toLowerCase().includes(filters.leadExecutive))
    );
  }, [data, quickFilter, filters]);

  function viewPolicy(id) {
    navigate(`/policies/${id}`);
  }

  function clearFilters() {
    setSearchPolicyNumber('');
    setSearchCustomerName('');
    setSearchMobile('');
    setSearchInsurer('');
    setSearchLeadExecutive('');
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Renewals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Operational worklist of upcoming and overdue policy renewals. Read-only — does not affect policy data.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Due Today" value={data.summary.dueToday} />
            <StatCard label="Due in Next 7 Days" value={data.summary.dueIn7Days} />
            <StatCard label="Due in Next 15 Days" value={data.summary.dueIn15Days} />
            <StatCard label="Due in Next 30 Days" value={data.summary.dueIn30Days} />
            <StatCard label="Overdue Renewals" value={data.summary.overdue} tone="alert" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Due in Next 60 Days" value={data.summary.dueIn60Days} />
            <StatCard label="Due in Next 90 Days" value={data.summary.dueIn90Days} />
          </div>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((qf) => (
              <button
                key={qf.key}
                onClick={() => setQuickFilter(qf.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  quickFilter === qf.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>

          {/* Search filters */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Policy Number</label>
              <Input
                placeholder="Search policy number…"
                value={searchPolicyNumber}
                onChange={(e) => setSearchPolicyNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Customer Name</label>
              <Input
                placeholder="Search customer name…"
                value={searchCustomerName}
                onChange={(e) => setSearchCustomerName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Mobile Number</label>
              <Input
                placeholder="Search mobile number…"
                value={searchMobile}
                onChange={(e) => setSearchMobile(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Insurer</label>
              <Input
                placeholder="Search insurer…"
                value={searchInsurer}
                onChange={(e) => setSearchInsurer(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-600">Lead Executive</label>
              <Input
                placeholder="Search lead executive…"
                value={searchLeadExecutive}
                onChange={(e) => setSearchLeadExecutive(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </section>

          {/* Worklist table */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Renewal Worklist</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {rows.length} polic{rows.length === 1 ? 'y' : 'ies'} matching current filters
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">No renewals found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Renewal Date', 'Policy Number', 'Customer Name', 'Insurer', 'Mobile Number', 'Lead Executive', 'Policy Status', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${row.isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                          {new Date(row.renewalDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{row.policyNumber}</td>
                        <td className="px-4 py-3 text-gray-700">{row.customerName}</td>
                        <td className="px-4 py-3 text-gray-600">{row.insurerName}</td>
                        <td className="px-4 py-3 text-gray-600">{row.customerPhone || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{row.leadSource || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => viewPolicy(row.id)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            View Policy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
