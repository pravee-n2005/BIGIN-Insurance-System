import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Field, Input, Select, Textarea } from '../components/FormField';
import { fetchPOSPMembers, createPOSPMember, updatePOSPMember, deletePOSPMember } from '../api/posp';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function POSPMembers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [members, setMembers]     = useState([]);
  const [meta, setMeta]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editing, setEditing]     = useState(null); // null | 'NEW' | member
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const load = useCallback((p = 1) => {
    setLoading(true); setError('');
    const params = { page: p, limit: 20 };
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    fetchPOSPMembers(params)
      .then((r) => { setMembers(r.members); setMeta(r); })
      .catch(() => setError('Failed to load POSP members.'))
      .finally(() => setLoading(false));
  }, [search, filterStatus]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await deletePOSPMember(confirmDelete.id);
      setConfirmDelete(null);
      load(page);
    } catch { setError('Failed to delete POSP member.'); }
    finally { setDeleting(null); }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">POSP Members</h1>
        <p className="text-sm text-gray-500 mt-1">Manage POSP member profiles and status.</p>
      </div>

      {/* Filters + Add */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600">Search</label>
          <Input placeholder="Name or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="text-xs text-blue-600 hover:underline">
            Clear
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setEditing('NEW')}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Member
          </button>
        )}
      </section>

      {/* Table */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {error && <div className="px-6 py-4 text-sm text-red-600">{error}</div>}
        {loading ? (
          <div className="px-6 py-12 text-sm text-gray-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No POSP members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Name', 'Mobile', 'Email', 'Joining Date', 'Status', 'Remarks', isAdmin ? 'Actions' : null]
                    .filter(Boolean).map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-mono font-medium">{m.code}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{m.mobile || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(m.joiningDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{m.remarks || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditing(m)} className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Edit</button>
                          <button onClick={() => setConfirmDelete(m)} disabled={deleting === m.id} className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50">
                            {deleting === m.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    )}
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
                <button key={p} onClick={() => { setPage(p); load(p); }}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {editing && (
        <MemberModal
          member={editing === 'NEW' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(page); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}" (${confirmDelete.code})? This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          confirming={!!deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ message, confirmLabel, confirming, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm Delete" onClose={onCancel}>
      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={onConfirm} disabled={confirming} className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50">{confirmLabel}</button>
          <button onClick={onCancel} className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function MemberModal({ member, onClose, onSaved }) {
  const isNew = !member;
  const [form, setForm] = useState({
    name:        member?.name        ?? '',
    code:        member?.code        ?? '',
    mobile:      member?.mobile      ?? '',
    email:       member?.email       ?? '',
    joiningDate: member?.joiningDate ? member.joiningDate.slice(0, 10) : '',
    status:      member?.status      ?? 'ACTIVE',
    remarks:     member?.remarks     ?? '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.code.trim()) { setError('Code is required.'); return; }
    setSaving(true);
    const payload = {
      name:        form.name.trim(),
      code:        form.code.trim(),
      mobile:      form.mobile.trim() || undefined,
      email:       form.email.trim()  || undefined,
      joiningDate: form.joiningDate   || undefined,
      status:      form.status,
      remarks:     form.remarks.trim() || undefined,
    };
    try {
      isNew ? await createPOSPMember(payload) : await updatePOSPMember(member.id, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0] || 'Failed to save.');
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add POSP Member' : 'Edit POSP Member'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <Field label="POSP Name" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="POSP Code" required>
            <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. POSP001" />
          </Field>
          <Field label="Mobile">
            <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 …" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
          </Field>
          <Field label="Joining Date">
            <Input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} />
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </div>

        <Field label="Remarks">
          <Textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Optional notes" />
        </Field>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Add Member' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-sm text-gray-700 font-medium rounded-md hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
