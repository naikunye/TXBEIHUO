
import React, { useState, useMemo } from 'react';
import { ExternalOrder, ReplenishmentRecord, InventoryLog } from '../types';
import { ShoppingBag, RefreshCw, CheckCircle, ClipboardPaste, Download, Globe, PackageCheck, Plus, FileText, ArrowRight, AlertTriangle, Search, X } from 'lucide-react';

interface OrderSyncCenterProps {
  records: ReplenishmentRecord[];
  onAddLogs: (logs: InventoryLog[]) => void;
}

// Helper to parse pasted text
const parseOrderText = (text: string, records: ReplenishmentRecord[]) => {
    const lines = text.trim().split('\n');
    const results: any[] = [];
    
    lines.forEach(line => {
        // Remove commas, treat tabs/spaces as separators
        const parts = line.replace(/,/g, '').trim().split(/[\t\s]+/);
        // We expect at least 2 parts: SKU and Qty, or OrderID SKU Qty
        if (parts.length >= 2) {
            let orderId = `ORD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            let sku = '';
            let qty = 1;

            // Heuristic Parsing
            // If 3 parts: Assume OrderID | SKU | Qty
            if (parts.length >= 3) {
                orderId = parts[0];
                sku = parts[1];
                qty = parseInt(parts[2]) || 1;
            } else {
                // If 2 parts: Assume SKU | Qty (Auto gen ID)
                sku = parts[0];
                qty = parseInt(parts[1]) || 1;
            }

            // Match with local record to get price/name
            const match = records.find(r => r.sku.toLowerCase() === sku.toLowerCase());
            
            if (match) {
                results.push({
                    valid: true,
                    orderId,
                    sku: match.sku, // Use canonical SKU
                    productName: match.productName,
                    price: match.salesPriceUSD,
                    quantity: qty,
                    total: match.salesPriceUSD * qty,
                    match
                });
            } else {
                results.push({
                    valid: false,
                    raw: line,
                    reason: 'SKU 不存在'
                });
            }
        }
    });
    return results;
};

export const OrderSyncCenter: React.FC<OrderSyncCenterProps> = ({ records, onAddLogs }) => {
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  const [platform, setPlatform] = useState<'TikTok' | 'Amazon' | 'Shopify' | 'Manual'>('TikTok');

  // --- Handlers ---

  const handleParse = () => {
      const results = parseOrderText(pasteContent, records);
      setParsedOrders(results);
  };

  const handleConfirmImport = () => {
      const validItems = parsedOrders.filter(i => i.valid);
      if (validItems.length === 0) return;

      const newOrders: ExternalOrder[] = validItems.map(item => ({
          id: `EXT-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
          platformOrderId: item.orderId,
          platform: platform,
          orderDate: new Date().toISOString(),
          orderStatus: 'Unfulfilled',
          customerName: 'Imported User',
          items: [{
              sku: item.sku,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price
          }],
          totalAmount: item.total,
          currency: 'USD',
          shippingAddress: 'N/A'
      }));

      setOrders(prev => [...newOrders, ...prev]);
      setIsImportModalOpen(false);
      setPasteContent('');
      setParsedOrders([]);
  };

  const handleFulfillOrder = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // 1. Generate Inventory Logs (Deduct from US_West by default or logic)
      const logs: InventoryLog[] = order.items.map(item => ({
          id: `LOG-${Date.now()}-${item.sku}`,
          date: new Date().toISOString(),
          sku: item.sku,
          warehouse: 'US_West', // Assuming orders are fulfilled from US warehouse
          type: 'Sales',
          quantityChange: -item.quantity, // Deduct stock
          referenceId: order.platformOrderId,
          note: `订单发货: ${order.platform}`
      }));

      onAddLogs(logs);

      // 2. Update Local Order State
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: 'Fulfilled' } : o));
  };

  const handleDeleteOrder = (id: string) => {
      setOrders(prev => prev.filter(o => o.id !== id));
  };

  // Stats
  const pendingCount = orders.filter(o => o.orderStatus === 'Unfulfilled').length;
  const fulfilledCount = orders.filter(o => o.orderStatus === 'Fulfilled').length;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header / Config Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-xl text-white shadow-lg shadow-slate-200">
                        <ClipboardPaste size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">订单管理与导入 (OMS)</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            外部平台订单导入中台。导入订单后点击“发货”可自动扣减库存。
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
                    <Plus size={18} />
                    手动/批量导入订单
                </button>
            </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-orange-400 uppercase">待处理订单</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <AlertTriangle className="text-orange-300" size={24} />
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-green-400 uppercase">已发货/扣库存</p>
                    <p className="text-2xl font-bold text-green-600">{fulfilledCount}</p>
                </div>
                <PackageCheck className="text-green-300" size={24} />
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-blue-400 uppercase">累计订单数</p>
                    <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                </div>
                <FileText className="text-blue-300" size={24} />
            </div>
        </div>

        {/* Order List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <ShoppingBag size={16}/> 订单列表
                </h4>
            </div>
            
            <div className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <ClipboardPaste size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">暂无订单数据</p>
                        <p className="text-xs mt-1">请点击右上角按钮，从 Excel 或后台复制数据导入</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                    order.platform === 'TikTok' ? 'bg-black text-white' : 
                                    order.platform === 'Amazon' ? 'bg-orange-500 text-white' : 
                                    order.platform === 'Manual' ? 'bg-gray-500 text-white' : 'bg-green-600 text-white'
                                }`}>
                                    <Globe size={16} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800 text-sm">#{order.platformOrderId}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                            order.orderStatus === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>{order.orderStatus === 'Fulfilled' ? '已发货' : '待处理'}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</span>
                                    </div>
                                    
                                    <div className="mt-2 space-y-1">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs bg-gray-100 w-fit px-2 py-1 rounded">
                                                <span className="font-bold text-gray-700">{item.productName}</span>
                                                <span className="font-mono text-gray-500">{item.sku}</span>
                                                <span className="text-gray-400">x</span>
                                                <span className="font-bold text-gray-800">{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <span className="font-bold text-gray-800">${order.totalAmount.toFixed(2)}</span>
                                <div className="flex gap-2">
                                    {order.orderStatus === 'Unfulfilled' ? (
                                        <button 
                                            onClick={() => handleFulfillOrder(order.id)}
                                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm"
                                        >
                                            <PackageCheck size={14} /> 发货扣库存
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg">
                                            <CheckCircle size={14} /> 已扣库存
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Import Modal */}
        {isImportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <ClipboardPaste size={20}/> 批量导入订单
                        </h3>
                        <button onClick={() => setIsImportModalOpen(false)}><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">1. 选择来源平台</label>
                            <div className="flex gap-2">
                                {['TikTok', 'Amazon', 'Shopify', 'Manual'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPlatform(p as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${platform === p ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                2. 粘贴数据 <span className="text-xs font-normal text-gray-400 ml-2">(支持 Excel 列复制)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                                格式 A: <code>订单号 SKU 数量</code> (推荐)<br/>
                                格式 B: <code>SKU 数量</code> (自动生成单号)
                            </p>
                            <textarea 
                                className="w-full h-32 p-3 border border-gray-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder={`ORD-1001  MA-001  5\nORD-1002  CP-Q1M  10`}
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                            ></textarea>
                            <button 
                                onClick={handleParse}
                                className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-xs transition-colors"
                            >
                                解析数据
                            </button>
                        </div>

                        {parsedOrders.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">3. 预览确认</label>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="p-2">状态</th>
                                                <th className="p-2">订单号</th>
                                                <th className="p-2">SKU</th>
                                                <th className="p-2">产品</th>
                                                <th className="p-2 text-right">数量</th>
                                                <th className="p-2 text-right">金额</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {parsedOrders.map((item, idx) => (
                                                <tr key={idx} className={!item.valid ? 'bg-red-50' : ''}>
                                                    <td className="p-2">
                                                        {item.valid ? <CheckCircle size={14} className="text-green-500"/> : <AlertTriangle size={14} className="text-red-500"/>}
                                                    </td>
                                                    <td className="p-2 font-mono">{item.valid ? item.orderId : '-'}</td>
                                                    <td className="p-2 font-mono">{item.valid ? item.sku : item.raw}</td>
                                                    <td className="p-2 truncate max-w-[100px]">{item.valid ? item.productName : item.reason}</td>
                                                    <td className="p-2 text-right font-bold">{item.valid ? item.quantity : '-'}</td>
                                                    <td className="p-2 text-right">{item.valid ? `$${item.total.toFixed(2)}` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
                        <button 
                            onClick={handleConfirmImport}
                            disabled={parsedOrders.filter(i => i.valid).length === 0}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            确认导入 ({parsedOrders.filter(i => i.valid).length}) 条有效订单
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
