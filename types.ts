
export type ShippingMethod = 'Sea' | 'Air';

export type LifecycleStatus = 'New' | 'Growth' | 'Stable' | 'Clearance';

// Core data model matching your business logic
export interface ReplenishmentRecord {
  id: string;
  date: string;
  productName: string;
  sku: string;
  imageUrl?: string;
  
  // Lifecycle Management (New)
  lifecycle: LifecycleStatus;
  
  // Base Product Data
  quantity: number;
  dailySales: number; // 预估日均销量 (用于计算库存周转)
  unitPriceCNY: number; // 采购单价 (RMB)
  unitWeightKg: number; // 单个重量
  
  // Packing Info (New)
  boxLengthCm: number;
  boxWidthCm: number;
  boxHeightCm: number;
  itemsPerBox: number; // 每箱装多少个 (Reference only)
  totalCartons: number; // 总箱数 (Manual override)

  // Logistics Data (First Leg / Head Haul)
  shippingMethod: ShippingMethod;
  shippingUnitPriceCNY: number; // 海运/空运单价 (RMB/kg)
  materialCostCNY: number; // 头程耗材费
  
  // Last Mile & Sales (USD)
  salesPriceUSD: number; // 销售价格 ($)
  lastMileCostUSD: number; // 尾程配送费 ($)
  adCostUSD: number; // 广告费 ($)
  
  // TikTok Specific Fees (New)
  platformFeeRate: number; // TikTok Shop 平台佣金率 (e.g., 2.0 for 2%)
  affiliateCommissionRate: number; // 达人带货佣金率 (e.g., 15.0 for 15%)

  // Warehouse Info
  warehouse: string;
  status: 'Planning' | 'Shipped' | 'Arrived';
}

// Calculated Metrics (Computed on the fly)
export interface CalculatedMetrics {
  totalWeightKg: number;
  totalVolumeCbm: number; // Total Cubic Meters
  totalCartons: number;   // Total boxes
  singleBoxWeightKg: number;

  firstLegCostCNY: number; // Total Shipping Cost RMB
  firstLegCostUSD: number; // Converted to USD
  singleHeadHaulCostUSD: number; // Cost to ship ONE unit in USD
  productCostUSD: number; // Product sourcing cost in USD
  
  // Fee Amounts (USD)
  platformFeeUSD: number;
  affiliateCommissionUSD: number;

  totalCostPerUnitUSD: number; // Landed Cost (Product + Ship + Last Mile + Ad + Fees)
  estimatedProfitUSD: number; // Sales - Total Cost
  marginRate: number; // Profit / Sales (Gross Margin)
  roi: number; // Profit / Total Cost (Return on Investment)
  
  // Inventory Health Metrics
  daysOfSupply: number; // Quantity / Daily Sales
  stockStatus: 'Critical' | 'Low' | 'Healthy' | 'Overstock' | 'Unknown';
}
