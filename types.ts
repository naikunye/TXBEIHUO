
export type ShippingMethod = 'Sea' | 'Air';

export type LifecycleStatus = 'New' | 'Growth' | 'Stable' | 'Clearance';

export interface Store {
  id: string;
  name: string;
  color: string; 
  platform: 'TikTok' | 'Amazon' | 'Temu' | 'Other';
}

// --- NEW: Supplier CRM ---
export type PaymentTerm = '100% Prepay' | '30/70' | 'Net 30' | 'Net 60';

export interface Supplier {
    id: string;
    name: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    paymentTerms: PaymentTerm;
    leadTimeDays: number; // Agreed lead time
    rating: number; // 1-5 stars (Manual or Auto)
    tags: string[]; // e.g. "Electronics", "Shenzhen"
    mainProducts: string[]; // SKUs provided
    notes?: string;
}

// --- NEW: Global Settings ---
export interface LogisticsTier {
  minWeight: number; // e.g. 0
  maxWeight: number; // e.g. 21
  price: number;     // e.g. 65
}

export interface AppSettings {
  exchangeRate: number; // USD to CNY
  airTiers: LogisticsTier[];
  seaTiers: LogisticsTier[];
}

// --- NEW: Purchase Order Flow ---
export type POStatus = 'Draft' | 'Ordered' | 'Production' | 'Shipped' | 'PartiallyArrived' | 'Arrived' | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  sku: string;
  productName: string;
  supplierId?: string; // NEW: Link to Supplier
  supplierName?: string; // Legacy/Display
  quantity: number;
  receivedQuantity?: number; // NEW: Track partial receipts
  unitPriceCNY: number;
  totalAmountCNY: number;
  status: POStatus;
  expectedDeliveryDate?: string;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: ShippingMethod;
  notes?: string;
}

// --- NEW: WMS Inventory Log (Enterprise) ---
export type WarehouseType = 'CN_Local' | 'US_West' | 'US_East' | 'FBA_US' | 'Transit';
export type TransactionType = 'Inbound' | 'Outbound' | 'Transfer' | 'Adjustment' | 'Sales';

export interface InventoryLog {
  id: string;
  date: string;
  sku: string;
  warehouse: WarehouseType;
  type: TransactionType;
  quantityChange: number; // Can be positive or negative
  balanceAfter?: number; // Snapshot of balance
  referenceId?: string; // PO Number or Order ID
  note?: string;
}

// --- NEW: History Log (Audit Trail) ---
export interface ChangeLogEntry {
    id: string;
    date: string;
    user: string;
    action: 'Create' | 'Update' | 'Delete';
    details: string;
}

// --- NEW: OMS External Order (Enterprise) ---
export interface ExternalOrder {
  id: string;
  platformOrderId: string;
  platform: 'TikTok' | 'Amazon' | 'Shopify';
  orderDate: string;
  orderStatus: 'Unfulfilled' | 'Fulfilled' | 'Cancelled';
  customerName: string;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  currency: string;
  shippingAddress?: string;
}

// --- NEW: Finance & Accounting ---
// Updated to support specific requested categories + arbitrary strings
export type FinanceCategory = 
  | 'Revenue' 
  | 'Deposit' 
  | 'COGS' 
  | 'ProductPurchase'
  | 'Logistics' 
  | 'TikTokAds'
  | 'Marketing' 
  | 'Rent' 
  | 'Salary' 
  | 'Software' 
  | 'Withdrawal'
  | 'Other' 
  | string;

export type FinanceType = 'Income' | 'Expense';

export interface FinanceTransaction {
  id: string;
  date: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number; // Always positive
  currency: 'CNY' | 'USD';
  description: string;
  isSystemGenerated?: boolean; // If true, comes from PO or Orders
  referenceId?: string;
}

// Core data model matching your business logic
export interface ReplenishmentRecord {
  id: string;
  storeId?: string; // Deprecated: keeping for backward compatibility
  storeIds?: string[]; // New: Multiple stores per SKU
  date: string;
  productName: string;
  sku: string;
  imageUrl?: string;
  
  // Lifecycle Management
  lifecycle: LifecycleStatus;
  
  // Base Product Data
  quantity: number; // This acts as Total Stock across all warehouses
  dailySales: number; 
  unitPriceCNY: number; 
  unitWeightKg: number; 
  
  // Supply Chain Params
  leadTimeDays?: number; 
  safetyStockDays?: number; 
  
  // Supplier CRM
  supplierId?: string; // NEW
  supplierName?: string;
  supplierContact?: string; 
  moq?: number; 
  
  // Competitor Intel
  competitorUrl?: string;
  competitorPriceUSD?: number;
  
  // Packing Info
  boxLengthCm: number;
  boxWidthCm: number;
  boxHeightCm: number;
  itemsPerBox: number; 
  totalCartons: number; 

  // Logistics Data
  shippingMethod: ShippingMethod;
  shippingUnitPriceCNY: number; // This can now be overridden or calculated dynamically
  manualTotalWeightKg?: number; 
  
  // Live Tracking
  trackingNumber?: string;
  carrier?: string; 
  etd?: string; 
  eta?: string; 
  
  // Fixed Logistics Costs
  materialCostCNY: number; 
  customsFeeCNY: number;   
  portFeeCNY: number;      
  
  // Last Mile & Sales (USD)
  salesPriceUSD: number; 
  lastMileCostUSD: number; 
  adCostUSD: number; 
  
  // TikTok Specific Fees
  platformFeeRate: number; 
  affiliateCommissionRate: number; 
  additionalFixedFeeUSD: number; 
  returnRate: number; 

  // Warehouse Info
  warehouse: string; // Legacy string field
  status: 'Planning' | 'Shipped' | 'Arrived';

  // History & Trash
  history?: ChangeLogEntry[]; // Local history cache
  isDeleted?: boolean;
  deletedAt?: string; 
}

// Calculated Metrics
export interface CalculatedMetrics {
  totalWeightKg: number;
  totalVolumeCbm: number; 
  totalCartons: number;   
  singleBoxWeightKg: number;

  firstLegCostCNY: number; 
  firstLegCostUSD: number; 
  singleHeadHaulCostUSD: number; 
  productCostUSD: number; 
  
  // Fee Amounts (USD)
  platformFeeUSD: number;
  affiliateCommissionUSD: number;
  returnLossProvisionUSD: number; 

  totalCostPerUnitUSD: number; 
  estimatedProfitUSD: number; 
  marginRate: number; 
  roi: number; 
  
  // Inventory Health Metrics
  daysOfSupply: number; 
  stockStatus: 'Critical' | 'Low' | 'Healthy' | 'Overstock' | 'Unknown';
}
