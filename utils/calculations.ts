import { ReplenishmentRecord, CalculatedMetrics } from '../types';
import { EXCHANGE_RATE } from '../constants';

export const calculateMetrics = (record: ReplenishmentRecord): CalculatedMetrics => {
  // 1. Basic Weight
  const totalWeightKg = record.quantity * record.unitWeightKg;

  // 2. Packing Logic
  // Avoid division by zero
  const safeItemsPerBox = record.itemsPerBox > 0 ? record.itemsPerBox : 1;
  const totalCartons = Math.ceil(record.quantity / safeItemsPerBox);
  
  // Volume CBM Calculation: (L * W * H) / 1,000,000 * TotalCartons
  const singleBoxVolumeCbm = (record.boxLengthCm * record.boxWidthCm * record.boxHeightCm) / 1000000;
  const totalVolumeCbm = singleBoxVolumeCbm * totalCartons;
  
  const singleBoxWeightKg = record.unitWeightKg * safeItemsPerBox;

  // 3. First Leg Shipping Cost (RMB)
  // Logic: (Weight * Unit Shipping Price) + Material Fees
  // Note: Future upgrade -> Compare Actual Weight vs Volumetric Weight (CBM * 167 for Air)
  const shippingFeeCNY = totalWeightKg * record.shippingUnitPriceCNY; 
  const firstLegCostCNY = shippingFeeCNY + record.materialCostCNY;

  // 4. Convert First Leg to USD
  const firstLegCostUSD = firstLegCostCNY / EXCHANGE_RATE;
  
  // 5. Per Unit First Leg (USD)
  const singleHeadHaulCostUSD = record.quantity > 0 ? firstLegCostUSD / record.quantity : 0;

  // 6. Product Cost in USD
  const productCostUSD = record.unitPriceCNY / EXCHANGE_RATE;

  // 7. Calculate TikTok Specific Fees (USD)
  // These are based on Sales Price
  const platformFeeUSD = record.salesPriceUSD * (record.platformFeeRate / 100);
  const affiliateCommissionUSD = record.salesPriceUSD * (record.affiliateCommissionRate / 100);

  // 8. Total Landed Cost Per Unit (USD)
  // Product + Head Haul + Last Mile + Ad + Platform Fees + Affiliate Commission
  const totalCostPerUnitUSD = 
    productCostUSD + 
    singleHeadHaulCostUSD + 
    record.lastMileCostUSD + 
    record.adCostUSD +
    platformFeeUSD +
    affiliateCommissionUSD;

  // 9. Profit
  const estimatedProfitUSD = record.salesPriceUSD - totalCostPerUnitUSD;

  // 10. Margin (Profit / Sales Price)
  const marginRate = record.salesPriceUSD > 0 ? (estimatedProfitUSD / record.salesPriceUSD) * 100 : 0;

  // 11. ROI (Profit / Total Cost)
  const roi = totalCostPerUnitUSD > 0 ? (estimatedProfitUSD / totalCostPerUnitUSD) * 100 : 0;

  return {
    totalWeightKg,
    totalVolumeCbm,
    totalCartons,
    singleBoxWeightKg,
    firstLegCostCNY,
    firstLegCostUSD,
    singleHeadHaulCostUSD,
    productCostUSD,
    platformFeeUSD,
    affiliateCommissionUSD,
    totalCostPerUnitUSD,
    estimatedProfitUSD,
    marginRate,
    roi
  };
};

export const formatCurrency = (val: number, currency: 'USD' | 'CNY' = 'USD') => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};