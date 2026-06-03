import { useEffect, useState } from 'react';
import api from '../api/axios';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/reports/monthly?month=${CURRENT_MONTH}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monthly summary — {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

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
            sub="This month"
          />
          <StatCard
            label="Total Gross Premium"
            value={fmt(data?.totalGrossPremium)}
            sub="This month"
          />
          <StatCard
            label="Total Commission"
            value={fmt(data?.totalCommission)}
            sub="This month"
          />
          <StatCard
            label="Net Receivable"
            value={fmt(data?.totalReceivable)}
            sub="After TDS"
          />
        </div>
      )}

      {/* Recent policies table */}
      {data?.policies?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Policies</h2>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Customer', 'Insurer', 'Product', 'Category', 'Premium', 'Lead Source', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.policies.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.insurerName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.productName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                        {p.insuranceCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{fmt(p.grossPremium)}</td>
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
