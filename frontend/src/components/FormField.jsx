// Reusable labelled field wrapper
export function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const base =
  'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500';

export function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`${base} ${error ? 'border-red-400' : 'border-gray-300'}`}
    />
  );
}

export function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`${base} ${error ? 'border-red-400' : 'border-gray-300'} bg-white`}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, ...props }) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${base} ${error ? 'border-red-400' : 'border-gray-300'} resize-none`}
    />
  );
}

export function SectionHeading({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-2 pb-1 border-b border-gray-200 col-span-full">
      {children}
    </h3>
  );
}
