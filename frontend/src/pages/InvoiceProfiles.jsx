import { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  fetchInvoiceProfiles,
  createInvoiceProfile,
  updateInvoiceProfile,
} from '../api/invoiceProfiles';
import { fetchInsurers } from '../api/masters';
import { Field, Input, Textarea, Select } from '../components/FormField';

export default function InvoiceProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [editing, setEditing]   = useState(null); // null | { ...profile } | 'NEW'

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ps, is] = await Promise.all([fetchInvoiceProfiles(), fetchInsurers()]);
      setProfiles(ps);
      setInsurers(is);
    } catch {
      setError('Failed to load invoice profiles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Insurers without an existing profile — used to populate the "Add new" dropdown
  const insurersWithoutProfile = insurers.filter(
    (i) => !profiles.some((p) => p.insurerId === i.id)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Insurer Invoice Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">
            GST recipient details used for tax invoice generation.
          </p>
        </div>
        <button
          onClick={() => setEditing('NEW')}
          disabled={insurersWithoutProfile.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={insurersWithoutProfile.length === 0 ? 'All active insurers have profiles' : ''}
        >
          + Add Profile
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error}
        </div>
      )}

      {/* Profile cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No invoice profiles yet. Click <span className="font-medium text-gray-600">+ Add Profile</span> to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      {editing && (
        <ProfileModal
          profile={editing === 'NEW' ? null : editing}
          insurers={editing === 'NEW' ? insurersWithoutProfile : insurers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ profile, onEdit }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {profile.insurer?.name}
          </p>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5 truncate">
            {profile.recipientHeader}
          </h3>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0 ml-2"
        >
          Edit
        </button>
      </div>

      <dl className="text-xs space-y-1.5">
        <Row label="Legal Name"  value={profile.legalName} />
        <Row label="Address"     value={profile.billingAddress} />
        <Row label="State"       value={`${profile.state} (${profile.stateCode})`} />
        <Row label="GSTIN"       value={<code className="text-gray-900 font-mono">{profile.gstin}</code>} />
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex">
      <dt className="w-20 flex-shrink-0 text-gray-400">{label}</dt>
      <dd className="text-gray-700 break-words min-w-0">{value || '—'}</dd>
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

const EMPTY = {
  insurerId: '',
  recipientHeader: '',
  legalName: '',
  billingAddress: '',
  state: 'Tamil Nadu',
  stateCode: '033',
  gstin: '',
};

function ProfileModal({ profile, insurers, onClose, onSaved }) {
  const isEdit = !!profile;
  const [form, setForm] = useState(() =>
    profile
      ? {
          insurerId:       String(profile.insurerId),
          recipientHeader: profile.recipientHeader ?? '',
          legalName:       profile.legalName ?? '',
          billingAddress:  profile.billingAddress ?? '',
          state:           profile.state ?? '',
          stateCode:       profile.stateCode ?? '',
          gstin:           profile.gstin ?? '',
        }
      : EMPTY
  );
  const [errors, setErrors] = useState([]);
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setServerError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        insurerId: parseInt(form.insurerId),
        gstin: form.gstin.trim().toUpperCase(),
      };
      if (isEdit) {
        await updateInvoiceProfile(profile.id, payload);
      } else {
        await createInvoiceProfile(payload);
      }
      onSaved();
    } catch (err) {
      const res = err.response?.data;
      if (Array.isArray(res?.errors)) setErrors(res.errors);
      else setServerError(res?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Invoice Profile' : 'Add Invoice Profile'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Insurer" required>
            <Select
              value={form.insurerId}
              onChange={(e) => set('insurerId', e.target.value)}
              required
              disabled={isEdit}  // can't change insurer on existing profile
            >
              <option value="">Select insurer…</option>
              {insurers.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            {isEdit && (
              <p className="mt-1 text-xs text-gray-400">
                Insurer cannot be changed. Create a new profile if needed.
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Recipient Header (short)" required>
              <Input
                value={form.recipientHeader}
                onChange={(e) => set('recipientHeader', e.target.value)}
                placeholder="e.g. STAR Health"
                required
              />
            </Field>

            <Field label="Legal Name" required>
              <Input
                value={form.legalName}
                onChange={(e) => set('legalName', e.target.value)}
                placeholder="Full company name"
                required
              />
            </Field>
          </div>

          <Field label="Billing Address" required>
            <Textarea
              value={form.billingAddress}
              onChange={(e) => set('billingAddress', e.target.value)}
              placeholder="Full address as it should appear on invoice"
              required
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="State" required>
              <Input
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="Tamil Nadu"
                required
              />
            </Field>

            <Field label="State Code" required>
              <Input
                value={form.stateCode}
                onChange={(e) => set('stateCode', e.target.value)}
                placeholder="033"
                required
              />
            </Field>

            <Field label="GSTIN" required>
              <Input
                value={form.gstin}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                placeholder="33AABCL5045N1ZF"
                maxLength={15}
                required
                className="uppercase font-mono"
              />
            </Field>
          </div>

          {errors.length > 0 && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <ul className="list-disc ml-5 space-y-0.5">
                {errors.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {serverError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Update Profile' : 'Create Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
