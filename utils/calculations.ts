
import { ReplenishmentRecord, CalculatedMetrics } from '../types';
import { EXCHANGE_RATE } from '../constants';

export const calculateMetrics = (record: ReplenishmentRecord): CalculatedMetrics => {
  // 1. Weight Calculation
  const naturalWeight = record.quantity * record.unitWeightKg;
  
  // Use manual override if it exists and is greater than 0, otherwise use calculated weight
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
  // Now uses totalWeightKg which might be the manual billing weight
  const shippingFeeCNY = totalWeightKg * record.shippingUnitPriceCNY; 
  
  const fixedLogisticsCostCNY = 
    (record.materialCostCNY || 0) + 
    (record.customsFeeCNY || 0) + 
    (record.portFeeCNY || 0);

  const firstLegCostCNY = shippingFeeCNY + fixedLogisticsCostCNY;

  // 4. Convert First Leg to USD
  const firstLegCostUSD = firstLegCostCNY / EXCHANGE_RATE;
  
  // 5. Per Unit First Leg (USD)
  const singleHeadHaulCostUSD = record.quantity > 0 ? firstLegCostUSD / record.quantity : 0;

  // 6. Product Cost in USD
  const productCostUSD = record.unitPriceCNY / EXCHANGE_RATE;

  // 7. Calculate TikTok Specific Fees (USD)
  const platformFeeUSD = record.salesPriceUSD * (record.platformFeeRate / 100);
  const affiliateCommissionUSD = record.salesPriceUSD * (record.affiliateCommissionRate / 100);
  const fixedFeeUSD = record.additionalFixedFeeUSD || 0; // New: Fixed Transaction Fee

  // 8. Return Loss Provision (New)
  // Logic: We assume returns result in lost Shipping (Head Haul + Last Mile) + Ad Spend. 
  // We assume Product Cost is recoverable (optimistic) or partially lost. 
  // For simplicity and safety in US dropshipping/FBA models, we often calculate it as a % of the Landed Cost or Sales Price.
  // Here, we calculate it as: (Product + Logistics + Ads) * ReturnRate. Meaning these costs are wasted on returned units.
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
    returnLossProvisionUSD; // Add return provision to cost

  // 10. Profit
  const estimatedProfitUSD = record.salesPriceUSD - totalCostPerUnitUSD;

  // 11. Margin (Profit / Sales Price)
  const marginRate = record.salesPriceUSD > 0 ? (estimatedProfitUSD / record.salesPriceUSD) * 100 : 0;

  // 12. ROI (Profit / Total Cost)
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
