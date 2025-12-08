
import React, { useState } from 'react';
import { Supplier, PurchaseOrder } from '../types';
import { Factory, Phone, Mail, Star, CreditCard, Clock, Plus, Trash2, Search, Edit2, CheckCircle2, User, MessageSquare, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ 
  suppliers, 
  purchaseOrders, 
  onAddSupplier, 
  onUpdateSupplier, 
  onDeleteSupplier 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // --- Logic: Supplier Scoring ---
  // Calculates score based on Purchase Order history
  const getSupplierStats = (supplierId: string) => {
      const supplierPOs = purchaseOrders.filter(po => po.supplierId === supplierId || po.supplierName === suppliers.find(s => s.id === supplierId)?.name);
      
      const totalOrders = supplierPOs.length;
      const totalSpend = supplierPOs.reduce((sum, po) => sum + po.totalAmountCNY, 0);
      
      // Calculate "On Time" (Simulated logic: Arrived = On Time for now)
      const completedOrders = supplierPOs.filter(po => po.status === 'Arrived').length;
      const fulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;
      
      // Recency
      const lastOrderDate = supplierPOs.length > 0 
        ? supplierPOs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
        : '无记录';

      return { totalOrders, totalSpend, completedOrders, fulfillmentRate, lastOrderDate };
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentSupplier.name) return;

      const newSupplier: Supplier = {
          id: currentSupplier.id || Date.now().toString(),
          name: currentSupplier.name,
          contactName: currentSupplier.contactName || '',
          contactPhone: currentSupplier.contactPhone || '',
          contactEmail: currentSupplier.contactEmail || '',
          paymentTerms: currentSupplier.paymentTerms || '100% Prepay',
          leadTimeDays: currentSupplier.leadTimeDays || 15,
          rating: currentSupplier.rating || 5,
          tags: currentSupplier.tags || [],
          mainProducts: currentSupplier.mainProducts || [],
          notes: currentSupplier.notes || ''
      };

      if (currentSupplier.id) {
          onUpdateSupplier(newSupplier);
      } else {
          onAddSupplier(newSupplier);
      }
      setIsEditing(false);
      setCurrentSupplier({});
  };

  const filteredSuppliers = suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    <Factory size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">供应商管理 (SRM)</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">管理工厂档案、联系方式及绩效评分</p>
                </div>
            </div>
            
            <button 
                onClick={() => { setCurrentSupplier({}); setIsEditing(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
                <Plus size={18} />
                新增供应商
            </button>
        </div>

        {/* Content */}
        {isEditing ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-slate-700 max-w-2xl mx-auto animate-fade-in-down">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                    <Edit2 size={18} className="text-indigo-500"/>
                    {currentSupplier.id ? '编辑供应商' : '录入新供应商'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">工厂/公司名称</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 outline-none font-bold"
                                placeholder="例如: 深圳华强电子有限公司"
                                value={currentSupplier.name || ''}
                                onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">联系人</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    type="text" 
                                    className="w-full p-3 pl-10 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 outline-none"
                                    placeholder="张经理"
                                    value={currentSupplier.contactName || ''}
                                    onChange={e => setCurrentSupplier({...currentSupplier, contactName: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">联系电话/微信</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    type="text" 
                                    className="w-full p-3 pl-10 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 outline-none"
                                    placeholder="13800000000"
                                    value={currentSupplier.contactPhone || ''}
                                    onChange={e => setCurrentSupplier({...currentSupplier, contactPhone: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-100 dark:border-slate-600 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">付款账期</label>
                            <select 
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white text-sm"
                                value={currentSupplier.paymentTerms || '100% Prepay'}
                                onChange={e => setCurrentSupplier({...currentSupplier, paymentTerms: e.target.value as any})}
                            >
                                <option value="100% Prepay">100% 预付 (Prepay)</option>
                                <option value="30/70">30% 订金 / 70% 尾款</option>
                                <option value="Net 30">月结 30 天</option>
                                <option value="Net 60">月结 60 天</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">交货期 (Lead Time)</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="number" 
                                    className="w-full p-2.5 pl-10 rounded-lg border border-gray-300 dark:border-slate-500 dark:bg-slate-600 dark:text-white text-sm"
                                    value={currentSupplier.leadTimeDays || 15}
                                    onChange={e => setCurrentSupplier({...currentSupplier, leadTimeDays: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">备注说明</label>
                        <textarea 
                            className="w-full p-3 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 outline-none text-sm h-24 resize-none"
                            placeholder="主营产品、收款账号、注意事项..."
                            value={currentSupplier.notes || ''}
                            onChange={e => setCurrentSupplier({...currentSupplier, notes: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg transition-colors"
                        >
                            保存档案
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Supplier List */}
                {filteredSuppliers.map(supplier => {
                    const stats = getSupplierStats(supplier.id);
                    return (
                        <div key={supplier.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all group relative flex flex-col justify-between h-full">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold text-lg border border-gray-200 dark:border-slate-600">
                                            {supplier.name.substring(0,1)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg line-clamp-1">{supplier.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star 
                                                        key={i} 
                                                        size={12} 
                                                        className={i < (supplier.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 dark:text-slate-600"} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => { setCurrentSupplier(supplier); setIsEditing(true); }}
                                            className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { if(window.confirm('确认删除此供应商？')) onDeleteSupplier(supplier.id); }}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-100 dark:border-slate-600">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <User size={16} className="text-gray-400 shrink-0"/>
                                        <span className="font-medium">{supplier.contactName}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="font-mono">{supplier.contactPhone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <CreditCard size={16} className="text-gray-400 shrink-0"/>
                                        <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-bold border border-orange-100 dark:border-orange-800">{supplier.paymentTerms}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Clock size={16} className="text-gray-400 shrink-0"/>
                                        <span>交货期: {supplier.leadTimeDays} 天</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">绩效评分</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">最近交易: {stats.lastOrderDate}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                                        <p className="text-[10px] text-gray-400 mb-1">历史订单</p>
                                        <p className="font-black text-gray-800 dark:text-white">{stats.totalOrders}</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                                        <p className="text-[10px] text-gray-400 mb-1">采购额</p>
                                        <p className="font-black text-indigo-600 dark:text-indigo-400">¥{(stats.totalSpend/10000).toFixed(1)}w</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/30 relative overflow-hidden">
                                        <div className={`absolute inset-0 bg-green-500 opacity-10`} style={{width: `${stats.fulfillmentRate}%`}}></div>
                                        <p className="text-[10px] text-gray-400 mb-1">交付率</p>
                                        <p className="font-black text-green-600 dark:text-green-400 relative z-10">{stats.fulfillmentRate.toFixed(0)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50">
                        <Factory size={48} className="mx-auto mb-4 opacity-20" />
                        <p>暂无供应商数据</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
