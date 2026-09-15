import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';

const CONTRACT_TYPES = [
  { value: 'QARD_HASAN', label: 'Qard Hasan', desc: 'Interest-free loan. Borrower repays the principal only.', icon: '💚' },
  { value: 'MUDARABAH', label: 'Mudarabah', desc: 'Profit-sharing partnership. Capital provider and entrepreneur share profits.', icon: '🤝' },
  { value: 'MUSHARAKAH', label: 'Musharakah', desc: 'Joint venture partnership. All parties contribute capital and share profits/losses.', icon: '🏢' },
  { value: 'MURABAHAH', label: 'Murabahah', desc: 'Cost-plus sale. Seller discloses cost and adds agreed markup.', icon: '🏷️' },
  { value: 'IJARAH', label: 'Ijarah', desc: 'Lease contract. Asset is leased for a specified period with rental payments.', icon: '🏠' },
] as const;

export default function FinanceRequestPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { mutate, loading } = useMutation();

  const [contractType, setContractType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!contractType) { setError('Please select a contract type.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Valid amount is required.'); return; }

    try {
      if (contractType === 'QARD_HASAN') {
        await mutate(`${prefix}/finance/contracts`, {
          body: { title: title.trim(), description: description.trim() || undefined, principalAmount: amount, startDate: startDate || undefined, endDate: endDate || undefined },
        });
      } else {
        const endpoint = contractType.toLowerCase();
        await mutate(`${prefix}/finance/${endpoint}`, {
          body: { title: title.trim(), description: description.trim() || undefined, principalAmount: amount, startDate: startDate || undefined, endDate: endDate || undefined },
        });
      }
      setSuccess(true);
      setTimeout(() => navigate(-1), 2000);
    } catch {
      setError('Failed to submit request. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/20">
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Request Finance</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center animate-in fade-in">
            <p className="text-sm font-semibold text-green-700">Request submitted successfully!</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Select Contract Type</h2>
          <div className="space-y-2">
            {CONTRACT_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setContractType(ct.value)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  contractType === ct.value
                    ? 'border-violet-300 bg-violet-50 ring-1 ring-violet-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ct.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ct.label}</p>
                    <p className="text-[10px] text-gray-500">{ct.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Working capital for halal food business"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe your funding need..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || success}
          className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-violet-200">
          {loading ? 'Submitting...' : 'Submit Finance Request'}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Disclaimer:</strong> Submitting a finance request does not guarantee funding. All requests undergo Shariah review and community approval. Consult qualified scholars before entering into any financial contract.
          </p>
        </div>
      </div>
    </div>
  );
}
