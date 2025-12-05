
import { ReplenishmentRecord, CalculatedMetrics } from '../types';
import { EXCHANGE_RATE } from '../constants';

export const calculateMetrics = (record: ReplenishmentRecord): CalculatedMetrics => {
  // 1. Basic Weight
  const totalWeightKg = record.quantity * record.unitWeightKg;

  // 2. Packing Logic
  // Fallback for legacy records or missing input: calculate based on itemsPerBox
  const safeItemsPerBox = record.itemsPerBox > 0 ? record.itemsPerBox : 1;
  const calculatedCartons = Math.ceil(record.quantity / safeItemsPerBox);
  
  // Use manual totalCartons if available (even if 0, though normally >0), otherwise fallback
  // Checking for undefined/null just in case of data migration issues
  const totalCartons = (record.totalCartons !== undefined && record.totalCartons !== null && !isNaN(record.totalCartons) && record.totalCartons !== 0)
    ? record.totalCartons 
    : calculatedCartons;
  
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

  // 12. Inventory Health (Visual Alerts)
  // Days of Supply (DOS) = Current Qty / Daily Sales
  let daysOfSupply = 0;
  let stockStatus: CalculatedMetrics['stockStatus'] = 'Unknown';
  
  if (record.dailySales > 0) {
      daysOfSupply = record.quantity / record.dailySales;
      if (daysOfSupply < 15) stockStatus = 'Critical';
      else if (daysOfSupply < 30) stockStatus = 'Low';
      else if (daysOfSupply > 90) stockStatus = 'Overstock';
      else stockStatus = 'Healthy';
  }

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
    roi,
    daysOfSupply,
    stockStatus
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
