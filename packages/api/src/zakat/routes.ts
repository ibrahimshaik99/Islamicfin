import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, requireAuth } from '../auth/middleware';

const zakatRoutes = new Hono();

// ──────────────────────────────────────────
// Zakat Methodology
// ──────────────────────────────────────────

const ZAKAT_METHODOLOGY = {
  title: 'Zakat Calculation Methodology',
  disclaimer: 'This calculator provides an estimate based on commonly accepted Islamic scholarship. It is not a fatwa. For complex cases, consult a qualified scholar.',
  nisabBasis: 'Nisab is based on the value of 87.48 grams of gold or 612.36 grams of silver, whichever is lower. The Nisab threshold is updated periodically based on current market prices.',
  zakatRate: '2.5% (1/40) of net Zakatable wealth above the Nisab threshold.',
  eligibleAssets: [
    { name: 'Cash on hand', description: 'Physical currency held' },
    { name: 'Bank balances', description: 'Savings and current account balances' },
    { name: 'Gold', description: 'Market value of gold owned' },
    { name: 'Silver', description: 'Market value of silver owned' },
    { name: 'Business inventory', description: 'Goods held for sale at market value' },
    { name: 'Receivables', description: 'Money owed to you that you expect to receive' },
    { name: 'Investments', description: 'Marketable securities and shares held for investment' },
    { name: 'Agricultural produce', description: 'Harvested crops and fruits (10% if irrigated, 5% if rain-fed)' },
  ],
  nonEligibleAssets: [
    { name: 'Primary residence', description: 'Your home where you live' },
    { name: 'Personal vehicles', description: 'Cars used for personal transport' },
    { name: 'Household items', description: 'Furniture, appliances for personal use' },
    { name: 'Tools of trade', description: 'Equipment used in your profession' },
  ],
  deductibleLiabilities: [
    { name: 'Outstanding debts', description: 'Money you owe to others' },
    { name: 'Pending payments', description: 'Bills and obligations due' },
    { name: 'Dowry (Mahr)', description: 'Unpaid dowry obligations' },
  ],
  calculationSteps: [
    'Calculate total Zakatable assets',
    'Calculate total deductible liabilities',
    'Net Zakatable wealth = Total assets - Liabilities',
    'Compare net wealth to Nisab threshold',
    'If net wealth >= Nisab, Zakat = 2.5% of net wealth',
    'If net wealth < Nisab, no Zakat is due',
  ],
  references: [
    'Quran: Al-Baqarah 2:267, At-Tawbah 9:60',
    'Sahih Bukhari: Book of Zakat',
    'Sahih Muslim: Book of Zakat',
  ],
  scholarlyNotes: [
    'Nisab thresholds may vary by scholarly opinion (gold vs silver basis)',
    'Some scholars include pension funds, others do not',
    'Business assets are Zakatable at market value, not cost',
    'Debts owed to you are included if collection is expected',
    'Consult a qualified scholar for complex financial situations',
  ],
};

zakatRoutes.get(
  '/zakat/methodology',
  authMiddleware,
  requireAuth,
  async (c) => {
    return c.json({ data: ZAKAT_METHODOLOGY });
  },
);

// ──────────────────────────────────────────
// Zakat Calculator Input Schema
// ──────────────────────────────────────────

const zakatInputSchema = z.object({
  assets: z.object({
    cashOnHand: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    bankBalances: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    goldValue: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    silverValue: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    businessInventory: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    receivables: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    investments: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    agriculturalProduce: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  }),
  liabilities: z.object({
    outstandingDebts: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    pendingPayments: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
    mahrObligation: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  }),
  nisabThreshold: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().max(10).default('INR'),
});

// ──────────────────────────────────────────
// Precise decimal arithmetic helpers
// ──────────────────────────────────────────

function addDecimals(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  const result = numA + numB;
  return result.toFixed(2);
}

function subtractDecimals(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  const result = Math.max(0, numA - numB);
  return result.toFixed(2);
}

function multiplyByRate(amount: string, rate: string): string {
  const numAmount = parseFloat(amount) || 0;
  const numRate = parseFloat(rate) || 0;
  const result = numAmount * (numRate / 100);
  return result.toFixed(2);
}

// ──────────────────────────────────────────
// Zakat Calculate Endpoint
// ──────────────────────────────────────────

zakatRoutes.post(
  '/zakat/calculate',
  authMiddleware,
  requireAuth,
  async (c) => {
    const body = await c.req.json();
    const result = zakatInputSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid input. Please provide valid numeric amounts.' } },
        400,
      );
    }

    const { assets, liabilities, currency } = result.data;

    // Calculate total Zakatable assets
    const totalAssets = [
      assets.cashOnHand,
      assets.bankBalances,
      assets.goldValue,
      assets.silverValue,
      assets.businessInventory,
      assets.receivables,
      assets.investments,
      assets.agriculturalProduce,
    ].reduce((sum, val) => addDecimals(sum, val), '0.00');

    // Calculate total deductible liabilities
    const totalLiabilities = [
      liabilities.outstandingDebts,
      liabilities.pendingPayments,
      liabilities.mahrObligation,
    ].reduce((sum, val) => addDecimals(sum, val), '0.00');

    // Calculate net Zakatable wealth
    const netWealth = subtractDecimals(totalAssets, totalLiabilities);

    // Default Nisab threshold (approximately ₹61,000 based on silver)
    const nisabThreshold = result.data.nisabThreshold || '61000.00';

    // Determine if Zakat is due
    const isAboveNisab = parseFloat(netWealth) >= parseFloat(nisabThreshold);

    // Calculate Zakat amount (2.5% of net wealth if above Nisab)
    const zakatAmount = isAboveNisab ? multiplyByRate(netWealth, '2.5') : '0.00';

    // Build calculation breakdown
    const calculation = {
      inputs: {
        assets: {
          cashOnHand: assets.cashOnHand,
          bankBalances: assets.bankBalances,
          goldValue: assets.goldValue,
          silverValue: assets.silverValue,
          businessInventory: assets.businessInventory,
          receivables: assets.receivables,
          investments: assets.investments,
          agriculturalProduce: assets.agriculturalProduce,
        },
        liabilities: {
          outstandingDebts: liabilities.outstandingDebts,
          pendingPayments: liabilities.pendingPayments,
          mahrObligation: liabilities.mahrObligation,
        },
        currency,
        nisabThreshold,
      },
      steps: [
        { description: 'Total Zakatable Assets', amount: totalAssets },
        { description: 'Total Deductible Liabilities', amount: totalLiabilities },
        { description: 'Net Zakatable Wealth', amount: netWealth },
        { description: 'Nisab Threshold', amount: nisabThreshold },
        { description: 'Above Nisab?', answer: isAboveNisab ? 'Yes' : 'No' },
        { description: 'Zakat Rate', rate: '2.5%' },
        { description: 'Zakat Amount Due', amount: zakatAmount },
      ],
      result: {
        totalAssets,
        totalLiabilities,
        netWealth,
        nisabThreshold,
        isAboveNisab,
        zakatAmount,
        currency,
      },
      assumptions: [
        'All amounts are in the specified currency',
        'Assets are valued at current market value',
        'Nisab threshold is based on silver value (commonly used)',
        'This is an estimate - consult a qualified scholar for accuracy',
        'Agricultural produce Zakat rate not applied (depends on irrigation)',
      ],
      methodology: ZAKAT_METHODOLOGY,
    };

    return c.json({ data: calculation });
  },
);

export default zakatRoutes;
