import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Field, Input, Select, Textarea } from '../components/FormField';
import { fetchInsurers } from '../api/masters';
import { createStatement } from '../api/statements';

const EMPTY = {
  insurerId:        '',
  statementRefNo:   '',
  statementDate:    '',
  creditDate:       '',
  businessMonth:    '',
  remarks:          '',
  statementFileUrl: '',
};

export default function StatementNew() {
  const navigate = useNavigate();
  const [insurers, setInsurers] = useState([]);
  const [form,     setForm]     = useState(EMPTY);
  const [errors,   setErrors]   = useState([]);
  const [serverError, setServerError] = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetchInsurers().then(setInsurers).catch(() => {});
  }, []);

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
        insurerId:        parseInt(form.insurerId),
        statementRefNo:   form.statementRefNo.trim(),
        statementDate:    form.statementDate,
        businessMonth:    form.businessMonth,
        creditDate:       form.creditDate || null,
        remarks:          form.remarks || null,
        statementFileUrl: form.statementFileUrl || null,
      };
      const saved = await createStatement(payload);
      navigate(`/statements/${saved.id}`);
    } catch (err) {
      const res = err.response?.data;
      if (Array.isArray(res?.errors)) setErrors(res.errors);
      else setServerError(res?.error || 'Failed to create statement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/statements" className="text-sm text-blue-600 hover:underline">← GST Module</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900">New Statement</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Create Insurer Statement</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Step 1 of 6 — capture statement metadata. Policies will be attached on the next screen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Insurer" required>
            <Select
              value={form.insurerId}
              onChange={(e) => set('insurerId', e.target.value)}
              required
            >
              <option value="">Select insurer…</option>
              {insurers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Statement Reference No." required>
              <Input
                value={form.statementRefNo}
                onChange={(e) => set('statementRefNo', e.target.value)}
                placeholder="e.g. ICICI/2026/03/00432"
                maxLength={100}
                required
              />
            </Field>

            <Field label="Business Month" required>
              <Input
                type="month"
                value={form.businessMonth}
                onChange={(e) => set('businessMonth', e.target.value)}
                required
              />
            </Field>

            <Field label="Statement Date" required>
              <Input
                type="date"
                value={form.statementDate}
                onChange={(e) => set('statementDate', e.target.value)}
                required
              />
            </Field>

            <Field label="Credit Date (optional)">
              <Input
                type="date"
                value={form.creditDate}
                onChange={(e) => set('creditDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Remarks (optional)">
            <Textarea
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              placeholder="Internal notes for this statement"
              maxLength={500}
            />
          </Field>

          <Field label="Statement File URL (optional)">
            <Input
              type="url"
              value={form.statementFileUrl}
              onChange={(e) => set('statementFileUrl', e.target.value)}
              placeholder="https://… link to uploaded statement PDF/Excel"
              maxLength={500}
            />
          </Field>

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
              {saving ? 'Creating…' : 'Create Statement'}
            </button>
            <Link
              to="/statements"
              className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
