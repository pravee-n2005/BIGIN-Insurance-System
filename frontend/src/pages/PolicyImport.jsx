import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadPolicyImportTemplate, previewPolicyImport, commitPolicyImport } from '../api/import';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const STATUS_STYLES = {
  valid:     'bg-green-100 text-green-700',
  duplicate: 'bg-amber-100 text-amber-700',
  invalid:   'bg-red-100 text-red-700',
};

export default function PolicyImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownloadTemplate() {
    setError('');
    try {
      const blob = await downloadPolicyImportTemplate();
      downloadBlob(blob, 'Policy_Import_Template.xlsx');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to download template.');
    }
  }

  function handleFileChange(e) {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
    setCommitResult(null);
    setError('');
  }

  async function handleValidate() {
    if (!file) return;
    setLoading(true);
    setError('');
    setCommitResult(null);
    try {
      const result = await previewPolicyImport(file);
      setPreview(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Validation failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await commitPolicyImport(file);
      setCommitResult(result);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Policies</h1>
          <p className="text-sm text-gray-500 mt-1">Download the template, fill it in, then upload to validate and import.</p>
        </div>
        <button
          onClick={() => navigate('/policies')}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
        >
          Back to Policies
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>
      )}

      {/* Step 1: Template */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">1. Download Template</h2>
        <p className="text-sm text-gray-500 mb-3">Use this Excel template — it includes dropdowns, instructions, and a reference sheet of valid insurers and lead sources.</p>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Download Template
        </button>
      </div>

      {/* Step 2: Upload & Validate */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">2. Upload & Validate</h2>
        <p className="text-sm text-gray-500 mb-3">Upload your filled-in Excel file and validate it before importing. No data is saved at this step.</p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="text-sm text-gray-700"
          />
          <button
            onClick={handleValidate}
            disabled={!file || loading}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Validating…' : 'Validate'}
          </button>
        </div>
      </div>

      {/* Preview results */}
      {preview && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Validation Results</h2>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Total Rows" value={preview.totalRows} />
            <SummaryCard label="Valid" value={preview.validRows} color="text-green-700" />
            <SummaryCard label="Duplicates" value={preview.duplicateRows} color="text-amber-700" />
            <SummaryCard label="Invalid" value={preview.invalidRows} color="text-red-700" />
          </div>

          {preview.rows?.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-md mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Row</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Policy Number</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.rows.map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-2 text-gray-700">{r.row}</td>
                      <td className="px-3 py-2 text-gray-700">{r.policyNumber}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.errors?.length ? (
                          <ul className="list-disc list-inside space-y-0.5">
                            {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!preview.validRows || loading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Importing…' : `Import ${preview.validRows} Valid Row(s)`}
          </button>
        </div>
      )}

      {/* Commit results */}
      {commitResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Import Complete</h2>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <SummaryCard label="Total Rows" value={commitResult.totalRows} />
            <SummaryCard label="Imported" value={commitResult.imported} color="text-green-700" />
            <SummaryCard label="Skipped (Duplicates)" value={commitResult.skipped} color="text-amber-700" />
            <SummaryCard label="Failed" value={commitResult.failed} color="text-red-700" />
          </div>
          {commitResult.errors?.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
              {commitResult.errors.map((e, i) => (
                <li key={i}>Row {e.row} ({e.policyNumber}): {Array.isArray(e.reason) ? e.reason.join('; ') : e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="border border-gray-200 rounded-md p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
