import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function fmt(n) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Row({ label, value }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-48 flex-shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value ?? '—'}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      <dl>{children}</dl>
    </div>
  );
}

const CANCELLATION_REASON_LABELS = {
  CUSTOMER_DECLINED:               'Customer Declined',
  CUSTOMER_REQUESTED_CANCELLATION: 'Customer Requested Cancellation',
  PREMIUM_TOO_HIGH:                'Premium Too High',
  CUSTOMER_PURCHASED_ELSEWHERE:    'Customer Purchased Elsewhere',
  CUSTOMER_NOT_REACHABLE:          'Customer Not Reachable',
  POLICY_ISSUED_INCORRECTLY:       'Policy Issued Incorrectly',
  WRONG_POLICY_DETAILS:            'Wrong Policy Details',
  KYC_DOCUMENTS_NOT_PROVIDED:      'KYC Documents Not Provided',
  INSURER_REJECTED_PROPOSAL:       'Insurer Rejected Proposal',
  PAYMENT_NOT_RECEIVED:            'Payment Not Received',
  PROPOSAL_EXPIRED:                'Proposal Expired',
  POLICY_REPLACED:                 'Policy Replaced',
  RENEWAL_NOT_PROCEEDED:           'Renewal Not Proceeded',
  DUPLICATE_ENTRY:                 'Duplicate Entry',
  DUPLICATE_POLICY_IMPORTED:       'Duplicate Policy (Imported)',
  TEST_DUMMY_ENTRY:                'Test / Dummy Entry',
  OTHER:                           'Other',
};

const STATUS_COLORS = {
  ACTIVE:    'bg-green-50 text-green-700',
  PENDING:   'bg-yellow-50 text-yellow-700',
  EXPIRED:   'bg-red-50 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function PolicyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get(`/policies/${id}`)
      .then((res) => setPolicy(res.data.policy))
      .catch(() => setError('Could not load policy.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
          {error || 'Policy not found.'}
        </p>
        <Link to="/policies" className="inline-block mt-4 text-sm text-blue-600 hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-5">
        <Link to="/policies" className="hover:text-gray-700">Policies</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{policy.policyNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{policy.customerName}</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{policy.policyNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[policy.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {policy.status}
          </span>
          {isAdmin && (
            <button
              onClick={() => navigate(`/policies/${id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Insurer & Product */}
        <Section title="Insurer & Product">
          <Row label="Insurer" value={policy.insurerName} />
          <Row label="Category" value={policy.insuranceCategory} />
          <Row label="Product" value={policy.productName} />
          {policy.clientType && <Row label="Client Type" value={policy.clientType} />}
        </Section>

        {/* Customer */}
        <Section title="Customer Information">
          <Row label="Name" value={policy.customerName} />
          <Row label="Phone" value={policy.customerPhone} />
          <Row label="Email" value={policy.customerEmail} />
        </Section>

        {/* Policy */}
        <Section title="Policy Details">
          <Row label="Proposal / Policy Number" value={policy.policyNumber} />
          <Row label="Login / Issue Date" value={fmtDate(policy.issueDate)} />
          <Row label="Renewal Date" value={fmtDate(policy.renewalDate)} />
          <Row label="Payment Frequency" value={policy.paymentFrequency?.replace('_', ' ')} />
          {policy.term != null && (
            <Row label="Term" value={policy.term === 1 ? '1 YEAR' : `${policy.term} YEARS`} />
          )}
          {policy.sumAssured && <Row label="Sum Assured" value={policy.sumAssured} />}
          <Row label="Status" value={policy.status} />
        </Section>

        {/* Financial — server-calculated values shown here */}
        <Section title="Financial Summary">
          <Row label="Gross Premium" value={fmt(policy.grossPremium)} />
          <Row label="Net Premium" value={fmt(policy.netPremium)} />
          <Row label={`GST (${policy.gstPercent}%)`} value={fmt(policy.gstAmount)} />
          <Row label={`Commission (${policy.commissionPercent}%)`} value={fmt(policy.commissionAmount)} />
          <Row label={`TDS (${policy.tdsPercent}%)`} value={fmt(policy.tdsAmount)} />
          <Row label="Net Receivable" value={<span className="text-green-700 font-bold">{fmt(policy.finalReceivable)}</span>} />
        </Section>

        {/* Business */}
        <Section title="Business & Tracking">
          <Row label="Lead Source" value={policy.leadSource} />
          <Row label="Payment Mode" value={policy.paymentMode} />
          <Row label="Invoice Number" value={policy.invoiceNumber} />
          <Row label="Invoice Date" value={fmtDate(policy.invoiceDate)} />
          <Row label="Credited Date" value={fmtDate(policy.creditedDate)} />
          <Row label="Remarks (Add if there is any Rider)" value={policy.remarks} />
          <Row label="Created By" value={policy.createdBy?.name} />
          <Row label="Created At" value={fmtDate(policy.createdAt)} />
        </Section>

        {/* Cancellation — shown for CANCELLED policies */}
        {policy.status === 'CANCELLED' && (
          <Section title="Cancellation Details">
            {policy.cancellationReason ? (
              <>
                <Row
                  label="Reason"
                  value={CANCELLATION_REASON_LABELS[policy.cancellationReason] ?? policy.cancellationReason}
                />
                {policy.cancellationReason === 'OTHER' && (
                  <Row label="Reason Details" value={policy.cancellationReasonOther} />
                )}
              </>
            ) : (
              <Row label="Reason" value={<span className="italic text-gray-400">Legacy cancellation — no reason recorded</span>} />
            )}
            <Row label="Cancelled By" value={policy.cancelledBy?.name ?? '—'} />
            <Row label="Cancelled At" value={fmtDate(policy.cancelledAt)} />
          </Section>
        )}
      </div>
    </div>
  );
}
