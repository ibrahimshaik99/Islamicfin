import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ErrorState } from '../../components/ui';

interface ZakatResult {
  result: { totalAssets: string; totalLiabilities: string; netWealth: string; nisabThreshold: string; isAboveNisab: boolean; zakatAmount: string };
  assumptions: string[];
}

const STEPS = ['assets', 'liabilities', 'result'] as const;
type Step = typeof STEPS[number];

export default function CustomerZakatPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('assets');
  const [assets, setAssets] = useState({ cashOnHand: '', bankBalances: '', goldValue: '', silverValue: '', investments: '' });
  const [liabilities, setLiabilities] = useState({ outstandingDebts: '', pendingPayments: '' });
  const [result, setResult] = useState<ZakatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAssets = Object.values(assets).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const totalLiabilities = Object.values(liabilities).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: ZakatResult }>('/zakat/calculate', {
        method: 'POST',
        body: { assets, liabilities },
      });
      setResult(res.data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-green-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Zakat Calculator</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
        {/* Progress */}
        <div className="flex items-center gap-2 animate-in fade-in">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full transition-all duration-500 ${STEPS.indexOf(step) >= i ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gray-200'}`} />
              <p className={`text-[10px] mt-1.5 capitalize font-medium ${STEPS.indexOf(step) >= i ? 'text-emerald-600' : 'text-gray-400'}`}>{s}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-in fade-in delay-100">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Disclaimer:</strong> This calculator provides an estimate only. Zakat is a sacred obligation — consult a qualified scholar for authoritative guidance. Nisab is based on 85g gold or 595g silver market value.
          </p>
        </div>

        {error && <ErrorState message={error} />}

        {/* Step 1: Assets */}
        {step === 'assets' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">Step 1: Your Assets</h3>
            <p className="text-xs text-gray-500 mb-5">Enter the current market value of each asset you hold.</p>
            <div className="space-y-4">
              <InputField label="Cash on Hand (₹)" value={assets.cashOnHand} onChange={(v) => setAssets({ ...assets, cashOnHand: v })} hint="Physical cash in your possession" />
              <InputField label="Bank Balances (₹)" value={assets.bankBalances} onChange={(v) => setAssets({ ...assets, bankBalances: v })} hint="Savings and current account balances" />
              <InputField label="Gold Value (₹)" value={assets.goldValue} onChange={(v) => setAssets({ ...assets, goldValue: v })} hint="Market value of gold you own" />
              <InputField label="Silver Value (₹)" value={assets.silverValue} onChange={(v) => setAssets({ ...assets, silverValue: v })} hint="Market value of silver you own" />
              <InputField label="Investments (₹)" value={assets.investments} onChange={(v) => setAssets({ ...assets, investments: v })} hint="Marketable investments at current value" />
            </div>
            <div className="mt-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-emerald-700">₹{totalAssets.toLocaleString('en-IN')}</p>
            </div>
            <button onClick={() => setStep('liabilities')} className="w-full mt-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200">
              Continue to Deductions
            </button>
          </div>
        )}

        {/* Step 2: Liabilities */}
        {step === 'liabilities' && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">Step 2: Deductions</h3>
            <p className="text-xs text-gray-500 mb-5">Enter debts and obligations that may be deducted from your Zakat base.</p>
            <div className="space-y-4">
              <InputField label="Outstanding Debts (₹)" value={liabilities.outstandingDebts} onChange={(v) => setLiabilities({ ...liabilities, outstandingDebts: v })} hint="Debts you owe and must repay" />
              <InputField label="Pending Payments (₹)" value={liabilities.pendingPayments} onChange={(v) => setLiabilities({ ...liabilities, pendingPayments: v })} hint="Bills or obligations due" />
            </div>
            <div className="mt-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Total Assets</span>
                <span className="font-bold text-gray-900">₹{totalAssets.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Total Deductions</span>
                <span className="font-bold text-red-600">-₹{totalLiabilities.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-xs">
                <span className="text-gray-700 font-bold">Estimated Net Wealth</span>
                <span className="font-bold text-gray-900">₹{Math.max(0, totalAssets - totalLiabilities).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep('assets')} className="flex-1 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Back</button>
              <button onClick={handleCalculate} disabled={loading} className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all active:scale-[0.98] ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200'
              }`}>
                {loading ? 'Calculating...' : 'Calculate Zakat'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Zakat Calculation Result</h3>
              <div className="space-y-3">
                <Row label="Total Assets" value={`₹${result.result.totalAssets}`} />
                <Row label="Total Liabilities" value={`₹${result.result.totalLiabilities}`} />
                <div className="border-t border-gray-100 pt-2">
                  <Row label="Net Wealth" value={`₹${result.result.netWealth}`} bold />
                </div>
                <Row label="Nisab Threshold" value={`₹${result.result.nisabThreshold}`} />
                <Row label="Above Nisab?" value={result.result.isAboveNisab ? 'Yes' : 'No'} highlight={result.result.isAboveNisab} />
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-600 font-medium">Zakat Due (2.5%)</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">₹{result.result.zakatAmount}</p>
                  </div>
                </div>
              </div>
            </div>

            {result.assumptions.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Assumptions</h3>
                <ul className="space-y-2">
                  {result.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">About Zakat</h3>
              <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                <p>Zakat is one of the Five Pillars of Islam. It is an obligatory charity (2.5% of qualifying wealth above Nisab) due annually on savings held for one lunar year (hawl).</p>
                <p>Eligible recipients include: the poor, the needy, those employed to collect Zakat, those whose hearts are to be reconciled, slaves seeking freedom, debtors, those in the cause of Allah, and travelers in need (Qur'an 9:60).</p>
                <p>This tool is for educational estimation only. Consult a qualified Islamic scholar for authoritative Zakat guidance.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep('assets'); setResult(null); }} className="flex-1 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Recalculate</button>
              <button onClick={() => navigate(-1)} className="flex-1 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-[10px] text-gray-400 mb-1.5">{hint}</p>}
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
    </div>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-bold text-primary-600 text-base' : highlight ? 'font-bold text-green-600' : 'font-semibold text-gray-900'}`}>{value}</span>
    </div>
  );
}
