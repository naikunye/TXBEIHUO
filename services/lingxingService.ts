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

// Simulate "ERP Only" products that aren't in the local system yet
const MOCK_ERP_EXTRA_ITEMS = [
    { sku: 'LX-NEW-2025', productName: '2025新款无线充 (ERP)', defaultStock: 500, defaultSales: 35 },
    { sku: 'LX-ACC-007', productName: '磁吸手机支架 Pro', defaultStock: 120, defaultSales: 8 }
];

export const updateMockErpItem = (sku: string, field: 'stock' | 'sales', value: number) => {
    const db = getMockDb();
    const cleanSku = sku.trim(); 
    if (!db[cleanSku]) {
        db[cleanSku] = { stock: 0, sales: 0 };
    }
    db[cleanSku][field] = value;
    saveMockDb(db);
};

// NEW: Bulk Import Real Data with Normalization
export const bulkImportRealData = (data: { sku: string; qty: number }[]) => {
    const db = getMockDb();
    let count = 0;
    data.forEach(item => {
        const cleanSku = item.sku.trim();
        if (!db[cleanSku]) db[cleanSku] = { stock: 0, sales: 0 };
        db[cleanSku].stock = item.qty;
        if (db[cleanSku].sales === undefined) db[cleanSku].sales = 0;
        count++;
    });
    saveMockDb(db);
    return count;
};

// Helper to get data and optionally APPLY JITTER (simulate live changes)
const getAndJitterMockData = (sku: string, productName: string, baseQty: number, baseSales: number, applyJitter: boolean) => {
    const db = getMockDb();
    const cleanSku = sku.trim();
    
    // Initialize if missing
    if (!db[cleanSku]) {
        db[cleanSku] = {
            stock: Math.max(0, baseQty),
            sales: parseFloat(baseSales.toFixed(1))
        };
    }

    // Apply Jitter (Simulate sales reducing stock, or inbound increasing it)
    if (applyJitter) {
        const stockChange = Math.floor(Math.random() * 5) - 2; // -2 to +2 variation
        let newStock = db[cleanSku].stock + stockChange;
        if (newStock < 0) newStock = 0;
        
        // Small chance of restocking event
        if (Math.random() > 0.95) newStock += 50;

        db[cleanSku].stock = newStock;
        
        // Sales fluctuation
        const salesChange = (Math.random() - 0.5) * 2; // +/- 1
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
        // We got HTML or Text instead of JSON (likely 404 or 500 from Vercel)
        const text = await response.text();
        console.error("Proxy returned non-JSON:", text);
        throw new Error(`代理服务器响应格式错误(404/500)。请检查 URL 是否正确 (应以 /api/proxy 结尾)。`);
    }

    if (!response.ok) {
        throw new Error(`代理服务器报错: ${response.statusText}`);
    }

    return await response.json();
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
          // FIX: Use Query Params instead of path to avoid Vercel 404s without rewrites
          // Ensure no double slash, and append query param
          const baseUrl = proxyUrl.replace(/\/$/, '');
          const endpoint = `${baseUrl}?endpoint=inventory`; 
          
          return await safeJsonFetch(endpoint, { appId, accessToken, skus: localRecords.map(r => r.sku) });
      } catch (e) {
          console.warn("Real API call failed.", e);
          throw new Error(`${e instanceof Error ? e.message : '未知错误'}`);
      }
  }

  // 2. Offline / Simulation Mode
  await new Promise(resolve => setTimeout(resolve, 600)); 
  
  const results: LingxingInventoryItem[] = [];

  // A. Process Local Records (Matched)
  localRecords.forEach(record => {
      // Simulate live change (jitter) so user sees updates
      const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
      results.push({
          sku: record.sku,
          productName: record.productName,
          fbaStock: data.stock, 
          localStock: 0,
          onWayStock: 0
      });
  });

  // B. Inject "ERP Only" Items (Discovery)
  MOCK_ERP_EXTRA_ITEMS.forEach(extra => {
      // Only add if not already matched by a local record (case-insensitive check)
      const exists = localRecords.some(r => r.sku.toLowerCase() === extra.sku.toLowerCase());
      if (!exists) {
          // Don't apply jitter heavily to these static ones, or do it gently
          const data = getAndJitterMockData(extra.sku, extra.productName, extra.defaultStock, extra.defaultSales, false);
          results.push({
              sku: extra.sku,
              productName: extra.productName,
              fbaStock: data.stock,
              localStock: 0,
              onWayStock: 0
          });
      }
  });

  return results;
};

export const fetchLingxingSales = async (
    appId: string, 
    accessToken: string, 
    localRecords: ReplenishmentRecord[],
    days: 7 | 14 | 30,
    proxyUrl?: string
  ): Promise<LingxingSalesItem[]> => {
    
    if (proxyUrl && proxyUrl.startsWith('http')) {
        try {
            // FIX: Use Query Params
            const baseUrl = proxyUrl.replace(/\/$/, '');
            const endpoint = `${baseUrl}?endpoint=sales`;
            
            return await safeJsonFetch(endpoint, { appId, accessToken, days, skus: localRecords.map(r => r.sku) });
        } catch (e) {
            throw new Error(`${e instanceof Error ? e.message : '网络错误'}`);
        }
    }
  
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const results: LingxingSalesItem[] = [];

    // Local
    localRecords.forEach(record => {
        const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
        results.push({ sku: record.sku, avgDailySales: data.sales });
    });

    // Extras
    MOCK_ERP_EXTRA_ITEMS.forEach(extra => {
        const exists = localRecords.some(r => r.sku.toLowerCase() === extra.sku.toLowerCase());
        if (!exists) {
            const data = getAndJitterMockData(extra.sku, extra.productName, extra.defaultStock, extra.defaultSales, false);
            results.push({ sku: extra.sku, avgDailySales: data.sales });
        }
    });

    return results;
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
        const erpItem = erpData.find(e => e.sku.trim() === local.sku.trim());
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
        const erpItem = erpData.find(e => e.sku.trim() === local.sku.trim());
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