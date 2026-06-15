import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORIES = ['', 'LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const STATUSES   = ['', 'ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED'];
const INVOICE_STATUSES = ['', 'INVOICED', 'PENDING'];

export default function Policies() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [policies, setPolicies] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    page: 1, limit: 20,
    month: '', insurerName: '', leadSource: '', insuranceCategory: '', status: '',
    invoiceStatus: searchParams.get('invoiceStatus') || '',
  });

  useEffect(() => {
    fetchPolicies();
  }, [filters]);

  async function fetchPolicies() {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const { data } = await api.get('/policies', { params });
      setPolicies(data.data);
      setMeta(data.meta);
    } catch {
      setError('Failed to load policies.');
    } finally {
      setLoading(false);
    }
  }

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function setPage(page) {
    setFilters((f) => ({ ...f, page }));
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Policies</h1>
          <p className="text-sm text-gray-500 mt-1">{meta.total} records found</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/policies/import')}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              Import Policies
            </button>
            <button
              onClick={() => navigate('/policies/new')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Policy
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilter('month', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Month"
        />
        <input
          type="text"
          value={filters.insurerName}
          onChange={(e) => setFilter('insurerName', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Insurer name"
        />
        <input
          type="text"
          value={filters.leadSource}
          onChange={(e) => setFilter('leadSource', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Lead source"
        />
        <select
          value={filters.insuranceCategory}
          onChange={(e) => setFilter('insuranceCategory', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.invoiceStatus}
          onChange={(e) => setFilter('invoiceStatus', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All invoice statuses</option>
          {INVOICE_STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s === 'INVOICED' ? 'Invoiced' : 'Pending Invoice'}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Policy #', 'Customer', 'Insurer', 'Category', 'Product', 'Issue Date', 'Renewal Date', 'Premium', 'Lead Source', 'Status', 'Invoice'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(12)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-gray-400">
                    No policies found.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{p.policyNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.insurerName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                        {p.insuranceCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.productName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(p.issueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {p.renewalDate ? new Date(p.renewalDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{fmt(p.grossPremium)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.leadSource}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceBadge invoiceRaised={p.invoiceRaised} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/policies/${p.id}`)}
                          className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
                        >
                          View
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => navigate(`/policies/${p.id}/edit`)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.pages} — {meta.total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(meta.page - 1)}
                disabled={meta.page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(meta.page + 1)}
                disabled={meta.page >= meta.pages}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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

function InvoiceBadge({ invoiceRaised }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
      invoiceRaised ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
    }`}>
      {invoiceRaised ? 'Invoiced' : 'Pending'}
    </span>
  );
}
