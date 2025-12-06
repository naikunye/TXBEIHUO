import { ReplenishmentRecord } from "../types";

export interface MiaoshouInventoryItem {
  product_sku: string;
  cn_name: string;
  stock_quantity: number; 
  shipping_quantity: number; 
}

export interface MiaoshouSalesItem {
    product_sku: string;
    avg_sales_7d: number;
    avg_sales_15d: number;
    avg_sales_30d: number;
}

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
        const stockChange = Math.floor(Math.random() * 7) - 3; 
        let newStock = db[cleanSku].stock + stockChange;
        if (newStock < 0) newStock = 0;
        if (Math.random() > 0.9) newStock += 20; 
        db[cleanSku].stock = newStock;
        const salesChange = (Math.random() - 0.5) * 1.5;
        let newSales = db[cleanSku].sales + salesChange;
        if (newSales < 0) newSales = 0;
        db[cleanSku].sales = parseFloat(newSales.toFixed(1));
    }
    saveMockDb(db);
    return db[cleanSku];
};

// --- SMART FETCH LOGIC ---
const smartFetch = async (userProvidedUrl: string, endpointType: 'inventory' | 'sales', payload: any) => {
    const cleanBase = userProvidedUrl.trim().replace(/\/$/, '');
    const candidates = [
        cleanBase, 
        `${cleanBase}/api/proxy`,
        `${cleanBase}/api`
    ];
    
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

            if (response.status === 404) {
                console.warn(`[SmartFetch] 404 at ${fullUrl}, trying next...`);
                continue; 
            }

            const contentType = response.headers.get("content-type");
            if (response.ok && contentType && !contentType.includes("application/json")) {
                console.warn(`[SmartFetch] Got HTML at ${fullUrl}, trying next...`);
                continue;
            }

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Server Error ${response.status}: ${txt}`);
            }

            return await response.json();

        } catch (e: any) {
            console.warn(`[SmartFetch] Failed at ${fullUrl}`, e);
            lastError = e;
        }
    }

    throw lastError || new Error(`连接失败 (404/500)。请检查 URL 是否正确。`);
};

export const fetchMiaoshouInventory = async (
  appKey: string, 
  appSecret: string, 
  localRecords: ReplenishmentRecord[],
  proxyUrl?: string
): Promise<MiaoshouInventoryItem[]> => {
  
  if (proxyUrl && proxyUrl.startsWith('http')) {
      if (!appKey || !appSecret) throw new Error("真实连接需要 App Key 和 Secret");
      // Smart Fetch
      const data = await smartFetch(proxyUrl, 'inventory', { 
          appKey, 
          appSecret, 
          skus: localRecords.map(r => r.sku) 
      });
      return Array.isArray(data) ? data : [];
  }

  // Simulation Mode
  await new Promise(resolve => setTimeout(resolve, 600)); 
  const results: MiaoshouInventoryItem[] = [];
  localRecords.forEach(record => {
      const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
      results.push({
          product_sku: record.sku,
          cn_name: record.productName,
          stock_quantity: data.stock, 
          shipping_quantity: 0
      });
  });
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
        const data = await smartFetch(proxyUrl, 'sales', { 
            appKey, 
            appSecret, 
            days, 
            skus: localRecords.map(r => r.sku) 
        });
        return Array.isArray(data) ? data : [];
    }
  
    await new Promise(resolve => setTimeout(resolve, 600)); 
    const results: MiaoshouSalesItem[] = [];
    localRecords.forEach(record => {
        const data = getAndJitterMockData(record.sku, record.productName, record.quantity, record.dailySales, true);
        results.push({
            product_sku: record.sku,
            avg_sales_7d: data.sales,
            avg_sales_15d: data.sales,
            avg_sales_30d: data.sales
        });
    });
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