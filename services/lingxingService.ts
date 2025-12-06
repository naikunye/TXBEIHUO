
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
const STORAGE_KEY_MOCK_DB = 'tanxing_mock_erp_db_v1';

const getMockDb = (): Record<string, { stock: number, sales: number }> => {
    try {
        const str = localStorage.getItem(STORAGE_KEY_MOCK_DB);
        return str ? JSON.parse(str) : {};
    } catch (e) {
        return {};
    }
};

const saveMockDb = (db: Record<string, { stock: number, sales: number }>) => {
    localStorage.setItem(STORAGE_KEY_MOCK_DB, JSON.stringify(db));
};

export const resetMockErpData = () => {
    localStorage.removeItem(STORAGE_KEY_MOCK_DB);
};

export const updateMockErpItem = (sku: string, field: 'stock' | 'sales', value: number) => {
    const db = getMockDb();
    if (!db[sku]) {
        db[sku] = { stock: 0, sales: 0 };
    }
    db[sku][field] = value;
    saveMockDb(db);
};

// NEW: Bulk Import Real Data
export const bulkImportRealData = (data: { sku: string; qty: number }[]) => {
    const db = getMockDb();
    let count = 0;
    data.forEach(item => {
        if (!db[item.sku]) db[item.sku] = { stock: 0, sales: 0 };
        db[item.sku].stock = item.qty;
        // Also update sales randomly if missing to avoid 0
        if (!db[item.sku].sales) db[item.sku].sales = Math.floor(item.qty * 0.1);
        count++;
    });
    saveMockDb(db);
    return count;
};

const getOrGenerateMockData = (record: ReplenishmentRecord) => {
    const db = getMockDb();
    
    if (!db[record.sku]) {
        // Default random generation if no real data imported
        const hasDrift = Math.random() > 0.3; 
        const randomDiff = hasDrift ? Math.floor(Math.random() * 30) - 10 : 0;
        const mockStock = Math.max(0, record.quantity + (randomDiff === 0 && hasDrift ? 5 : randomDiff));
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

export const fetchLingxingInventory = async (
  appId: string, 
  accessToken: string, 
  localRecords: ReplenishmentRecord[],
  proxyUrl?: string
): Promise<LingxingInventoryItem[]> => {
  
  // 1. Real API Mode
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
          console.warn("Real API call failed.", e);
          throw new Error(`连接失败: ${e instanceof Error ? e.message : '未知错误'}`);
      }
  }

  // 2. Offline / Simulation Mode
  // If user imported data, this will return that REAL data.
  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  return localRecords.map(record => {
      const data = getOrGenerateMockData(record);
      return {
          sku: record.sku,
          productName: record.productName,
          fbaStock: data.stock, 
          localStock: 0,
          onWayStock: 0
      };
  });
};

export const fetchLingxingSales = async (
    appId: string, 
    accessToken: string, 
    localRecords: ReplenishmentRecord[],
    days: 7 | 14 | 30,
    proxyUrl?: string
  ): Promise<LingxingSalesItem[]> => {
    
    if (proxyUrl && proxyUrl.startsWith('http')) {
        throw new Error("暂未检测到有效的后端代理服务");
    }
  
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return localRecords.map(record => {
        const data = getOrGenerateMockData(record);
        return {
            sku: record.sku,
            avgDailySales: data.sales
        };
    });
  };

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
