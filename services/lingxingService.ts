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
        const stockChange = Math.floor(Math.random() * 5) - 2; 
        let newStock = db[cleanSku].stock + stockChange;
        if (newStock < 0) newStock = 0;
        if (Math.random() > 0.95) newStock += 50;
        db[cleanSku].stock = newStock;
        const salesChange = (Math.random() - 0.5) * 2; 
        let newSales = db[cleanSku].sales + salesChange;
        if (newSales < 0) newSales = 0;
        db[cleanSku].sales = parseFloat(newSales.toFixed(1));
    }
    saveMockDb(db);
    return db[cleanSku];
};

// --- SMART FETCH LOGIC ---
// Automatically tries multiple paths if the base one fails (404 or HTML response)
const smartFetch = async (userProvidedUrl: string, endpointType: 'inventory' | 'sales', payload: any) => {
    const cleanBase = userProvidedUrl.trim().replace(/\/$/, '');
    
    // Priority of paths to try
    // 1. As-is (User might have pasted full path)
    // 2. /api/proxy (Standard Vercel)
    // 3. /api (Alternate)
    const candidates = [
        cleanBase, 
        `${cleanBase}/api/proxy`,
        `${cleanBase}/api`
    ];
    
    // Remove duplicates
    const uniqueCandidates = [...new Set(candidates)];
    
    let lastError: Error | null = null;

    for (const baseUrl of uniqueCandidates) {
        const fullUrl = `${baseUrl}?endpoint=${endpointType}`;
        console.log(`[SmartFetch] Trying: ${fullUrl}`);

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // If 404, we assume wrong path and continue to next candidate
            if (response.status === 404) {
                console.warn(`[SmartFetch] 404 at ${fullUrl}, trying next...`);
                continue; 
            }

            const contentType = response.headers.get("content-type");
            
            // If 200 OK but HTML (Vercel landing page), it's also a wrong path
            if (response.ok && contentType && !contentType.includes("application/json")) {
                console.warn(`[SmartFetch] Got HTML at ${fullUrl}, trying next...`);
                continue;
            }

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Server Error ${response.status}: ${txt}`);
            }

            // Success!
            return await response.json();

        } catch (e: any) {
            console.warn(`[SmartFetch] Failed at ${fullUrl}`, e);
            lastError = e;
            // Network errors (e.g. DNS) -> Try next
            // But if we exhausted list, we throw
        }
    }

    throw lastError || new Error(`连接失败 (404/500)。请检查 URL 是否正确。`);
};

export const fetchLingxingInventory = async (
  appId: string, 
  accessToken: string, 
  localRecords: ReplenishmentRecord[],
  proxyUrl?: string
): Promise<LingxingInventoryItem[]> => {
  
  if (proxyUrl && proxyUrl.startsWith('http')) {
      if (!appId || !accessToken) throw new Error("真实连接需要 App ID 和 Token");
      
      // Use Smart Fetch
      return await smartFetch(proxyUrl, 'inventory', { 
          appId, 
          accessToken, 
          skus: localRecords.map(r => r.sku) 
      });
  }

  // Offline / Simulation Mode
  await new Promise(resolve => setTimeout(resolve, 600)); 
  const results: LingxingInventoryItem[] = [];
  localRecords.forEach(record => {
      const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
      results.push({
          sku: record.sku,
          productName: record.productName,
          fbaStock: data.stock, 
          localStock: 0,
          onWayStock: 0
      });
  });
  MOCK_ERP_EXTRA_ITEMS.forEach(extra => {
      const exists = localRecords.some(r => r.sku.toLowerCase() === extra.sku.toLowerCase());
      if (!exists) {
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
        return await smartFetch(proxyUrl, 'sales', { 
            appId, 
            accessToken, 
            days, 
            skus: localRecords.map(r => r.sku) 
        });
    }
  
    await new Promise(resolve => setTimeout(resolve, 300));
    const results: LingxingSalesItem[] = [];
    localRecords.forEach(record => {
        const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
        results.push({ sku: record.sku, avgDailySales: data.sales });
    });
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
    const diffs: { recordId: string; sku: string; productName: string; localVal: number; erpVal: number; diff: number }[] = [];
    localRecords.forEach(local => {
        const erpItem = erpData.find(e => e.sku.trim() === local.sku.trim());
        if (erpItem) {
            const totalErp = erpItem.fbaStock;
            if (local.quantity !== totalErp) {
                diffs.push({
                    recordId: local.id, sku: local.sku, productName: local.productName,
                    localVal: local.quantity, erpVal: totalErp, diff: totalErp - local.quantity
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
    const diffs: { recordId: string; sku: string; productName: string; localVal: number; erpVal: number; diff: number }[] = [];
    localRecords.forEach(local => {
        const erpItem = erpData.find(e => e.sku.trim() === local.sku.trim());
        if (erpItem) {
            if (Math.abs(local.dailySales - erpItem.avgDailySales) > 0.1) {
                diffs.push({
                    recordId: local.id, sku: local.sku, productName: local.productName,
                    localVal: local.dailySales, erpVal: erpItem.avgDailySales, diff: erpItem.avgDailySales - local.dailySales
                });
            }
        }
    });
    return diffs;
};