
import { ReplenishmentRecord } from "../types";

// Interface for Lingxing Inventory Data
export interface LingxingInventoryItem {
  sku: string;
  productName: string;
  fbaStock: number; // FBA Available
  localStock: number; // Local Warehouse
  onWayStock: number; // Inbound
}

// Interface for Sales Data
export interface LingxingSalesItem {
    sku: string;
    avgDailySales: number; // Calculated average
}

// --- PERSISTENT MOCK DATABASE ---
// Key used for localStorage
const STORAGE_KEY_MOCK_DB = 'tanxing_mock_erp_db_v1';

// Helper to get DB from storage
const getMockDb = (): Record<string, { stock: number, sales: number }> => {
    try {
        const str = localStorage.getItem(STORAGE_KEY_MOCK_DB);
        return str ? JSON.parse(str) : {};
    } catch (e) {
        return {};
    }
};

// Helper to save DB to storage
const saveMockDb = (db: Record<string, { stock: number, sales: number }>) => {
    localStorage.setItem(STORAGE_KEY_MOCK_DB, JSON.stringify(db));
};

// Reset function for testing
export const resetMockErpData = () => {
    localStorage.removeItem(STORAGE_KEY_MOCK_DB);
};

// NEW: Allow manual update of mock data
export const updateMockErpItem = (sku: string, field: 'stock' | 'sales', value: number) => {
    const db = getMockDb();
    if (!db[sku]) {
        db[sku] = { stock: 0, sales: 0 };
    }
    db[sku][field] = value;
    saveMockDb(db);
};

const getOrGenerateMockData = (record: ReplenishmentRecord) => {
    const db = getMockDb();
    
    // If this SKU doesn't exist in our "ERP", create it once and save it.
    if (!db[record.sku]) {
        // Generate stable mock data
        // Logic: 70% chance of having a discrepancy initially
        const hasDrift = Math.random() > 0.3; 
        const randomDiff = hasDrift ? Math.floor(Math.random() * 30) - 10 : 0; // -10 to +20 variance
        
        // Ensure strictly positive
        const mockStock = Math.max(0, record.quantity + (randomDiff === 0 && hasDrift ? 5 : randomDiff));
        
        // Mock Sales
        const volatility = 0.2;
        const mockSales = Math.max(0, record.dailySales + (record.dailySales * volatility * (Math.random() - 0.5)));

        db[record.sku] = {
            stock: mockStock,
            sales: parseFloat(mockSales.toFixed(1))
        };
        
        saveMockDb(db);
    }
    
    return db[record.sku];
};

/**
 * 模拟调用领星 API 获取库存数据
 * 如果提供了 proxyUrl，则尝试发起真实请求 (需要用户自己搭建简单的后端代理)
 */
export const fetchLingxingInventory = async (
  appId: string, 
  accessToken: string, 
  localRecords: ReplenishmentRecord[],
  proxyUrl?: string
): Promise<LingxingInventoryItem[]> => {
  
  // 1. Real API Mode (If Proxy URL is provided)
  if (proxyUrl && proxyUrl.startsWith('http')) {
      if (!appId || !accessToken) throw new Error("真实连接需要 App ID 和 Token");
      
      try {
          const response = await fetch(`${proxyUrl}/inventory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appId, accessToken, skus: localRecords.map(r => r.sku) })
          });
          if (!response.ok) throw new Error("代理服务响应错误");
          return await response.json();
      } catch (e) {
          console.warn("Real API call failed, falling back to mock.", e);
          throw new Error(`连接失败: ${e instanceof Error ? e.message : '未知错误'}`);
      }
  }

  // 2. Mock Mode (Simulation)
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network latency
  
  return localRecords.map(record => {
      const mockData = getOrGenerateMockData(record);
      
      return {
          sku: record.sku,
          productName: record.productName,
          fbaStock: mockData.stock, // Returns the consistent persistent value
          localStock: 0,
          onWayStock: Math.floor(Math.random() * 50) // This can remain random for "Inbound" noise
      };
  });
};

/**
 * Fetch Sales Data (Average Daily Sales) from OMS
 */
export const fetchLingxingSales = async (
    appId: string, 
    accessToken: string, 
    localRecords: ReplenishmentRecord[],
    days: 7 | 14 | 30,
    proxyUrl?: string
  ): Promise<LingxingSalesItem[]> => {
    
    // 1. Real API Mode
    if (proxyUrl && proxyUrl.startsWith('http')) {
        if (!appId || !accessToken) throw new Error("真实连接需要 App ID 和 Token");
        // Implementation for real proxy...
        throw new Error("暂未检测到有效的后端代理服务");
    }
  
    // 2. Mock Mode
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return localRecords.map(record => {
        const mockData = getOrGenerateMockData(record);
        
        return {
            sku: record.sku,
            avgDailySales: mockData.sales
        };
    });
  };

/**
 * Calculate differences between Local and ERP
 */
export const calculateInventoryDiff = (
    localRecords: ReplenishmentRecord[], 
    erpData: LingxingInventoryItem[]
) => {
    const diffs: { 
        recordId: string; 
        sku: string; 
        productName: string;
        localVal: number; 
        erpVal: number; 
        diff: number 
    }[] = [];

    localRecords.forEach(local => {
        const erpItem = erpData.find(e => e.sku === local.sku);
        if (erpItem) {
            const totalErp = erpItem.fbaStock;
            // Always show item in list if we are in "Edit Mode" (implied by usage)
            // But for diff calculation, we usually only care about differences.
            // However, to allow user to edit "ERP Data" even if match, we might need a way to access them.
            // For now, let's keep showing only diffs, but user can edit the mock DB to create a diff or fix one.
            
            if (local.quantity !== totalErp) {
                diffs.push({
                    recordId: local.id,
                    sku: local.sku,
                    productName: local.productName,
                    localVal: local.quantity,
                    erpVal: totalErp,
                    diff: totalErp - local.quantity
                });
            }
        }
    });
    return diffs;
};

export const calculateSalesDiff = (
    localRecords: ReplenishmentRecord[], 
    erpData: LingxingSalesItem[]
) => {
    const diffs: { 
        recordId: string; 
        sku: string; 
        productName: string;
        localVal: number; 
        erpVal: number; 
        diff: number 
    }[] = [];

    localRecords.forEach(local => {
        const erpItem = erpData.find(e => e.sku === local.sku);
        if (erpItem) {
            // Check if difference is significant (> 0.1)
            if (Math.abs(local.dailySales - erpItem.avgDailySales) > 0.1) {
                diffs.push({
                    recordId: local.id,
                    sku: local.sku,
                    productName: local.productName,
                    localVal: local.dailySales,
                    erpVal: erpItem.avgDailySales,
                    diff: erpItem.avgDailySales - local.dailySales
                });
            }
        }
    });
    return diffs;
};
