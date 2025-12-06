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

// --- SHARED MOCK DATABASE ---
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

// Simulate "Miaoshou Only" products
const MOCK_MS_EXTRA_ITEMS = [
    { sku: 'MS-HOT-99', productName: 'RGB 机械键盘 (Miaoshou)', defaultStock: 200, defaultSales: 15 },
    { sku: 'MS-ACC-01', productName: '电竞鼠标垫 XL', defaultStock: 80, defaultSales: 5 }
];

const getAndJitterMockData = (sku: string, productName: string, baseQty: number, baseSales: number, applyJitter: boolean) => {
    const db = getMockDb();
    const cleanSku = sku.trim();
    
    if (!db[cleanSku]) {
        db[cleanSku] = {
            stock: Math.max(0, baseQty),
            sales: parseFloat(baseSales.toFixed(1))
        };
    }

    if (applyJitter) {
        // Miaoshou slightly different jitter profile
        const stockChange = Math.floor(Math.random() * 7) - 3; 
        let newStock = db[cleanSku].stock + stockChange;
        if (newStock < 0) newStock = 0;
        
        if (Math.random() > 0.9) newStock += 20; // Random small restock

        db[cleanSku].stock = newStock;
        
        const salesChange = (Math.random() - 0.5) * 1.5;
        let newSales = db[cleanSku].sales + salesChange;
        if (newSales < 0) newSales = 0;
        db[cleanSku].sales = parseFloat(newSales.toFixed(1));
    }

    saveMockDb(db);
    return db[cleanSku];
};

// Helper to safely fetch JSON from proxy
const safeJsonFetch = async (url: string, payload: any) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
        const text = await response.text();
        console.error("Proxy returned non-JSON:", text);
        throw new Error(`代理服务器响应格式错误(404/500)。请检查 URL 是否正确 (应以 /api/proxy 结尾)。`);
    }

    if (!response.ok) {
        throw new Error(`代理服务器报错: ${response.statusText}`);
    }

    return await response.json();
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
          // FIX: Use Query Params
          const baseUrl = proxyUrl.replace(/\/$/, '');
          // Miaoshou usually needs a specific param to distinguish action if we use a single proxy function
          const endpoint = `${baseUrl}?endpoint=inventory`; 
          
          const data = await safeJsonFetch(endpoint, { appKey, appSecret, skus: localRecords.map(r => r.sku) });
          return Array.isArray(data) ? data : [];
      } catch (e) {
          console.warn("Real Miaoshou API call failed.", e);
          throw new Error(`${e instanceof Error ? e.message : '网络错误'}`);
      }
  }

  // 2. Offline / Simulation Mode
  await new Promise(resolve => setTimeout(resolve, 600)); 
  
  const results: MiaoshouInventoryItem[] = [];

  // A. Local
  localRecords.forEach(record => {
      const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
      results.push({
          product_sku: record.sku,
          cn_name: record.productName,
          stock_quantity: data.stock, 
          shipping_quantity: 0
      });
  });

  // B. Discovery
  MOCK_MS_EXTRA_ITEMS.forEach(extra => {
      const exists = localRecords.some(r => r.sku.toLowerCase() === extra.sku.toLowerCase());
      if (!exists) {
          const data = getAndJitterMockData(extra.sku, extra.productName, extra.defaultStock, extra.defaultSales, false);
          results.push({
              product_sku: extra.sku,
              cn_name: extra.productName,
              stock_quantity: data.stock, 
              shipping_quantity: 0
          });
      }
  });

  return results;
};

export const fetchMiaoshouSales = async (
    appKey: string, 
    appSecret: string, 
    localRecords: ReplenishmentRecord[],
    days: 30,
    proxyUrl?: string
  ): Promise<MiaoshouSalesItem[]> => {
    
    if (proxyUrl && proxyUrl.startsWith('http')) {
        if (!appKey || !appSecret) throw new Error("真实连接需要 App Key 和 Secret");
        try {
            // FIX: Use Query Params
            const baseUrl = proxyUrl.replace(/\/$/, '');
            const endpoint = `${baseUrl}?endpoint=sales`;
            
            const data = await safeJsonFetch(endpoint, { appKey, appSecret, days, skus: localRecords.map(r => r.sku) });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            throw new Error(`${e instanceof Error ? e.message : '网络错误'}`);
        }
    }
  
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const results: MiaoshouSalesItem[] = [];

    // Local
    localRecords.forEach(record => {
        const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
        results.push({
            product_sku: record.sku,
            avg_sales_7d: data.sales,
            avg_sales_15d: data.sales,
            avg_sales_30d: data.sales
        });
    });

    // Discovery
    MOCK_MS_EXTRA_ITEMS.forEach(extra => {
        const exists = localRecords.some(r => r.sku.toLowerCase() === extra.sku.toLowerCase());
        if (!exists) {
            const data = getAndJitterMockData(extra.sku, extra.productName, extra.defaultStock, extra.defaultSales, false);
            results.push({
                product_sku: extra.sku,
                avg_sales_7d: data.sales,
                avg_sales_15d: data.sales,
                avg_sales_30d: data.sales
            });
        }
    });

    return results;
  };