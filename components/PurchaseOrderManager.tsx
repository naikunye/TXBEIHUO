
import React, { useState, useMemo } from 'react';
import { PurchaseOrder, POStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  FileText, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ArrowRight, 
  Package, 
  Calendar, 
  XCircle, 
  ExternalLink, 
  Ship, 
  Plane, 
  Edit2, 
  Search,
  DollarSign,
  BoxSelect,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board'); // Default to Board for "Pro" feel
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState<Partial<PurchaseOrder>>({});

  // Receiving Modal State
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<number>(0);

  // --- Derived Data ---
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (activeTab === 'Active') {
      result = result.filter(o => !['Arrived', 'Cancelled'].includes(o.status));
    } else if (activeTab === 'Completed') {
      result = result.filter(o => ['Arrived', 'Cancelled'].includes(o.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.poNumber.toLowerCase().includes(q) || 
        o.productName.toLowerCase().includes(q) || 
        o.sku.toLowerCase().includes(q) ||
        (o.supplierName || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, activeTab, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const active = orders.filter(o => !['Arrived', 'Cancelled'].includes(o.status));
    const totalSpend = active.reduce((sum, o) => sum + o.totalAmountCNY, 0);
    const incomingUnits = active.reduce((sum, o) => sum + o.quantity, 0);
    return { count: active.length, totalSpend, incomingUnits };
  }, [orders]);

  // --- Handlers ---

  const handleNextStatus = (order: PurchaseOrder) => {
      const flow: POStatus[] = ['Draft', 'Ordered', 'Production', 'Shipped', 'PartiallyArrived', 'Arrived'];
      const currentIndex = flow.indexOf(order.status);
      
      // If current is Shipped or PartiallyArrived, next action is Receiving
      if (order.status === 'Shipped' || order.status === 'PartiallyArrived') {
          setReceivingOrderId(order.id);
          const remaining = order.quantity - (order.receivedQuantity || 0);
          setReceiveQty(remaining); // Default to remaining
      } else if (currentIndex !== -1 && currentIndex < flow.length - 1) {
          // Normal flow for Draft -> Ordered -> Production -> Shipped
          const nextStatus = flow[currentIndex + 1];
          onUpdateOrder({ ...order, status: nextStatus });
      }
  };

  const confirmReceive = () => {
      if (!receivingOrderId) return;
      const order = orders.find(o => o.id === receivingOrderId);
      if (!order) return;

      const currentReceived = order.receivedQuantity || 0;
      const newTotalReceived = currentReceived + receiveQty;
      
      // Determine new status
      let newStatus: POStatus = order.status;
      if (newTotalReceived >= order.quantity) {
          newStatus = 'Arrived';
      } else {
          newStatus = 'PartiallyArrived';
      }

      const shipmentDelta = { ...order, quantity: receiveQty, status: newStatus };
      onReceiveStock(shipmentDelta);

      onUpdateOrder({ 
          ...order, 
          receivedQuantity: newTotalReceived,
          status: newStatus 
      });

      setReceivingOrderId(null);
      setReceiveQty(0);
  };

  const handleStartEdit = (order: PurchaseOrder) => {
      if (['Arrived', 'Cancelled'].includes(order.status)) return;
      setEditingId(order.id);
      setEditForm({ ...order });
  };

  const handleSaveEdit = () => {
      if (editingId && editForm.id) {
          const newQty = editForm.quantity || 0;
          const newPrice = editForm.unitPriceCNY || 0;
          const newTotal = newQty * newPrice;
          
          onUpdateOrder({ 
              ...orders.find(o => o.id === editingId)!, 
              ...editForm,
              totalAmountCNY: newTotal 
          } as PurchaseOrder);
          
          setEditingId(null);
          setEditForm({});
      }
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setEditForm({});
  };

  // --- Constants ---
  const statusConfig: Record<POStatus, { label: string, color: string, bg: string, icon: any, border: string }> = {
      'Draft': { label: '草稿 (Draft)', color: 'text-gray-600', bg: 'bg-gray-50', icon: FileText, border: 'border-gray-200' },
      'Ordered': { label: '已下单 (Ordered)', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2, border: 'border-blue-200' },
      'Production': { label: '生产中 (Prod)', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, border: 'border-amber-200' },
      'Shipped': { label: '运输中 (Shipped)', color: 'text-purple-600', bg: 'bg-purple-50', icon: Truck, border: 'border-purple-200' },
      'PartiallyArrived': { label: '部分收货 (Partial)', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: BoxSelect, border: 'border-indigo-200' },
      'Arrived': { label: '已入库 (Done)', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2, border: 'border-emerald-200' },
      'Cancelled': { label: '已取消 (Void)', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, border: 'border-red-200' }
  };

  const kanbanColumns: POStatus[] = ['Draft', 'Ordered', 'Production', 'Shipped', 'Arrived'];

  const getTrackingLink = (number?: string, carrier?: string) => {
      if (!number) return '#';
      if ((carrier || '').toLowerCase().includes('ups')) return `https://www.ups.com/track?tracknum=${number}`;
      return `https://t.17track.net/zh-cn#nums=${number}`;
  };

  // --- Render Board Card ---
  const renderBoardCard = (order: PurchaseOrder) => {
      const StatusIcon = statusConfig[order.status].icon;
      const isReceiving = ['Shipped', 'PartiallyArrived'].includes(order.status);
      
      return (
          <div key={order.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{order.poNumber.split('-').pop()}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status !== 'Arrived' && (
                          <button onClick={() => handleNextStatus(order)} className="p-1 hover:bg-slate-100 rounded text-slate-600" title="推进流程">
                              <ArrowRight size={14} />
                          </button>
                      )}
                      <button onClick={() => onDeleteOrder(order.id)} className="p-1 hover:bg-red-50 rounded text-red-400">
                          <Trash2 size={14} />
                      </button>
                  </div>
              </div>
              
              <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package size={18} className="text-gray-400"/>
                  </div>
                  <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 text-sm truncate" title={order.productName}>{order.productName}</h4>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span>{order.quantity} pcs</span>
                          <span className="text-gray-300">|</span>
                          <span>¥{formatCurrency(order.totalAmountCNY, 'CNY').replace('¥','')}</span>
                      </div>
                  </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full ${statusConfig[order.status].bg.replace('bg-', 'bg-')} ${statusConfig[order.status].color.replace('text-', 'bg-')}`} 
                    style={{ width: '100%' }}
                  ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span className="truncate max-w-[80px]">{order.supplierName}</span>
                  {isReceiving && (
                      <span className="text-orange-500 font-bold bg-orange-50 px-1.5 rounded">
                          已收: {order.receivedQuantity || 0}
                      </span>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative h-full flex flex-col">
       
       {/* 1. Dashboard Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-blue-50 text-blue-600"><FileText size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 uppercase font-bold">进行中订单</p>
                   <p className="text-2xl font-bold text-gray-800">{stats.count}</p>
               </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-orange-50 text-orange-600"><DollarSign size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 uppercase font-bold">待付/在途金额</p>
                   <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalSpend, 'CNY')}</p>
               </div>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-green-50 text-green-600"><Package size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 uppercase font-bold">预计入库总数</p>
                   <p className="text-2xl font-bold text-gray-800">{stats.incomingUnits} <span className="text-sm font-normal text-gray-400">pcs</span></p>
               </div>
           </div>
       </div>

       {/* 2. Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-20 shrink-0">
           
           <div className="flex gap-2 items-center">
               <div className="flex bg-gray-100 p-1 rounded-lg">
                   <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}>
                       <LayoutGrid size={18} />
                   </button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}>
                       <ListIcon size={18} />
                   </button>
               </div>
               <div className="h-6 w-px bg-gray-200"></div>
               <div className="flex bg-gray-100 p-1 rounded-lg">
                   {(['All', 'Active', 'Completed'] as const).map(tab => (
                       <button
                           key={tab}
                           onClick={() => setActiveTab(tab)}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                       >
                           {tab === 'All' ? '全部' : tab === 'Active' ? '进行中' : '归档'}
                       </button>
                   ))}
               </div>
           </div>

           <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
               <input 
                   type="text" 
                   placeholder="搜索 PO..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
               />
           </div>
       </div>

       {/* 3. Content Area */}
       {viewMode === 'board' ? (
           <div className="flex-1 overflow-x-auto pb-4">
               <div className="flex gap-4 min-w-[1000px] h-full">
                   {kanbanColumns.map(col => {
                       const colOrders = filteredOrders.filter(o => {
                           if (col === 'Shipped') return o.status === 'Shipped' || o.status === 'PartiallyArrived';
                           return o.status === col;
                       });
                       const conf = statusConfig[col];
                       
                       return (
                           <div key={col} className="flex-1 min-w-[200px] flex flex-col h-full rounded-2xl bg-gray-50/50 border border-gray-200/60">
                               {/* Column Header */}
                               <div className={`p-3 border-b border-gray-100 rounded-t-2xl ${conf.bg} bg-opacity-30`}>
                                   <div className="flex justify-between items-center">
                                       <div className="flex items-center gap-2">
                                           <div className={`w-2 h-2 rounded-full ${conf.color.replace('text-', 'bg-')}`}></div>
                                           <span className={`text-xs font-bold ${conf.color}`}>{conf.label}</span>
                                       </div>
                                       <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-500 shadow-sm border border-gray-100">
                                           {colOrders.length}
                                       </span>
                                   </div>
                               </div>
                               
                               {/* Draggable Area (Simulated) */}
                               <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                   {colOrders.map(order => renderBoardCard(order))}
                                   {colOrders.length === 0 && (
                                       <div className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 text-xs">
                                           空
                                       </div>
                                   )}
                               </div>
                           </div>
                       )
                   })}
               </div>
           </div>
       ) : (
           /* LIST VIEW (Legacy) */
           <div className="space-y-4">
               {filteredOrders.map(order => {
                   const isEditing = editingId === order.id;
                   const StatusIcon = statusConfig[order.status].icon;
                   const isDone = ['Arrived', 'Cancelled'].includes(order.status);
                   const isReceiving = ['Shipped', 'PartiallyArrived'].includes(order.status);

                   return (
                       <div key={order.id} className={`bg-white rounded-xl border transition-all hover:shadow-md ${isDone ? 'border-gray-200 opacity-90' : 'border-gray-200 shadow-sm'}`}>
                           {/* ... (Keep existing List View Card Logic) ... */}
                           {/* Card Header */}
                           <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-50 gap-4">
                               <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded-lg ${statusConfig[order.status].bg}`}>
                                       <StatusIcon size={18} className={statusConfig[order.status].color} />
                                   </div>
                                   <div>
                                       <div className="flex items-center gap-2">
                                           <span className="font-mono font-bold text-gray-800 text-base">{order.poNumber}</span>
                                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusConfig[order.status].color.replace('text', 'border')} bg-white`}>
                                               {statusConfig[order.status].label}
                                           </span>
                                       </div>
                                       <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                           <span className="flex items-center gap-1"><Calendar size={12}/> {order.date}</span>
                                           <span className="flex items-center gap-1"><Package size={12}/> {order.supplierName || '未知供应商'}</span>
                                       </div>
                                   </div>
                               </div>

                               {/* Actions */}
                               {!isEditing && (
                                   <div className="flex items-center gap-2">
                                       {!isDone && (
                                           <>
                                            <button 
                                                onClick={() => handleStartEdit(order)} 
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                                title="编辑订单"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleNextStatus(order)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors shadow-sm ${isReceiving ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                            >
                                                {order.status === 'Draft' ? '确认下单' : order.status === 'Ordered' ? '开始生产' : order.status === 'Production' ? '发货' : '收货入库'}
                                                {isReceiving ? <BoxSelect size={12} /> : <ArrowRight size={12} />}
                                            </button>
                                           </>
                                       )}
                                       {isDone && order.status === 'Arrived' && (
                                           <span className="text-green-600 flex items-center gap-1 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-lg">
                                               <CheckCircle2 size={14} /> 已完成
                                           </span>
                                       )}
                                       <button 
                                            onClick={() => { if(window.confirm('确认删除记录?')) onDeleteOrder(order.id); }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   </div>
                               )}
                           </div>

                           {/* Card Body */}
                           <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
                               
                               {/* Product Details */}
                               <div className="md:col-span-5 flex gap-4">
                                   <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                       <div className="w-full h-full flex items-center justify-center text-gray-300">
                                           <Package size={24} />
                                       </div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-gray-800 text-sm truncate" title={order.productName}>{order.productName}</h4>
                                       <p className="text-xs text-gray-500 font-mono bg-gray-50 inline-block px-1 rounded mt-1">{order.sku}</p>
                                       
                                       {isEditing ? (
                                           <div className="mt-2 grid grid-cols-2 gap-2">
                                               <div>
                                                   <label className="text-[10px] text-gray-400 block">单价 (¥)</label>
                                                   <input 
                                                      type="number" 
                                                      className="w-full text-xs p-1 border rounded"
                                                      value={editForm.unitPriceCNY}
                                                      onChange={e => setEditForm(p => ({...p, unitPriceCNY: parseFloat(e.target.value)}))}
                                                   />
                                               </div>
                                               <div>
                                                   <label className="text-[10px] text-gray-400 block">数量</label>
                                                   <input 
                                                      type="number" 
                                                      className="w-full text-xs p-1 border rounded"
                                                      value={editForm.quantity}
                                                      onChange={e => setEditForm(p => ({...p, quantity: parseFloat(e.target.value)}))}
                                                   />
                                               </div>
                                           </div>
                                       ) : (
                                           <div className="flex flex-col gap-1 mt-2">
                                               <div className="flex items-center gap-2 text-sm">
                                                   <span className="font-medium text-gray-700">共 {order.quantity} pcs</span>
                                                   <span className="text-gray-300">|</span>
                                                   <span className="font-medium text-gray-700">¥{order.unitPriceCNY}</span>
                                               </div>
                                               {order.receivedQuantity !== undefined && order.receivedQuantity > 0 && (
                                                   <div className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit">
                                                       已收货: {order.receivedQuantity} / {order.quantity}
                                                   </div>
                                               )}
                                           </div>
                                       )}
                                   </div>
                               </div>

                               {/* Financials */}
                               <div className="md:col-span-3 flex flex-col justify-center border-l md:border-l border-gray-100 pl-6">
                                   <p className="text-xs text-gray-400 uppercase font-bold mb-1">采购总额</p>
                                   <p className="text-xl font-bold text-gray-800">
                                       {isEditing 
                                          ? formatCurrency((editForm.quantity || 0) * (editForm.unitPriceCNY || 0), 'CNY')
                                          : formatCurrency(order.totalAmountCNY, 'CNY')
                                       }
                                   </p>
                                   {!isDone && !isEditing && (
                                       <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded w-fit mt-1">待支付/结算</span>
                                   )}
                               </div>

                               {/* Logistics */}
                               <div className="md:col-span-4 flex flex-col justify-center bg-gray-50 rounded-lg p-3">
                                   {isEditing ? (
                                       <div className="space-y-2">
                                           <div className="flex gap-2">
                                               <select 
                                                  className="text-xs p-1 border rounded flex-1"
                                                  value={editForm.shippingMethod || 'Air'}
                                                  onChange={e => setEditForm(p => ({...p, shippingMethod: e.target.value as any}))}
                                               >
                                                   <option value="Air">空运</option>
                                                   <option value="Sea">海运</option>
                                               </select>
                                               <input 
                                                  className="text-xs p-1 border rounded flex-1"
                                                  placeholder="承运商"
                                                  value={editForm.carrier || ''}
                                                  onChange={e => setEditForm(p => ({...p, carrier: e.target.value}))}
                                               />
                                           </div>
                                           <input 
                                              className="text-xs p-1 border rounded w-full"
                                              placeholder="物流单号"
                                              value={editForm.trackingNumber || ''}
                                              onChange={e => setEditForm(p => ({...p, trackingNumber: e.target.value}))}
                                           />
                                           <div className="flex gap-2 mt-2">
                                               <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700">保存</button>
                                               <button onClick={handleCancelEdit} className="flex-1 bg-white border border-gray-300 text-gray-600 text-xs py-1 rounded hover:bg-gray-50">取消</button>
                                           </div>
                                       </div>
                                   ) : (
                                       <>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-gray-500">物流信息</span>
                                               {['Shipped', 'PartiallyArrived', 'Arrived'].includes(order.status) && order.trackingNumber && (
                                                   <a 
                                                       href={getTrackingLink(order.trackingNumber, order.carrier)}
                                                       target="_blank"
                                                       rel="noreferrer"
                                                       className="text-[10px] text-blue-600 flex items-center gap-1 hover:underline"
                                                   >
                                                       查询 <ExternalLink size={10} />
                                                   </a>
                                               )}
                                           </div>
                                           {['Shipped', 'PartiallyArrived', 'Arrived'].includes(order.status) ? (
                                               <div className="space-y-1">
                                                   <div className="flex items-center gap-2 text-xs text-gray-700">
                                                       {order.shippingMethod === 'Air' ? <Plane size={12}/> : <Ship size={12}/>}
                                                       <span className="font-medium">{order.carrier || (order.shippingMethod === 'Air' ? '空运' : '海运')}</span>
                                                   </div>
                                                   <div className="text-xs font-mono text-gray-500 break-all bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                       {order.trackingNumber || '暂无单号'}
                                                   </div>
                                               </div>
                                           ) : (
                                               <div className="text-xs text-gray-400 italic py-2 text-center">
                                                   待发货后更新
                                               </div>
                                           )}
                                       </>
                                   )}
                               </div>
                           </div>
                       </div>
                   );
               })}
           </div>
       )}

       {/* Receive Modal Overlay */}
       {receivingOrderId && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
                   <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <BoxSelect className="text-orange-600"/> 确认收货数量
                   </h3>
                   <div className="bg-orange-50 text-orange-800 text-sm p-3 rounded-lg mb-4">
                       订单总量: {orders.find(o => o.id === receivingOrderId)?.quantity}
                       <br/>
                       已收数量: {orders.find(o => o.id === receivingOrderId)?.receivedQuantity || 0}
                   </div>
                   
                   <div className="mb-4">
                       <label className="block text-sm font-bold text-gray-700 mb-1">本次实收 (Units)</label>
                       <input 
                           type="number" 
                           autoFocus
                           className="w-full p-3 rounded-xl border border-gray-300 font-bold text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                           value={receiveQty}
                           onChange={e => setReceiveQty(parseInt(e.target.value) || 0)}
                       />
                   </div>

                   <div className="flex gap-3">
                       <button onClick={() => setReceivingOrderId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50">取消</button>
                       <button onClick={confirmReceive} className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg">确认入库</button>
                   </div>
               </div>
           </div>
       )}

    </div>
  );
};
