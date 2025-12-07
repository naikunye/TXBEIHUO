
import React, { useState } from 'react';
import { ExternalOrder, ReplenishmentRecord, InventoryLog } from '../types';
import { ShoppingBag, RefreshCw, CheckCircle, AlertCircle, Link as LinkIcon, Download, Globe, Clock, PackageCheck } from 'lucide-react';

interface OrderSyncCenterProps {
  records: ReplenishmentRecord[];
  onAddLogs: (logs: InventoryLog[]) => void;
}

export const OrderSyncCenter: React.FC<OrderSyncCenterProps> = ({ records, onAddLogs }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [orders, setOrders] = useState<ExternalOrder[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Mock API Fetch
  const handleSyncOrders = async () => {
      setIsConnecting(true);
      
      // Simulate API Latency
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate Mock Orders
      const mockOrders: ExternalOrder[] = [];
      const platforms = ['TikTok', 'Amazon', 'Shopify'] as const;
      
      // Try to find a real SKU to use
      const targetSku = records.length > 0 ? records[0].sku : 'DEMO-SKU-001';
      const targetName = records.length > 0 ? records[0].productName : 'Demo Product';

      for (let i = 0; i < 5; i++) {
          mockOrders.push({
              id: `ORD-${Date.now()}-${i}`,
              platformOrderId: `${Math.floor(Math.random()*1000000)}`,
              platform: platforms[i % 3],
              orderDate: new Date().toISOString(),
              orderStatus: 'Unfulfilled',
              customerName: `Customer ${i+1}`,
              items: [
                  { sku: targetSku, productName: targetName, quantity: Math.floor(Math.random() * 3) + 1, price: 29.99 }
              ],
              totalAmount: 50 + Math.random() * 50,
              currency: 'USD',
              shippingAddress: '123 Main St, Los Angeles, CA'
          });
      }

      setOrders(mockOrders);
      setLastSync(new Date());
      setIsConnecting(false);
  };

  const handleFulfillOrder = (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // 1. Generate Inventory Logs (Deduct from US_West by default)
      const logs: InventoryLog[] = order.items.map(item => ({
          id: `LOG-${Date.now()}-${item.sku}`,
          date: new Date().toISOString(),
          sku: item.sku,
          warehouse: 'US_West', // Default fulfillment center
          type: 'Sales',
          quantityChange: -item.quantity,
          referenceId: order.platformOrderId,
          note: `Auto-fulfilled from ${order.platform}`
      }));

      onAddLogs(logs);

      // 2. Update Local Order State
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: 'Fulfilled' } : o));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header / Config Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-xl text-white shadow-lg shadow-purple-200">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">全渠道订单同步 (OMS)</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><Globe size={12}/> Connected: TikTok, Amazon</span>
                            {lastSync && <span className="flex items-center gap-1 text-emerald-600"><Clock size={12}/> Updated: {lastSync.toLocaleTimeString()}</span>}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={handleSyncOrders}
                    disabled={isConnecting}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-70"
                >
                    {isConnecting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                    {isConnecting ? '正在拉取...' : '同步新订单'}
                </button>
            </div>
        </div>

        {/* Order List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-700 text-sm">待处理订单 ({orders.filter(o => o.orderStatus === 'Unfulfilled').length})</h4>
                <div className="flex gap-2">
                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">TikTok Shop</span>
                    <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">Amazon SC</span>
                </div>
            </div>
            
            <div className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <ShoppingBag size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">暂无新订单</p>
                        <p className="text-xs mt-1">点击右上角“同步”按钮拉取</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-2 rounded-lg ${
                                    order.platform === 'TikTok' ? 'bg-black text-white' : 
                                    order.platform === 'Amazon' ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'
                                }`}>
                                    <Globe size={16} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800 text-sm">#{order.platformOrderId}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                            order.orderStatus === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>{order.orderStatus}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5">
                                        <span className="font-medium text-gray-700">{order.customerName}</span>
                                        <span>{order.shippingAddress}</span>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs bg-gray-100 w-fit px-2 py-1 rounded">
                                                <span className="font-mono text-gray-600">{item.sku}</span>
                                                <span className="text-gray-400">x</span>
                                                <span className="font-bold text-gray-800">{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <span className="font-bold text-gray-800">${order.totalAmount.toFixed(2)}</span>
                                {order.orderStatus === 'Unfulfilled' ? (
                                    <button 
                                        onClick={() => handleFulfillOrder(order.id)}
                                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm"
                                    >
                                        <PackageCheck size={14} /> 发货扣库存
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                        <CheckCircle size={14} /> 已完成
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

    </div>
  );
};
