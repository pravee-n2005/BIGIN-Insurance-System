import { useState } from 'react';
import api from '../api/axios';

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const REPORT_TABS = [
  { key: 'monthly',     label: 'Monthly' },
  { key: 'insurer',     label: 'By Insurer' },
  { key: 'lead-source', label: 'By Lead Source' },
  { key: 'category',    label: 'By Category' },
];

export default function Reports() {
  const [tab, setTab]     = useState('monthly');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runReport() {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const params = tab === 'monthly'
        ? { month }
        : { ...(from && { from }), ...(to && { to }) };

      const { data: res } = await api.get(`/reports/${tab}`, { params });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    try {
      const params = new URLSearchParams({ month });
      const token = localStorage.getItem('bigin_token');
      const res = await fetch(`/api/pdf/monthly?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bigin-report-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF export failed.');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Dynamic reports generated from policy data</p>
        </div>
        {tab === 'monthly' && (
          <button
            onClick={exportPDF}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Export PDF
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {REPORT_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setData(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        {tab === 'monthly' ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
        <button
          onClick={runReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading…' : 'Run Report'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          {tab === 'monthly' && <MonthlyResult data={data} />}
          {tab !== 'monthly' && <GroupedResult data={data.data} tab={tab} />}
        </>
      )}
    </div>
  );
}

function MonthlyResult({ data }) {
  const stats = [
    { label: 'Total Policies',   value: data.totalPolicies },
    { label: 'Gross Premium',    value: fmt(data.totalGrossPremium) },
    { label: 'Net Premium',      value: fmt(data.totalNetPremium) },
    { label: 'GST',              value: fmt(data.totalGstAmount) },
    { label: 'Commission',       value: fmt(data.totalCommission) },
    { label: 'TDS',              value: fmt(data.totalTds) },
    { label: 'Net Receivable',   value: fmt(data.totalReceivable) },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {data.policies?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Customer', 'Insurer', 'Policy #', 'Premium', 'Commission', 'Receivable', 'Lead Source'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.policies.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.insurerName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.policyNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(p.grossPremium)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(p.commissionAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(p.finalReceivable)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.leadSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function GroupedResult({ data, tab }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">No data for the selected period.</p>;
  }

  const keyCol = tab === 'insurer' ? 'insurerName' : tab === 'lead-source' ? 'leadSource' : 'insuranceCategory';
  const keyLabel = tab === 'insurer' ? 'Insurer' : tab === 'lead-source' ? 'Lead Source' : 'Category';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {[keyLabel, 'Policies', 'Gross Premium', 'Commission', 'Receivable'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{row[keyCol]}</td>
              <td className="px-4 py-3 text-gray-700">{row.totalPolicies}</td>
              <td className="px-4 py-3 text-gray-900">{fmt(row.totalGrossPremium)}</td>
              <td className="px-4 py-3 text-gray-900">{fmt(row.totalCommission)}</td>
              <td className="px-4 py-3 text-gray-900">{fmt(row.totalReceivable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
