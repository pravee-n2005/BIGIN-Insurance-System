import { useEffect, useState, useCallback } from 'react';
import { fetchAllPOSPMembers, fetchPOSPReport, downloadPOSPReportXlsx } from '../api/posp';

const fmt = (n) =>
  '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));
const fmtPct = (n) => `${Number(n ?? 0).toFixed(2)}%`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const STATUS_STYLES = {
  PENDING:        'bg-amber-50 text-amber-700 border-amber-200',
  PAID:           'bg-green-50 text-green-700 border-green-200',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
};
const STATUS_LABELS = { PENDING: 'Pending', PAID: 'Paid', PARTIALLY_PAID: 'Partly Paid' };

export default function POSPReports() {
  const [members, setMembers]         = useState([]);
  const [selectedMember, setMember]   = useState('');
  const [selectedFY, setFY]           = useState(currentFY());
  const [selectedMonth, setMonth]     = useState('');
  const [paymentStatus, setPayStatus] = useState('');
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [exporting, setExporting]     = useState(false);

  useEffect(() => { fetchAllPOSPMembers().then(setMembers).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = {};
    if (selectedMember) params.pospMemberId = selectedMember;
    if (selectedMonth)  params.month = selectedMonth;
    else if (selectedFY) params.fy   = selectedFY;
    if (paymentStatus)  params.paymentStatus = paymentStatus;
    fetchPOSPReport(params)
      .then(setReport)
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [selectedMember, selectedFY, selectedMonth, paymentStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = {};
      if (selectedMember) params.pospMemberId = selectedMember;
      if (selectedMonth)  params.month = selectedMonth;
      else if (selectedFY) params.fy = selectedFY;
      if (paymentStatus)  params.paymentStatus = paymentStatus;
      const blob = await downloadPOSPReportXlsx(params);
      const memberCode = report?.member?.code || 'ALL';
      const suffix     = selectedMonth || selectedFY || 'all';
      triggerDownload(blob, `POSP_Report_${memberCode}_${suffix}.xlsx`);
    } catch { setError('Failed to export.'); }
    finally { setExporting(false); }
  }

  const months = fyMonths(selectedFY);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">POSP Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly and annual POSP payout reports.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !report?.entries?.length}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'Exporting…' : '⬇ Export Excel'}
        </button>
      </div>

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
            <label className="text-xs font-medium text-gray-600">Month</label>
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
              <option value="">All members</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Payment Status</label>
            <select value={paymentStatus} onChange={(e) => setPayStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partly Paid</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}

      {loading && <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-sm text-gray-400">Loading…</div>}

      {!loading && report && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 rounded-t-xl flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white uppercase tracking-wide">
                Summary
              </span>
              <p className="text-sm font-bold text-blue-900">
                {report.member ? `${report.member.name} (${report.member.code})` : 'All POSP Members'}
              </p>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Policies',     value: report.summary.totalPolicies, mono: false },
                { label: 'Total Premium',      value: fmt(report.summary.totalPremium)         },
                { label: 'Total Brokerage',    value: fmt(report.summary.totalBrokerage)       },
                { label: 'POSP Commission',    value: fmt(report.summary.totalPospCommission), hl: true },
                { label: 'Org Commission',     value: fmt(report.summary.totalOrgCommission)   },
              ].map(({ label, value, hl }) => (
                <div key={label} className={`rounded-lg p-4 border ${hl ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-medium ${hl ? 'text-blue-700' : 'text-gray-500'}`}>{label}</p>
                  <p className={`text-lg font-bold mt-1 ${hl ? 'text-blue-900' : 'text-gray-900'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          {report.entries.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
              No entries found for the selected filters.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{report.entries.length} entries</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      {['#', 'Date', 'Policy Number', 'Customer', 'Type',
                        'Premium', 'Brokerage', 'POSP %', 'POSP Commission', 'Org Commission', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.entries.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-800 text-xs">{e.policyNumber}</td>
                        <td className="px-3 py-2.5 text-gray-800 max-w-[140px] truncate">{e.customerName}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{e.policyType || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-900 font-mono text-right">{fmt(e.premium)}</td>
                        <td className="px-3 py-2.5 text-gray-900 font-mono text-right">{fmt(e.brokerage)}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-gray-700">{fmtPct(e.pospShare)}</td>
                        <td className="px-3 py-2.5 text-blue-900 font-mono text-right font-semibold">{fmt(e.pospCommission)}</td>
                        <td className="px-3 py-2.5 text-gray-700 font-mono text-right">{fmt(e.orgCommission)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_STYLES[e.paymentStatus] || ''}`}>
                            {STATUS_LABELS[e.paymentStatus] || e.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-yellow-50 border-t-2 border-yellow-300">
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-xs font-bold text-gray-600 uppercase">
                        Total ({report.entries.length} policies)
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(report.summary.totalPremium)}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(report.summary.totalBrokerage)}</td>
                      <td></td>
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-900 text-right">{fmt(report.summary.totalPospCommission)}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-right">{fmt(report.summary.totalOrgCommission)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
