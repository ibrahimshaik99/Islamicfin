import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { Button, Input, Card, CardContent, ErrorState } from '../../components/ui';

interface ZakatResult {
  inputs: { assets: Record<string, string>; liabilities: Record<string, string>; currency: string; nisabThreshold: string };
  steps: { description: string; amount?: string; answer?: string; rate?: string }[];
  result: { totalAssets: string; totalLiabilities: string; netWealth: string; nisabThreshold: string; isAboveNisab: boolean; zakatAmount: string; currency: string };
  assumptions: string[];
}

export default function ZakatPage() {
  const [assets, setAssets] = useState({ cashOnHand: '', bankBalances: '', goldValue: '', silverValue: '', businessInventory: '', receivables: '', investments: '', agriculturalProduce: '' });
  const [liabilities, setLiabilities] = useState({ outstandingDebts: '', pendingPayments: '', mahrObligation: '' });
  const [result, setResult] = useState<ZakatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: ZakatResult }>('/zakat/calculate', {
        method: 'POST',
        body: { assets, liabilities },
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Zakat" navItems={communityNav} navTitle="Community">
      <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-lg font-semibold text-gray-900">Zakat Calculator</h2>
        <p className="text-sm text-gray-500">Calculate your Zakat obligation based on your assets and liabilities. Zakat is due at 2.5% of net wealth above the Nisab threshold.</p>

        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Assets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Cash on Hand (₹)" value={assets.cashOnHand} onChange={(e) => setAssets({ ...assets, cashOnHand: e.target.value })} placeholder="0" />
              <Input label="Bank Balances (₹)" value={assets.bankBalances} onChange={(e) => setAssets({ ...assets, bankBalances: e.target.value })} placeholder="0" />
              <Input label="Gold Value (₹)" value={assets.goldValue} onChange={(e) => setAssets({ ...assets, goldValue: e.target.value })} placeholder="0" />
              <Input label="Silver Value (₹)" value={assets.silverValue} onChange={(e) => setAssets({ ...assets, silverValue: e.target.value })} placeholder="0" />
              <Input label="Business Inventory (₹)" value={assets.businessInventory} onChange={(e) => setAssets({ ...assets, businessInventory: e.target.value })} placeholder="0" />
              <Input label="Receivables (₹)" value={assets.receivables} onChange={(e) => setAssets({ ...assets, receivables: e.target.value })} placeholder="0" />
              <Input label="Investments (₹)" value={assets.investments} onChange={(e) => setAssets({ ...assets, investments: e.target.value })} placeholder="0" />
              <Input label="Agricultural Produce (₹)" value={assets.agriculturalProduce} onChange={(e) => setAssets({ ...assets, agriculturalProduce: e.target.value })} placeholder="0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Liabilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Outstanding Debts (₹)" value={liabilities.outstandingDebts} onChange={(e) => setLiabilities({ ...liabilities, outstandingDebts: e.target.value })} placeholder="0" />
              <Input label="Pending Payments (₹)" value={liabilities.pendingPayments} onChange={(e) => setLiabilities({ ...liabilities, pendingPayments: e.target.value })} placeholder="0" />
              <Input label="Mahr Obligation (₹)" value={liabilities.mahrObligation} onChange={(e) => setLiabilities({ ...liabilities, mahrObligation: e.target.value })} placeholder="0" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleCalculate} loading={loading}>Calculate Zakat</Button>
        </div>

        {error && <ErrorState message={error} />}

        {result && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Zakat Calculation Result</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Assets</span>
                  <span className="font-medium text-gray-900">₹{result.result.totalAssets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Liabilities</span>
                  <span className="font-medium text-gray-900">₹{result.result.totalLiabilities}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-600">Net Wealth</span>
                  <span className="font-medium text-gray-900">₹{result.result.netWealth}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nisab Threshold</span>
                  <span className="font-medium text-gray-900">₹{result.result.nisabThreshold}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Above Nisab?</span>
                  <span className={`font-medium ${result.result.isAboveNisab ? 'text-green-600' : 'text-red-600'}`}>
                    {result.result.isAboveNisab ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-900 font-semibold">Zakat Due</span>
                  <span className="text-lg font-bold text-primary-600">₹{result.result.zakatAmount}</span>
                </div>
              </div>
              {result.assumptions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{result.assumptions[0]}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
