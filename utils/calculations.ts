
import { ReplenishmentRecord, CalculatedMetrics, AppSettings } from '../types';

// Helper to find tiered price
const getTieredPrice = (weight: number, tiers: AppSettings['airTiers']) => {
    // Sort tiers by weight desc to find the matching range
    const sorted = [...tiers].sort((a, b) => a.minWeight - b.minWeight);
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (weight >= sorted[i].minWeight) {
            return sorted[i].price;
        }
    }
    return 0; // Fallback
};

export const calculateMetrics = (record: ReplenishmentRecord, settings?: AppSettings): CalculatedMetrics => {
  // Fallback to defaults if settings not provided (migration safety)
  const exchangeRate = settings?.exchangeRate || 7.3;

  // 1. Weight Calculation
  const naturalWeight = record.quantity * record.unitWeightKg;
  const totalWeightKg = (record.manualTotalWeightKg && record.manualTotalWeightKg > 0) 
    ? record.manualTotalWeightKg 
    : naturalWeight;

  // 2. Packing Logic
  const safeItemsPerBox = record.itemsPerBox > 0 ? record.itemsPerBox : 1;
  const calculatedCartons = Math.ceil(record.quantity / safeItemsPerBox);
  
  const totalCartons = (record.totalCartons !== undefined && record.totalCartons !== null && !isNaN(record.totalCartons) && record.totalCartons !== 0)
    ? record.totalCartons 
    : calculatedCartons;
  
  const singleBoxVolumeCbm = (record.boxLengthCm * record.boxWidthCm * record.boxHeightCm) / 1000000;
  const totalVolumeCbm = singleBoxVolumeCbm * totalCartons;
  const singleBoxWeightKg = record.unitWeightKg * safeItemsPerBox;

  // 3. First Leg Shipping Cost (RMB)
  // Dynamic Pricing Logic:
  let shippingUnitPrice = record.shippingUnitPriceCNY;
  
  // Apply Simulation Markup if active (for manual prices)
  if (shippingUnitPrice && shippingUnitPrice > 0 && settings?.simulatedFreightMarkup) {
      shippingUnitPrice = shippingUnitPrice * (1 + settings.simulatedFreightMarkup / 100);
  }

  // Fallback to Tiers if no manual price (or it's 0)
  if (settings && (!shippingUnitPrice || shippingUnitPrice === 0)) {
      if (record.shippingMethod === 'Air') {
          // Note: airTiers in settings might already be marked up if passed from App.tsx 'effectiveSettings'
          shippingUnitPrice = getTieredPrice(totalWeightKg, settings.airTiers);
      } else {
          shippingUnitPrice = getTieredPrice(totalWeightKg, settings.seaTiers);
      }
  }

  const shippingFeeCNY = totalWeightKg * shippingUnitPrice; 
  
  const fixedLogisticsCostCNY = 
    (record.materialCostCNY || 0) + 
    (record.customsFeeCNY || 0) + 
    (record.portFeeCNY || 0);

  const firstLegCostCNY = shippingFeeCNY + fixedLogisticsCostCNY;

  // 4. Convert First Leg to USD (Dynamic Rate)
  const firstLegCostUSD = firstLegCostCNY / exchangeRate;
  
  // 5. Per Unit First Leg (USD)
  const singleHeadHaulCostUSD = record.quantity > 0 ? firstLegCostUSD / record.quantity : 0;

  // 6. Product Cost in USD (Dynamic Rate)
  const productCostUSD = record.unitPriceCNY / exchangeRate;

  // 7. Calculate TikTok Specific Fees (USD)
  const platformFeeUSD = record.salesPriceUSD * (record.platformFeeRate / 100);
  const affiliateCommissionUSD = record.salesPriceUSD * (record.affiliateCommissionRate / 100);
  const fixedFeeUSD = record.additionalFixedFeeUSD || 0; 

  // 8. Return Loss Provision
  const baseCostForReturn = productCostUSD + singleHeadHaulCostUSD + record.lastMileCostUSD + record.adCostUSD;
  const returnLossProvisionUSD = baseCostForReturn * ((record.returnRate || 0) / 100);

  // 9. Total Landed Cost Per Unit (USD)
  const totalCostPerUnitUSD = 
    productCostUSD + 
    singleHeadHaulCostUSD + 
    record.lastMileCostUSD + 
    record.adCostUSD +
    platformFeeUSD +
    affiliateCommissionUSD +
    fixedFeeUSD +
    returnLossProvisionUSD;

  // 10. Profit
  const estimatedProfitUSD = record.salesPriceUSD - totalCostPerUnitUSD;

  // 11. Margin
  const marginRate = record.salesPriceUSD > 0 ? (estimatedProfitUSD / record.salesPriceUSD) * 100 : 0;

  // 12. ROI
  const roi = totalCostPerUnitUSD > 0 ? (estimatedProfitUSD / totalCostPerUnitUSD) * 100 : 0;

  // 13. Inventory Health
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
    returnLossProvisionUSD,
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
