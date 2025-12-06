import { ReplenishmentRecord } from "../types";

// Interface for Miaoshou Inventory Data
export interface MiaoshouInventoryItem {
  product_sku: string;
  cn_name: string;
  stock_quantity: number; // Available
  shipping_quantity: number; // On the way
}

// Interface for Miaoshou Sales Data
export interface MiaoshouSalesItem {
    product_sku: string;
    avg_sales_7d: number;
    avg_sales_15d: number;
    avg_sales_30d: number;
}

// --- SHARED MOCK DATABASE (Connects to the same "Virtual Warehouse" as Lingxing) ---
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

const getOrGenerateMockData = (record: ReplenishmentRecord) => {
    const db = getMockDb();
    const cleanSku = record.sku.trim();
    
    // Check if we have data for this SKU
    if (!db[cleanSku]) {
        // If not found, generate random data ONCE and save it
        // Miaoshou logic might vary slightly in randomness to feel "real"
        const hasDrift = Math.random() > 0.3; 
        const randomDiff = hasDrift ? Math.floor(Math.random() * 20) - 5 : 0;
        const mockStock = Math.max(0, record.quantity + randomDiff);
        
        const volatility = 0.15;
        const mockSales = Math.max(0, record.dailySales + (record.dailySales * volatility * (Math.random() - 0.5)));

        db[cleanSku] = {
            stock: mockStock,
            sales: parseFloat(mockSales.toFixed(1))
        };
        saveMockDb(db);
    }
    
    return db[cleanSku];
};

export const fetchMiaoshouInventory = async (
  appKey: string, 
  appSecret: string, 
  localRecords: ReplenishmentRecord[],
  proxyUrl?: string
): Promise<MiaoshouInventoryItem[]> => {
  
  // 1. Real API Mode
  if (proxyUrl && proxyUrl.startsWith('http')) {
      if (!appKey || !appSecret) throw new Error("真实连接需要 App Key 和 Secret");
      try {
          const response = await fetch(`${proxyUrl}/miaoshou/inventory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appKey, appSecret, skus: localRecords.map(r => r.sku) })
          });
          if (!response.ok) throw new Error("秒手代理服务响应错误: " + response.statusText);
          const data = await response.json();
          return Array.isArray(data) ? data : [];
      } catch (e) {
          console.warn("Real Miaoshou API call failed.", e);
          throw new Error(`连接失败: ${e instanceof Error ? e.message : '网络错误'}`);
      }
  }

  // 2. Offline / Simulation Mode
  await new Promise(resolve => setTimeout(resolve, 600)); // Slightly faster than Lingxing to feel different
  
  return localRecords.map(record => {
      const data = getOrGenerateMockData(record);
      return {
          product_sku: record.sku,
          cn_name: record.productName,
          stock_quantity: data.stock, 
          shipping_quantity: 0
      };
  });
};

export const fetchMiaoshouSales = async (
    appKey: string, 
    appSecret: string, 
    localRecords: ReplenishmentRecord[],
    days: 30,
    proxyUrl?: string
  ): Promise<MiaoshouSalesItem[]> => {
    
    // 1. Real API Mode
    if (proxyUrl && proxyUrl.startsWith('http')) {
        if (!appKey || !appSecret) throw new Error("真实连接需要 App Key 和 Secret");
        try {
            const response = await fetch(`${proxyUrl}/miaoshou/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appKey, appSecret, days, skus: localRecords.map(r => r.sku) })
            });
            if (!response.ok) throw new Error("秒手代理服务响应错误");
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (e) {
            throw new Error(`连接失败: ${e instanceof Error ? e.message : '网络错误'}`);
        }
    }
  
    // 2. Offline / Simulation Mode
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return localRecords.map(record => {
        const data = getOrGenerateMockData(record);
        return {
            product_sku: record.sku,
            avg_sales_7d: data.sales, // Mock data usually flat
            avg_sales_15d: data.sales,
            avg_sales_30d: data.sales
        };
    });
  };
