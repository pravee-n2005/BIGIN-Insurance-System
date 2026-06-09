import { useState, useEffect, useCallback } from 'react';
import { Field, Input, Select, SectionHeading } from '../components/FormField';
import {
  fetchAllInsurers, createInsurer, updateInsurer, activateInsurer, deactivateInsurer,
  fetchAllProducts, createProduct, updateProduct, activateProduct, deactivateProduct,
  fetchAllLeadMembers, activateLeadMember, deactivateLeadMember,
} from '../api/masters';

const INSURER_TYPES       = ['GENERAL', 'HEALTH', 'LIFE'];
const INSURANCE_CATEGORIES = ['LIFE', 'HEALTH', 'MOTOR', 'TRAVEL', 'PROPERTY', 'COMMERCIAL', 'GENERAL'];
const LEAD_TYPE_LABELS    = { POSP: 'POSP', LEAD_EXECUTIVE: 'Lead Executive', LEADERSHIP: 'Leadership' };

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ActiveBadge({ active }) {
  return active
    ? <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-700">Active</span>
    : <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">Inactive</span>;
}

function ActionButtons({ active, onToggle, onEdit, toggling }) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
      )}
      <button
        onClick={onToggle}
        disabled={toggling}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          active
            ? 'border border-red-300 text-red-600 hover:bg-red-50'
            : 'border border-green-300 text-green-700 hover:bg-green-50'
        }`}
      >
        {toggling ? '…' : active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 mb-4">
      {error}
    </div>
  );
}

function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-gray-500">{message}</td>
    </tr>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Insurers Tab ─────────────────────────────────────────────────────────────

function InsurersTab() {
  const [insurers, setInsurers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [editing, setEditing]     = useState(null); // null | 'NEW' | { ...insurer }
  const [toggling, setToggling]   = useState(null); // id being toggled

  const load = useCallback(() => {
    setLoading(true);
    fetchAllInsurers()
      .then(setInsurers)
      .catch(() => setError('Failed to load insurers.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(insurer) {
    setToggling(insurer.id);
    try {
      const updated = insurer.active
        ? await deactivateInsurer(insurer.id)
        : await activateInsurer(insurer.id);
      setInsurers((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    } catch {
      setError('Failed to update insurer status.');
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">{insurers.length} insurer{insurers.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setEditing('NEW')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Insurer
        </button>
      </div>

      <ErrorBanner error={error} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : insurers.length === 0 ? (
              <EmptyRow cols={6} message="No insurers found." />
            ) : (
              insurers.map((ins) => (
                <tr key={ins.id} className={ins.active ? '' : 'bg-gray-50 opacity-70'}>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{ins.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ins.insurerType ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{ins.gstin ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ins.state ?? '—'}</td>
                  <td className="px-4 py-3"><ActiveBadge active={ins.active} /></td>
                  <td className="px-4 py-3 text-right">
                    <ActionButtons
                      active={ins.active}
                      onEdit={() => setEditing(ins)}
                      onToggle={() => handleToggle(ins)}
                      toggling={toggling === ins.id}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <InsurerModal
          insurer={editing === 'NEW' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            if (editing === 'NEW') {
              setInsurers((prev) => [...prev, updated]);
            } else {
              setInsurers((prev) => prev.map((i) => i.id === updated.id ? updated : i));
            }
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function InsurerModal({ insurer, onClose, onSaved }) {
  const isNew = !insurer;
  const [form, setForm] = useState({
    name:         insurer?.name ?? '',
    insurerType:  insurer?.insurerType ?? '',
    gstin:        insurer?.gstin ?? '',
    state:        insurer?.state ?? '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!isNew && form.name.trim() !== insurer.name && !nameChanged) {
      setNameChanged(true); return;
    }

    setSaving(true);
    const payload = {
      name:        form.name.trim(),
      insurerType: form.insurerType || undefined,
      gstin:       form.gstin.trim() || undefined,
      state:       form.state.trim() || undefined,
    };

    try {
      const result = isNew
        ? await createInsurer(payload)
        : await updateInsurer(insurer.id, payload);
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save insurer.');
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add Insurer' : 'Edit Insurer'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {nameChanged && !isNew && (
          <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            Warning: Renaming an insurer will not update policy records that already use the old name. Click Save again to confirm.
          </div>
        )}
        <ErrorBanner error={error} />

        <Field label="Insurer Name" required>
          <Input
            value={form.name}
            onChange={(e) => { set('name', e.target.value); setNameChanged(false); }}
            placeholder="e.g. HDFC Ergo General Insurance"
          />
        </Field>

        <Field label="Insurer Type">
          <Select value={form.insurerType} onChange={(e) => set('insurerType', e.target.value)}>
            <option value="">— Not specified —</option>
            {INSURER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>

        <Field label="GSTIN" >
          <Input
            value={form.gstin}
            onChange={(e) => set('gstin', e.target.value)}
            placeholder="15-character GSTIN"
            maxLength={15}
          />
        </Field>

        <Field label="State">
          <Input
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="e.g. Tamil Nadu"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : nameChanged ? 'Confirm Rename' : isNew ? 'Add Insurer' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [editing, setEditing]   = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchAllProducts(), fetchAllInsurers()])
      .then(([prods, ins]) => { setProducts(prods); setInsurers(ins); })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(product) {
    setToggling(product.id);
    try {
      const updated = product.active
        ? await deactivateProduct(product.id)
        : await activateProduct(product.id);
      setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    } catch {
      setError('Failed to update product status.');
    } finally {
      setToggling(null);
    }
  }

  const insurerMap = Object.fromEntries(insurers.map((i) => [i.id, i.name]));

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setEditing('NEW')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Product
        </button>
      </div>

      <ErrorBanner error={error} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Insurer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <EmptyRow cols={5} message="No products found." />
            ) : (
              products.map((prod) => (
                <tr key={prod.id} className={prod.active ? '' : 'bg-gray-50 opacity-70'}>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{prod.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{insurerMap[prod.insurerId] ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{prod.insuranceCategory ?? '—'}</td>
                  <td className="px-4 py-3"><ActiveBadge active={prod.active} /></td>
                  <td className="px-4 py-3 text-right">
                    <ActionButtons
                      active={prod.active}
                      onEdit={() => setEditing(prod)}
                      onToggle={() => handleToggle(prod)}
                      toggling={toggling === prod.id}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <ProductModal
          product={editing === 'NEW' ? null : editing}
          insurers={insurers}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            if (editing === 'NEW') {
              setProducts((prev) => [...prev, updated]);
            } else {
              setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            }
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function ProductModal({ product, insurers, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState({
    name:              product?.name ?? '',
    insurerId:         product?.insurerId ? String(product.insurerId) : '',
    insuranceCategory: product?.insuranceCategory ?? '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.insurerId)   { setError('Insurer is required.'); return; }

    setSaving(true);
    const payload = {
      name:              form.name.trim(),
      insurerId:         parseInt(form.insurerId),
      insuranceCategory: form.insuranceCategory || undefined,
    };

    try {
      const result = isNew
        ? await createProduct(payload)
        : await updateProduct(product.id, payload);
      onSaved(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product.');
      setSaving(false);
    }
  }

  const activeInsurers = insurers.filter((i) => i.active);

  return (
    <Modal title={isNew ? 'Add Product' : 'Edit Product'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <ErrorBanner error={error} />

        <Field label="Product Name" required>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Car Insurance"
          />
        </Field>

        <Field label="Insurer" required>
          <Select
            value={form.insurerId}
            onChange={(e) => set('insurerId', e.target.value)}
            disabled={!isNew}
          >
            <option value="">Select insurer…</option>
            {activeInsurers.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
            {/* Show existing insurer even if inactive (edit mode) */}
            {!isNew && product && !activeInsurers.find((i) => i.id === product.insurerId) && (
              <option value={product.insurerId}>
                {insurers.find((i) => i.id === product.insurerId)?.name ?? `Insurer #${product.insurerId}`}
              </option>
            )}
          </Select>
          {!isNew && <p className="mt-1 text-xs text-gray-500">Insurer cannot be changed after creation.</p>}
        </Field>

        <Field label="Insurance Category">
          <Select value={form.insuranceCategory} onChange={(e) => set('insuranceCategory', e.target.value)}>
            <option value="">— Not specified —</option>
            {INSURANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : isNew ? 'Add Product' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Lead Members Tab ─────────────────────────────────────────────────────────

function LeadMembersTab() {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllLeadMembers()
      .then(setMembers)
      .catch(() => setError('Failed to load lead members.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(member) {
    setToggling(member.id);
    try {
      const updated = member.active
        ? await deactivateLeadMember(member.id)
        : await activateLeadMember(member.id);
      setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    } catch {
      setError('Failed to update lead member status.');
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-gray-600">{members.length} lead member{members.length !== 1 ? 's' : ''}</p>
      </div>

      <ErrorBanner error={error} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <EmptyRow cols={4} message="No lead members found." />
            ) : (
              members.map((m) => (
                <tr key={m.id} className={m.active ? '' : 'bg-gray-50 opacity-70'}>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{LEAD_TYPE_LABELS[m.leadType] ?? m.leadType}</td>
                  <td className="px-4 py-3"><ActiveBadge active={m.active} /></td>
                  <td className="px-4 py-3 text-right">
                    <ActionButtons
                      active={m.active}
                      onToggle={() => handleToggle(m)}
                      toggling={toggling === m.id}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'insurers',     label: 'Insurers' },
  { key: 'products',     label: 'Products' },
  { key: 'lead-members', label: 'Lead Members' },
];

export default function MasterData() {
  const [tab, setTab] = useState('insurers');

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Master Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage insurers, products, and lead members used across the system.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2 ${
              tab === key
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'insurers'     && <InsurersTab />}
      {tab === 'products'     && <ProductsTab />}
      {tab === 'lead-members' && <LeadMembersTab />}
    </div>
  );
}
