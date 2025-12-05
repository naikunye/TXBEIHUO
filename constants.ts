
import { ReplenishmentRecord } from "./types";

// Fixed Exchange Rate from your CSV
export const EXCHANGE_RATE = 7.3;

export const MOCK_DATA_INITIAL: ReplenishmentRecord[] = [
  {
    id: '1',
    date: '2025-03-01',
    productName: 'MAD ACID',
    sku: 'MA-001',
    lifecycle: 'New',
    quantity: 42,
    dailySales: 2, // New Product, low velocity
    unitPriceCNY: 11.99,
    unitWeightKg: 0.65,
    boxLengthCm: 40,
    boxWidthCm: 30,
    boxHeightCm: 30,
    itemsPerBox: 10,
    totalCartons: 5, // Manual entry: 42 / 10 = 4.2 -> 5 cartons
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 62,
    materialCostCNY: 20,
    customsFeeCNY: 150,
    portFeeCNY: 50,
    salesPriceUSD: 16.99,
    lastMileCostUSD: 5.46,
    adCostUSD: 1.64,
    platformFeeRate: 2.0, // 2%
    affiliateCommissionRate: 0, // Self-operated
    additionalFixedFeeUSD: 0.30, // Standard TT US fee
    returnRate: 5.0, // 5% return rate
    warehouse: '火星/休斯顿/美中',
    status: 'Shipped'
  },
  {
    id: '2',
    date: '2025-03-06',
    productName: 'Carplay Q1M',
    sku: 'CP-Q1M',
    lifecycle: 'Growth',
    quantity: 200,
    dailySales: 15, // High growth
    unitPriceCNY: 64,
    unitWeightKg: 0.03,
    boxLengthCm: 50,
    boxWidthCm: 40,
    boxHeightCm: 35,
    itemsPerBox: 50,
    totalCartons: 4, // 200 / 50 = 4
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 53,
    materialCostCNY: 50,
    customsFeeCNY: 200,
    portFeeCNY: 42,
    salesPriceUSD: 39.6, // Adjusted price for better margin example
    lastMileCostUSD: 4.15,
    adCostUSD: 5.00,
    platformFeeRate: 2.0,
    affiliateCommissionRate: 15.0, // 15% to influencer
    additionalFixedFeeUSD: 0.30,
    returnRate: 8.0, // Electronics return rate slightly higher
    warehouse: '火星/休斯顿/美中',
    status: 'Planning'
  },
  {
    id: '3',
    date: '2025-03-14',
    productName: 'AI BOX2 (Fan)',
    sku: 'BOX2-NEW',
    lifecycle: 'Stable',
    quantity: 150,
    dailySales: 5, // Stable sales
    unitPriceCNY: 130,
    unitWeightKg: 0.085,
    boxLengthCm: 32,
    boxWidthCm: 24,
    boxHeightCm: 18,
    itemsPerBox: 20,
    totalCartons: 8, // 150 / 20 = 7.5 -> 8 cartons
    shippingMethod: 'Air',
    shippingUnitPriceCNY: 62,
    materialCostCNY: 30,
    customsFeeCNY: 0,
    portFeeCNY: 0,
    salesPriceUSD: 68.56,
    lastMileCostUSD: 5.44,
    adCostUSD: 10.00,
    platformFeeRate: 2.0,
    affiliateCommissionRate: 10.0, // 10% Affiliate
    additionalFixedFeeUSD: 0.30,
    returnRate: 3.0,
    warehouse: '火星/休斯顿/美中',
    status: 'Arrived'
  }
];
