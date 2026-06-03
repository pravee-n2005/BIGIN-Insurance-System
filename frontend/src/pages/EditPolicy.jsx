import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import PolicyForm from '../components/PolicyForm';

export default function EditPolicy() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get(`/policies/${id}`)
      .then((res) => setPolicy(res.data.policy))
      .catch(() => setError('Could not load policy.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(payload) {
    await api.put(`/policies/${id}`, payload);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error || 'Policy not found.'}
        </p>
        <Link to="/policies" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
          ← Back to Policies
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-5">
        <Link to="/policies" className="hover:text-gray-700">Policies</Link>
        <span className="mx-2">›</span>
        <Link to={`/policies/${id}`} className="hover:text-gray-700">{policy.policyNumber}</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">Edit</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Edit Policy</h1>
        <p className="text-sm text-gray-500 mt-1">{policy.customerName} — {policy.policyNumber}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <PolicyForm
          initialData={policy}
          onSubmit={handleSubmit}
          submitLabel="Update Policy"
        />
      </div>
    </div>
  );
}
