import { Link } from 'react-router-dom';
import api from '../api/axios';
import PolicyForm from '../components/PolicyForm';

export default function AddPolicy() {
  async function handleSubmit(payload) {
    await api.post('/policies', payload);
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-5">
        <Link to="/policies" className="hover:text-gray-700">Policies</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">Add Policy</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Add New Policy</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the policy details. Financial amounts are calculated automatically.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <PolicyForm onSubmit={handleSubmit} submitLabel="Create Policy" />
      </div>
    </div>
  );
}
