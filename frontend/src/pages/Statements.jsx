import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchStatements } from '../api/statements';
import { fetchInsurers } from '../api/masters';

const STATUSES = ['DRAFT', 'FINALIZED', 'INVOICED', 'CANCELLED'];

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const monthLabel = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export default function Statements() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [insurers,   setInsurers]   = useState([]);
  const [statements, setStatements] = useState([]);
  const [meta,       setMeta]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Filters
  const [page,           setPage]           = useState(1);
  const [filterInsurer,  setFilterInsurer]  = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterMonth,    setFilterMonth]    = useState('');

  async function load(p = 1) {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 20 };
      if (filterInsurer) params.insurerId     = filterInsurer;
      if (filterStatus)  params.status        = filterStatus;
      if (filterMonth)   params.businessMonth = filterMonth;
      const res = await fetchStatements(params);
      setStatements(res.data);
      setMeta(res.meta);
    } catch {
      setError('Failed to load statements.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInsurers().then(setInsurers).catch(() => {});
  }, []);

  useEffect(() => {
    load(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterInsurer, filterStatus, filterMonth]);

  function handlePageChange(p) {
    setPage(p);
    load(p);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">GST Module</h1>
          <p className="text-sm text-gray-500 mt-1">Insurer brokerage statements and GST invoice generation.</p>
        </div>
        {isAdmin && (
          <Link
            to="/statements/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Statement
          </Link>
        )}
      </div>

      {/* Filters */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Insurer</label>
          <select
            value={filterInsurer}
            onChange={(e) => setFilterInsurer(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All insurers</option>
            {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Business Month</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(filterInsurer || filterStatus || filterMonth) && (
          <button
            onClick={() => { setFilterInsurer(''); setFilterStatus(''); setFilterMonth(''); }}
            className="text-xs text-blue-600 hover:underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </section>

      {/* List */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : statements.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No statements yet. {isAdmin && <Link to="/statements/new" className="text-blue-600 hover:underline">Create the first one.</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Ref No.', 'Insurer', 'Business Month', 'Statement Date', 'Credit Date', 'Policies', 'Invoice Value', 'Status', 'Linked Invoice'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statements.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">
                      <Link to={`/statements/${s.id}`} className="hover:underline">{s.statementRefNo}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{s.insurer?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{monthLabel(s.businessMonth)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(s.statementDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(s.creditDate)}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{s._count?.policies ?? 0}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">₹{fmt(s.invoiceValue)}</td>
                    <td className="px-4 py-3"><StatementStatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s.invoice
                        ? <Link to={`/invoices/${s.invoice.id}`} className="text-blue-600 hover:underline">{s.invoice.invoiceNumber}</Link>
                        : <span className="text-gray-300">—</span>}
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
    </div>
  );
}

export function StatementStatusBadge({ status }) {
  const map = {
    DRAFT:     'bg-yellow-100 text-yellow-700',
    FINALIZED: 'bg-blue-100 text-blue-700',
    INVOICED:  'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
