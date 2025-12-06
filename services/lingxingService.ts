
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

// --- STABLE MOCK DATABASE ---
// This ensures that "ERP" data remains consistent during the session.
// Once you sync, the numbers will match and stay matched until you reload.
const MOCK_ERP_DB: Record<string, { stock: number, sales: number }> = {};

const getOrGenerateMockData = (record: ReplenishmentRecord) => {
    if (!MOCK_ERP_DB[record.sku]) {
        // Generate once and store it
        const hasDrift = Math.random() > 0.3; // 70% chance of being different initially
        const randomDiff = hasDrift ? Math.floor(Math.random() * 20) - 5 : 0;
        
        // Ensure strictly positive
        const mockStock = Math.max(0, record.quantity + (randomDiff === 0 && hasDrift ? 5 : randomDiff));
        
        // Mock Sales
        const volatility = 0.2;
        const mockSales = Math.max(0, record.dailySales + (record.dailySales * volatility * (Math.random() - 0.5)));

        MOCK_ERP_DB[record.sku] = {
            stock: mockStock,
            sales: parseFloat(mockSales.toFixed(1))
        };
    }
    return MOCK_ERP_DB[record.sku];
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
  
  if (!appId || !accessToken) {
      throw new Error("请先配置领星 App ID 和 Access Token");
  }

  // 1. Real API Mode (If Proxy URL is provided)
  if (proxyUrl && proxyUrl.startsWith('http')) {
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
  await new Promise(resolve => setTimeout(resolve, 800)); // Faster simulation
  
  return localRecords.map(record => {
      const mockData = getOrGenerateMockData(record);
      
      return {
          sku: record.sku,
          productName: record.productName,
          fbaStock: mockData.stock, // Returns the consistent mock value
          localStock: 0,
          onWayStock: Math.floor(Math.random() * 50)
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
    
    if (!appId || !accessToken) throw new Error("请先配置 API 凭证");
  
    // 1. Real API Mode
    if (proxyUrl && proxyUrl.startsWith('http')) {
        // Implementation for real proxy...
        throw new Error("暂未检测到有效的后端代理服务");
    }
  
    // 2. Mock Mode
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
            // Only add to diff list if there is an ACTUAL difference
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
