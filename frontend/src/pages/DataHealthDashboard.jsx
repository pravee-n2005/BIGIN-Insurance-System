import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/FormField';
import { fetchDataHealthOverview } from '../api/dataHealth';

// ─── Summary card ───────────────────────────────────────────────────────────

function StatCard({ label, value, tone = 'default', note }) {
  const valueColor =
    tone === 'alert' && Number(value) > 0 ? 'text-red-600' :
    tone === 'info'  ? 'text-blue-600' :
    tone === 'ok'    ? 'text-green-600' :
    'text-gray-900';
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

// ─── Issue table ────────────────────────────────────────────────────────────

function IssueTable({ title, description, rows, onView, issueColor = 'text-amber-700', emptyText = 'No issues found.' }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Policy Number', 'Customer Name', 'Insurer', 'Policy Type', 'Note', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={`${row.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{row.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{row.customerName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.insurerName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.productName}</td>
                  <td className={`px-4 py-3 ${issueColor}`}>{row.issue}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onView(row.id)}
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
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DataHealthDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchPolicyNumber, setSearchPolicyNumber] = useState('');
  const [searchCustomerName, setSearchCustomerName] = useState('');
  const [searchInsurer, setSearchInsurer] = useState('');

  useEffect(() => {
    fetchDataHealthOverview()
      .then(setData)
      .catch(() => setError('Failed to load data health overview.'))
      .finally(() => setLoading(false));
  }, []);

  const filters = {
    policyNumber: searchPolicyNumber.trim().toLowerCase(),
    customerName: searchCustomerName.trim().toLowerCase(),
    insurer: searchInsurer.trim().toLowerCase(),
  };

  const hasFilters = filters.policyNumber || filters.customerName || filters.insurer;

  function applyFilters(rows) {
    if (!rows) return [];
    if (!hasFilters) return rows;
    return rows.filter((row) =>
      (!filters.policyNumber || (row.policyNumber || '').toLowerCase().includes(filters.policyNumber)) &&
      (!filters.customerName || (row.customerName || '').toLowerCase().includes(filters.customerName)) &&
      (!filters.insurer || (row.insurerName || '').toLowerCase().includes(filters.insurer))
    );
  }

  const inactiveInsurerPolicies      = useMemo(() => applyFilters(data?.inactiveInsurerPolicies),      [data, filters]);
  const missingLeadExecutivePolicies = useMemo(() => applyFilters(data?.missingLeadExecutivePolicies), [data, filters]);
  const confirmedZeroPolicies        = useMemo(() => applyFilters(data?.confirmedZeroPolicies),        [data, filters]);
  const missingCommissionPolicies    = useMemo(() => applyFilters(data?.missingCommissionPolicies),    [data, filters]);
  const duplicatePolicyNumbers       = useMemo(() => applyFilters(data?.duplicatePolicyNumbers),       [data, filters]);

  function viewPolicy(id) {
    navigate(`/policies/${id}`);
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Data Health Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read-only view of data quality issues across policy records. Use this to identify records that need
          correction in the original data — nothing here can be edited.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Policies" value={data.summary.totalPolicies} />
            <StatCard label="Linked to Inactive Insurers" value={data.summary.inactiveInsurerCount} tone="alert" />
            <StatCard label="Missing Lead Executive" value={data.summary.missingLeadExecutiveCount} tone="alert" />
            <StatCard
              label="Zero Commission — Confirmed"
              value={data.summary.confirmedZeroCommissionCount}
              tone="info"
              note="Insurer paid ₹0 brokerage — verified against ledger"
            />
            <StatCard
              label="Commission Data Missing"
              value={data.summary.missingCommissionCount}
              tone={data.summary.missingCommissionCount > 0 ? 'alert' : 'ok'}
              note="Not confirmed in ledger — needs verification"
            />
            <StatCard label="Duplicate Policy Numbers" value={data.summary.duplicatePolicyNumberCount} tone="alert" />
          </div>

          {/* Filters */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Policy Number</label>
              <Input
                placeholder="Search policy number…"
                value={searchPolicyNumber}
                onChange={(e) => setSearchPolicyNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Customer Name</label>
              <Input
                placeholder="Search customer name…"
                value={searchCustomerName}
                onChange={(e) => setSearchCustomerName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Insurer</label>
              <Input
                placeholder="Search insurer…"
                value={searchInsurer}
                onChange={(e) => setSearchInsurer(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearchPolicyNumber(''); setSearchCustomerName(''); setSearchInsurer(''); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </section>

          {/* Detail tables */}
          <IssueTable
            title="Policies Linked to Inactive Insurers"
            description="The insurer on these policies is marked inactive in Master Data."
            rows={inactiveInsurerPolicies}
            onView={viewPolicy}
          />
          <IssueTable
            title="Policies Missing Lead Executive"
            description="These policies have no Lead Source / Lead Executive recorded."
            rows={missingLeadExecutivePolicies}
            onView={viewPolicy}
          />

          {/* Commission — split into two distinct sections */}
          <IssueTable
            title={`Commission Data Missing (${missingCommissionPolicies.length})`}
            description="Commission percentage or amount is zero and has not been confirmed by the ledger. These policies require verification — supply commission data from the paper ledger or insurer statement."
            rows={missingCommissionPolicies}
            onView={viewPolicy}
            issueColor="text-red-700"
            emptyText="No unverified commission records. All zero-commission policies are confirmed by the ledger."
          />
          <IssueTable
            title={`Confirmed Zero Commission — No Action Required (${confirmedZeroPolicies.length})`}
            description="The uploaded client ledger (14 May 2026) explicitly records ₹0 commission for these policies. This is not a data quality issue — the insurer paid no brokerage (common for TP-only motor, direct business, NBFC-routed deals, or waived commission). Shown here for transparency only."
            rows={confirmedZeroPolicies}
            onView={viewPolicy}
            issueColor="text-blue-600"
            emptyText="No confirmed-zero commission records."
          />

          <IssueTable
            title="Duplicate Policy Numbers"
            description="These policy numbers appear more than once."
            rows={duplicatePolicyNumbers}
            onView={viewPolicy}
          />
        </>
      ) : null}
    </div>
  );
}
