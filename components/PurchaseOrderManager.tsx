
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
  MoreHorizontal,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  UserCheck
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
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Completed' | 'Pending'>('All');
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
      result = result.filter(o => !['Arrived', 'Cancelled', 'Draft', 'PendingApproval', 'Rejected'].includes(o.status));
    } else if (activeTab === 'Completed') {
      result = result.filter(o => ['Arrived', 'Cancelled'].includes(o.status));
    } else if (activeTab === 'Pending') {
      result = result.filter(o => ['Draft', 'PendingApproval', 'Rejected'].includes(o.status));
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
    const pendingApproval = orders.filter(o => o.status === 'PendingApproval').length;
    return { count: active.length, totalSpend, incomingUnits, pendingApproval };
  }, [orders]);

  // --- Handlers ---

  const handleNextStatus = (order: PurchaseOrder) => {
      // Approval Workflow Logic
      if (order.status === 'Draft') {
          if (confirm("确认提交审批？")) {
              onUpdateOrder({ ...order, status: 'PendingApproval' });
          }
          return;
      }
      
      // Standard Flow
      const flow: POStatus[] = ['PendingApproval', 'Approved', 'Ordered', 'Production', 'Shipped', 'PartiallyArrived', 'Arrived'];
      const currentIndex = flow.indexOf(order.status);
      
      if (order.status === 'Shipped' || order.status === 'PartiallyArrived') {
          setReceivingOrderId(order.id);
          const remaining = order.quantity - (order.receivedQuantity || 0);
          setReceiveQty(remaining); 
      } else if (currentIndex !== -1 && currentIndex < flow.length - 1) {
          const nextStatus = flow[currentIndex + 1];
          onUpdateOrder({ ...order, status: nextStatus });
      }
  };

  const handleApprove = (order: PurchaseOrder) => {
      onUpdateOrder({ ...order, status: 'Approved', approver: 'Admin' });
  };

  const handleReject = (order: PurchaseOrder) => {
      const reason = prompt("请输入驳回原因:", "价格过高");
      if (reason) {
          onUpdateOrder({ ...order, status: 'Rejected', rejectionReason: reason });
      }
  };

  const confirmReceive = () => {
      if (!receivingOrderId) return;
      const order = orders.find(o => o.id === receivingOrderId);
      if (!order) return;

      const currentReceived = order.receivedQuantity || 0;
      const newTotalReceived = currentReceived + receiveQty;
      
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
  const statusConfig: Record<POStatus, { label: string, color: string, bg: string, icon: any }> = {
      'Draft': { label: '草稿', color: 'text-gray-500', bg: 'bg-gray-100', icon: FileText },
      'PendingApproval': { label: '待审批', color: 'text-orange-600', bg: 'bg-orange-50', icon: ShieldCheck },
      'Approved': { label: '已审批', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
      'Rejected': { label: '已驳回', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
      'Ordered': { label: '已下单', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle2 },
      'Production': { label: '生产中', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
      'Shipped': { label: '运输中', color: 'text-purple-600', bg: 'bg-purple-50', icon: Truck },
      'PartiallyArrived': { label: '部分收货', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: BoxSelect },
      'Arrived': { label: '已入库', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
      'Cancelled': { label: '已取消', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle }
  };

  const kanbanColumns: POStatus[] = ['PendingApproval', 'Ordered', 'Production', 'Shipped', 'Arrived'];

  const getTrackingLink = (number?: string, carrier?: string) => {
      if (!number) return '#';
      if ((carrier || '').toLowerCase().includes('ups')) return `https://www.ups.com/track?tracknum=${number}`;
      return `https://t.17track.net/zh-cn#nums=${number}`;
  };

  // --- Render Board Card ---
  const renderBoardCard = (order: PurchaseOrder) => {
      const StatusIcon = statusConfig[order.status].icon;
      const isReceiving = ['Shipped', 'PartiallyArrived'].includes(order.status);
      const isApproval = order.status === 'PendingApproval';
      
      return (
          <div key={order.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{order.poNumber.split('-').pop()}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status !== 'Arrived' && !isApproval && (
                          <button onClick={() => handleNextStatus(order)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400" title="推进流程">
                              <ArrowRight size={14} />
                          </button>
                      )}
                      <button onClick={() => onDeleteOrder(order.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-400">
                          <Trash2 size={14} />
                      </button>
                  </div>
              </div>
              
              <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                      <Package size={18} className="text-gray-400"/>
                  </div>
                  <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate" title={order.productName}>{order.productName}</h4>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          <span>{order.quantity} pcs</span>
                          <span className="text-gray-300">|</span>
                          <span>¥{formatCurrency(order.totalAmountCNY, 'CNY').replace('¥','')}</span>
                      </div>
                  </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="h-1 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full ${statusConfig[order.status].bg.replace('bg-', 'bg-')} ${statusConfig[order.status].color.replace('text-', 'bg-')}`} 
                    style={{ width: '100%' }}
                  ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span className="truncate max-w-[80px]">{order.supplierName}</span>
                  {isReceiving && (
                      <span className="text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/30 px-1.5 rounded">
                          已收: {order.receivedQuantity || 0}
                      </span>
                  )}
              </div>

              {/* Approval Actions */}
              {isApproval && (
                  <div className="mt-2 flex gap-2 border-t border-gray-100 dark:border-slate-700 pt-2">
                      <button onClick={() => handleApprove(order)} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <ThumbsUp size={12}/> 通过
                      </button>
                      <button onClick={() => handleReject(order)} className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <ThumbsDown size={12}/> 驳回
                      </button>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative h-full flex flex-col">
       
       {/* 1. Dashboard Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><FileText size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">进行中订单</p>
                   <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.count}</p>
               </div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"><DollarSign size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">待付/在途金额</p>
                   <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(stats.totalSpend, 'CNY')}</p>
               </div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
               <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"><ShieldCheck size={24} /></div>
               <div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">待审批申请</p>
                   <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.pendingApproval}</p>
               </div>
           </div>
       </div>

       {/* 2. Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-20 shrink-0">
           
           <div className="flex gap-2 items-center">
               <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                   <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                       <LayoutGrid size={18} />
                   </button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                       <ListIcon size={18} />
                   </button>
               </div>
               <div className="h-6 w-px bg-gray-200 dark:bg-slate-600"></div>
               <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                   {(['All', 'Active', 'Pending', 'Completed'] as const).map(tab => (
                       <button
                           key={tab}
                           onClick={() => setActiveTab(tab)}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                       >
                           {tab === 'All' ? '全部' : tab === 'Active' ? '进行中' : tab === 'Pending' ? '待处理' : '归档'}
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
                   className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 dark:text-gray-200"
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
                           <div key={col} className="flex-1 min-w-[200px] flex flex-col h-full rounded-2xl bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200/60 dark:border-slate-700/60">
                               {/* Column Header */}
                               <div className={`p-3 border-b border-gray-100 dark:border-slate-700 rounded-t-2xl ${conf.bg} dark:bg-opacity-10 bg-opacity-30`}>
                                   <div className="flex justify-between items-center">
                                       <div className="flex items-center gap-2">
                                           <div className={`w-2 h-2 rounded-full ${conf.color.replace('text-', 'bg-')}`}></div>
                                           <span className={`text-xs font-bold ${conf.color}`}>{conf.label}</span>
                                       </div>
                                       <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-slate-600">
                                           {colOrders.length}
                                       </span>
                                   </div>
                               </div>
                               
                               {/* Draggable Area (Simulated) */}
                               <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                   {colOrders.map(order => renderBoardCard(order))}
                                   {colOrders.length === 0 && (
                                       <div className="h-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-gray-300 dark:text-slate-600 text-xs">
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
                       <div key={order.id} className={`bg-white dark:bg-slate-800 rounded-xl border transition-all hover:shadow-md ${isDone ? 'border-gray-200 dark:border-slate-700 opacity-90' : 'border-gray-200 dark:border-slate-700 shadow-sm'}`}>
                           {/* Card Header */}
                           <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-50 dark:border-slate-700 gap-4">
                               <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded-lg ${statusConfig[order.status].bg} dark:bg-opacity-10`}>
                                       <StatusIcon size={18} className={statusConfig[order.status].color} />
                                   </div>
                                   <div>
                                       <div className="flex items-center gap-2">
                                           <span className="font-mono font-bold text-gray-800 dark:text-white text-base">{order.poNumber}</span>
                                           <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusConfig[order.status].color.replace('text', 'border')} bg-white dark:bg-transparent`}>
                                               {statusConfig[order.status].label}
                                           </span>
                                       </div>
                                       <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                                            
                                            {order.status === 'Draft' ? (
                                                <button onClick={() => handleNextStatus(order)} className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-orange-600 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                                    提交审批
                                                </button>
                                            ) : order.status === 'PendingApproval' ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(order)} className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold">通过</button>
                                                    <button onClick={() => handleReject(order)} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-bold">驳回</button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleNextStatus(order)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-colors shadow-sm ${isReceiving ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                                >
                                                    {order.status === 'Ordered' ? '开始生产' : order.status === 'Production' ? '发货' : '收货入库'}
                                                    {isReceiving ? <BoxSelect size={12} /> : <ArrowRight size={12} />}
                                                </button>
                                            )}
                                           </>
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
                               {/* ... (Keep existing product details rendering) ... */}
                               <div className="md:col-span-5 flex gap-4">
                                   <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-slate-600">
                                       <div className="w-full h-full flex items-center justify-center text-gray-300">
                                           <Package size={24} />
                                       </div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{order.productName}</h4>
                                       <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-slate-700 inline-block px-1 rounded mt-1">{order.sku}</p>
                                       
                                       <div className="flex flex-col gap-1 mt-2">
                                           <div className="flex items-center gap-2 text-sm">
                                               <span className="font-medium text-gray-700 dark:text-gray-300">共 {order.quantity} pcs</span>
                                               <span className="text-gray-300">|</span>
                                               <span className="font-medium text-gray-700 dark:text-gray-300">¥{order.unitPriceCNY}</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>

                               <div className="md:col-span-3 flex flex-col justify-center border-l md:border-l border-gray-100 dark:border-slate-700 pl-6">
                                   <p className="text-xs text-gray-400 uppercase font-bold mb-1">采购总额</p>
                                   <p className="text-xl font-bold text-gray-800 dark:text-white">
                                       {formatCurrency(order.totalAmountCNY, 'CNY')}
                                   </p>
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
               <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                       <BoxSelect className="text-orange-600"/> 确认收货数量
                   </h3>
                   <div className="bg-orange-50 text-orange-800 text-sm p-3 rounded-lg mb-4">
                       订单总量: {orders.find(o => o.id === receivingOrderId)?.quantity}
                       <br/>
                       已收数量: {orders.find(o => o.id === receivingOrderId)?.receivedQuantity || 0}
                   </div>
                   
                   <div className="mb-4">
                       <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">本次实收 (Units)</label>
                       <input 
                           type="number" 
                           autoFocus
                           className="w-full p-3 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white font-bold text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                           value={receiveQty}
                           onChange={e => setReceiveQty(parseInt(e.target.value) || 0)}
                       />
                   </div>

                   <div className="flex gap-3">
                       <button onClick={() => setReceivingOrderId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-600 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">取消</button>
                       <button onClick={confirmReceive} className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:bg-slate-800 shadow-lg">确认入库</button>
                   </div>
               </div>
           </div>
       )}

    </div>
  );
};
