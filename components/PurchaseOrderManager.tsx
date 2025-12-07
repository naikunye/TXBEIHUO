
import React, { useState } from 'react';
import { PurchaseOrder, POStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import { FileText, Truck, CheckCircle2, Clock, Plus, Trash2, ArrowRight, Package, Calendar, XCircle, ExternalLink, Ship, Plane, Edit, Save } from 'lucide-react';

interface PurchaseOrderManagerProps {
  orders: PurchaseOrder[];
  onUpdateOrder: (order: PurchaseOrder) => void;
  onDeleteOrder: (id: string) => void;
  onReceiveStock: (order: PurchaseOrder) => void;
}

export const PurchaseOrderManager: React.FC<PurchaseOrderManagerProps> = ({ 
  orders, 
  onUpdateOrder, 
  onDeleteOrder,
  onReceiveStock 
}) => {
  const [filter, setFilter] = useState<'All' | POStatus>('All');
  const [editingLogisticsId, setEditingLogisticsId] = useState<string | null>(null);
  
  // Temp state for editing logistics
  const [editForm, setEditForm] = useState<{
      trackingNumber: string;
      carrier: string;
      shippingMethod: 'Air' | 'Sea';
  }>({ trackingNumber: '', carrier: '', shippingMethod: 'Air' });

  const statusColors: Record<POStatus, string> = {
      'Draft': 'bg-gray-100 text-gray-600',
      'Ordered': 'bg-blue-100 text-blue-700',
      'Production': 'bg-yellow-100 text-yellow-700',
      'Shipped': 'bg-purple-100 text-purple-700',
      'Arrived': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700'
  };

  const statusLabels: Record<POStatus, string> = {
      'Draft': '草稿 (Draft)',
      'Ordered': '已下单 (Ordered)',
      'Production': '生产中 (Production)',
      'Shipped': '运输中 (Shipped)',
      'Arrived': '已入库 (Arrived)',
      'Cancelled': '已取消 (Cancelled)'
  };

  const filterOptions: (POStatus | 'All')[] = ['All', 'Draft', 'Ordered', 'Production', 'Shipped', 'Arrived', 'Cancelled'];

  const filterLabels: Record<POStatus | 'All', string> = {
      'All': '全部',
      'Draft': '草稿',
      'Ordered': '已下单',
      'Production': '生产中',
      'Shipped': '运输中',
      'Arrived': '已入库',
      'Cancelled': '已取消'
  };

  const filteredOrders = orders.filter(o => filter === 'All' || o.status === filter);

  // Status transition logic
  const handleNextStatus = (order: PurchaseOrder) => {
      const flow: POStatus[] = ['Draft', 'Ordered', 'Production', 'Shipped', 'Arrived'];
      const currentIndex = flow.indexOf(order.status);
      
      if (currentIndex !== -1 && currentIndex < flow.length - 1) {
          const nextStatus = flow[currentIndex + 1];
          // If moving to Arrived, trigger stock receive
          if (nextStatus === 'Arrived') {
              if(window.confirm(`确认收货？\n\n这将自动增加 "${order.productName}" 的库存 ${order.quantity} 件。`)) {
                  onReceiveStock({ ...order, status: 'Arrived' });
              }
          } else {
              onUpdateOrder({ ...order, status: nextStatus });
          }
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Only stop bubbling, default action is fine for button
      if(window.confirm('确定要删除此采购单吗？(仅删除记录，不影响库存)')) {
          onDeleteOrder(id);
      }
  };

  const startEditLogistics = (order: PurchaseOrder) => {
      setEditingLogisticsId(order.id);
      setEditForm({
          trackingNumber: order.trackingNumber || '',
          carrier: order.carrier || '',
          shippingMethod: order.shippingMethod || 'Air'
      });
  };

  const saveLogistics = (order: PurchaseOrder) => {
      onUpdateOrder({
          ...order,
          trackingNumber: editForm.trackingNumber,
          carrier: editForm.carrier,
          shippingMethod: editForm.shippingMethod
      });
      setEditingLogisticsId(null);
  };

  const getTrackingLink = (number: string, carrier: string) => {
      if (!number) return '#';
      if (carrier.toLowerCase().includes('ups')) {
          return `https://www.ups.com/track?tracknum=${number}`;
      }
      return `https://t.17track.net/zh-cn#nums=${number}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
           <div>
               <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                   <FileText className="text-orange-500" /> 采购全流程管理
               </h2>
               <p className="text-sm text-gray-500 mt-1">跟踪从下单到入库的全链路状态。</p>
           </div>
           
           <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 overflow-x-auto max-w-full">
               {filterOptions.map(s => (
                   <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${filter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                   >
                       {filterLabels[s]}
                   </button>
               ))}
           </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
           {filteredOrders.length === 0 ? (
               <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-200 border-dashed">
                   <Package size={48} className="mx-auto mb-4 opacity-20" />
                   <p>暂无符合条件的采购单</p>
               </div>
           ) : (
               filteredOrders.map(order => (
                   <div key={order.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                       {/* Status Bar Indicator */}
                       <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColors[order.status].split(' ')[0]}`}></div>
                       
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pl-3">
                           {/* Info Section */}
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-3 mb-1">
                                   <span className="font-mono font-bold text-gray-800 text-lg">{order.poNumber}</span>
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColors[order.status]}`}>
                                       {statusLabels[order.status]}
                                   </span>
                               </div>
                               <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                   <span className="flex items-center gap-1"><Calendar size={14}/> {order.date}</span>
                                   <span className="flex items-center gap-1 font-medium text-gray-700 bg-gray-50 px-2 rounded truncate max-w-[200px]" title={order.productName}><Package size={14}/> {order.productName}</span>
                                   <span className="font-mono text-gray-400 bg-gray-50 px-1.5 rounded">{order.sku}</span>
                               </div>
                           </div>

                           {/* Data Section */}
                           <div className="flex items-center gap-8 md:px-8 border-l border-gray-100 md:border-l-0 md:border-r md:border-gray-100 h-full">
                               <div className="text-right">
                                   <div className="text-[10px] text-gray-400 uppercase font-bold">数量</div>
                                   <div className="font-bold text-lg text-gray-800">{order.quantity}</div>
                               </div>
                               <div className="text-right">
                                   <div className="text-[10px] text-gray-400 uppercase font-bold">总金额</div>
                                   <div className="font-bold text-lg text-gray-800">{formatCurrency(order.totalAmountCNY, 'CNY')}</div>
                               </div>
                           </div>

                           {/* Actions Section - Z-INDEX INCREASED */}
                           <div className="flex items-center gap-2 z-50 relative pointer-events-auto">
                               {order.status === 'Arrived' ? (
                                   <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-4 py-2 rounded-lg text-xs font-bold border border-green-100 select-none">
                                       <CheckCircle2 size={16} />
                                       <span>已入库完成</span>
                                   </div>
                               ) : order.status === 'Cancelled' ? (
                                   <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-xs font-bold border border-red-100 select-none">
                                       <XCircle size={16} />
                                       <span>订单已取消</span>
                                   </div>
                               ) : (
                                   <button 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          handleNextStatus(order);
                                      }}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold shadow-md shadow-slate-200 cursor-pointer"
                                   >
                                       {order.status === 'Draft' ? '确认下单' : 
                                        order.status === 'Ordered' ? '开始生产' :
                                        order.status === 'Production' ? '发货' : '确认收货'} 
                                       <ArrowRight size={14} className="pointer-events-none" />
                                   </button>
                               )}
                               
                               <button 
                                  onClick={(e) => handleDeleteClick(e, order.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="删除订单"
                               >
                                   <Trash2 size={16} className="pointer-events-none" />
                               </button>
                           </div>
                       </div>
                       
                       {/* Logistics Tracking Section - Only visible for active orders past 'Ordered' */}
                       {['Shipped', 'Arrived', 'Production'].includes(order.status) && (
                           <div className="mt-4 pt-4 border-t border-gray-100 pl-3">
                               {editingLogisticsId === order.id ? (
                                   <div className="flex items-center gap-3 animate-fade-in bg-gray-50 p-3 rounded-lg">
                                       <select 
                                            value={editForm.shippingMethod}
                                            onChange={(e) => setEditForm(prev => ({...prev, shippingMethod: e.target.value as any}))}
                                            className="text-xs p-2 rounded border border-gray-300"
                                       >
                                           <option value="Air">空运 (Air)</option>
                                           <option value="Sea">海运 (Sea)</option>
                                       </select>
                                       <input 
                                            type="text" 
                                            placeholder="承运商 (如: UPS, Matson)" 
                                            value={editForm.carrier}
                                            onChange={(e) => setEditForm(prev => ({...prev, carrier: e.target.value}))}
                                            className="text-xs p-2 rounded border border-gray-300 w-32"
                                       />
                                       <input 
                                            type="text" 
                                            placeholder="物流单号 (Tracking No.)" 
                                            value={editForm.trackingNumber}
                                            onChange={(e) => setEditForm(prev => ({...prev, trackingNumber: e.target.value}))}
                                            className="text-xs p-2 rounded border border-gray-300 flex-1 font-mono"
                                       />
                                       <button onClick={() => saveLogistics(order)} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Save size={14}/></button>
                                       <button onClick={() => setEditingLogisticsId(null)} className="p-2 text-gray-500 hover:text-gray-700"><XCircle size={14}/></button>
                                   </div>
                               ) : (
                                   <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                           <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded ${order.shippingMethod === 'Air' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                               {order.shippingMethod === 'Air' ? <Plane size={12}/> : <Ship size={12}/>}
                                               {order.carrier || (order.shippingMethod === 'Air' ? '空运' : '海运')}
                                           </div>
                                           
                                           {order.trackingNumber ? (
                                               <div className="flex items-center gap-2">
                                                   <span className="text-xs font-mono text-gray-600 select-all">{order.trackingNumber}</span>
                                                   <a 
                                                       href={getTrackingLink(order.trackingNumber, order.carrier || '')}
                                                       target="_blank"
                                                       rel="noreferrer"
                                                       className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded-full border border-blue-100"
                                                   >
                                                       <Truck size={10}/> 实时追踪
                                                       <ExternalLink size={8} />
                                                   </a>
                                               </div>
                                           ) : (
                                               <span className="text-xs text-gray-400 italic">暂无物流单号</span>
                                           )}
                                       </div>
                                       <button 
                                           onClick={() => startEditLogistics(order)}
                                           className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                       >
                                           <Edit size={12} /> {order.trackingNumber ? '修改物流' : '添加物流信息'}
                                       </button>
                                   </div>
                               )}
                           </div>
                       )}
                       
                       {/* Progress Bar Visual */}
                       {order.status !== 'Cancelled' && (
                           <div className="mt-4 pl-3 flex items-center gap-1">
                               {['Draft', 'Ordered', 'Production', 'Shipped', 'Arrived'].map((step, idx) => {
                                   const statusList = ['Draft', 'Ordered', 'Production', 'Shipped', 'Arrived'];
                                   const currentIdx = statusList.indexOf(order.status);
                                   const isCompleted = idx <= currentIdx;
                                   const isLast = idx === statusList.length - 1;
                                   
                                   return (
                                       <div key={step} className="flex-1 flex flex-col gap-1 group">
                                           <div className={`h-1.5 rounded-full overflow-hidden bg-gray-100`}>
                                               <div className={`h-full transition-all duration-500 ease-out ${isCompleted ? (isLast ? 'bg-green-500' : 'bg-blue-500') : 'bg-transparent w-0'}`}></div>
                                           </div>
                                           <div className={`text-[10px] text-center transition-colors ${isCompleted ? 'text-gray-600 font-medium' : 'text-gray-300'}`}>
                                               {filterLabels[step as POStatus]}
                                           </div>
                                       </div>
                                   )
                               })}
                           </div>
                       )}
                   </div>
               ))
           )}
       </div>
    </div>
  );
};
