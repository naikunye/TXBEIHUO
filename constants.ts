// Fixed Exchange Rate from your CSV
export const EXCHANGE_RATE = 7.3;

export const MOCK_DATA_INITIAL = [
  {
    id: '1',
    date: '2025-03-01',
    productName: 'MAD ACID',
    sku: 'MA-001',
    quantity: 42,
    unitPriceCNY: 11.99,
    unitWeightKg: 0.65,
    boxLengthCm: 40,
    boxWidthCm: 30,
    boxHeightCm: 30,
    itemsPerBox: 10,
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 62,
    materialCostCNY: 0,
    salesPriceUSD: 16.99,
    lastMileCostUSD: 5.46,
    adCostUSD: 1.64,
    platformFeeRate: 2.0, // 2%
    affiliateCommissionRate: 0, // Self-operated
    warehouse: '火星/休斯顿/美中',
    status: 'Shipped'
  },
  {
    id: '2',
    date: '2025-03-06',
    productName: 'Carplay Q1M',
    sku: 'CP-Q1M',
    quantity: 200,
    unitPriceCNY: 64,
    unitWeightKg: 0.03,
    boxLengthCm: 50,
    boxWidthCm: 40,
    boxHeightCm: 35,
    itemsPerBox: 50,
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 53,
    materialCostCNY: 292,
    salesPriceUSD: 39.6, // Adjusted price for better margin example
    lastMileCostUSD: 4.15,
    adCostUSD: 5.00,
    platformFeeRate: 2.0,
    affiliateCommissionRate: 15.0, // 15% to influencer
    warehouse: '火星/休斯顿/美中',
    status: 'Planning'
  },
  {
    id: '3',
    date: '2025-03-14',
    productName: 'AI BOX2 (Fan)',
    sku: 'BOX2-NEW',
    quantity: 150,
    unitPriceCNY: 130,
    unitWeightKg: 0.085,
    boxLengthCm: 32,
    boxWidthCm: 24,
    boxHeightCm: 18,
    itemsPerBox: 20,
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 62,
    materialCostCNY: 30,
    salesPriceUSD: 68.56,
    lastMileCostUSD: 5.44,
    adCostUSD: 10.00,
    platformFeeRate: 2.0,
    affiliateCommissionRate: 10.0, // 10% Affiliate
    warehouse: '火星/休斯顿/美中',
    status: 'Arrived'
  }
] as const;