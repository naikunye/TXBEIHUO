
import React, { useState } from 'react';
import { Supplier, PurchaseOrder } from '../types';
import { Factory, Phone, Mail, Star, CreditCard, Clock, Plus, Trash2, Search, Edit2, CheckCircle2, User, MessageSquare } from 'lucide-react';

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
      
      // Mock "On Time" calculation (in real app, compare arrived date vs expected date)
      // For now, if status is 'Arrived', we assume it was successful.
      const completedOrders = supplierPOs.filter(po => po.status === 'Arrived').length;
      
      return { totalOrders, totalSpend, completedOrders };
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 border border-indigo-100">
                    <Factory size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">供应商管理 (SRM)</h2>
                    <p className="text-xs text-gray-500 mt-1">管理工厂档案、联系方式及绩效评分</p>
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
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 max-w-2xl mx-auto animate-fade-in-down">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Edit2 size={18} className="text-indigo-500"/>
                    {currentSupplier.id ? '编辑供应商' : '录入新供应商'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">工厂/公司名称</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full p-3 rounded-xl border border-gray-300 focus:border-indigo-500 outline-none font-bold"
                                placeholder="例如: 深圳华强电子有限公司"
                                value={currentSupplier.name || ''}
                                onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">联系人</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    type="text" 
                                    className="w-full p-3 pl-10 rounded-xl border border-gray-300 focus:border-indigo-500 outline-none"
                                    placeholder="张经理"
                                    value={currentSupplier.contactName || ''}
                                    onChange={e => setCurrentSupplier({...currentSupplier, contactName: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">联系电话/微信</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input 
                                    type="text" 
                                    className="w-full p-3 pl-10 rounded-xl border border-gray-300 focus:border-indigo-500 outline-none"
                                    placeholder="13800000000"
                                    value={currentSupplier.contactPhone || ''}
                                    onChange={e => setCurrentSupplier({...currentSupplier, contactPhone: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">付款账期</label>
                            <select 
                                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm"
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
                            <label className="block text-xs font-bold text-gray-500 mb-1">交货期 (Lead Time)</label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="number" 
                                    className="w-full p-2.5 pl-10 rounded-lg border border-gray-300 text-sm"
                                    value={currentSupplier.leadTimeDays || 15}
                                    onChange={e => setCurrentSupplier({...currentSupplier, leadTimeDays: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">备注说明</label>
                        <textarea 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:border-indigo-500 outline-none text-sm h-24 resize-none"
                            placeholder="主营产品、收款账号、注意事项..."
                            value={currentSupplier.notes || ''}
                            onChange={e => setCurrentSupplier({...currentSupplier, notes: e.target.value})}
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier List */}
                {filteredSuppliers.map(supplier => {
                    const stats = getSupplierStats(supplier.id);
                    return (
                        <div key={supplier.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg">
                                        {supplier.name.substring(0,1)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{supplier.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    size={12} 
                                                    className={i < (supplier.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setCurrentSupplier(supplier); setIsEditing(true); }}
                                        className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => { if(window.confirm('确认删除此供应商？')) onDeleteSupplier(supplier.id); }}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <User size={16} className="text-gray-400"/>
                                    <span>{supplier.contactName}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>{supplier.contactPhone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <CreditCard size={16} className="text-gray-400"/>
                                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">{supplier.paymentTerms}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Clock size={16} className="text-gray-400"/>
                                    <span>交货期: {supplier.leadTimeDays} 天</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase">历史订单</p>
                                    <p className="text-xl font-black text-gray-800">{stats.totalOrders}</p>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <p className="text-xs text-gray-400 font-bold uppercase">采购总额</p>
                                    <p className="text-xl font-black text-indigo-600">¥{(stats.totalSpend/10000).toFixed(1)}w</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {filteredSuppliers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                        <Factory size={48} className="mx-auto mb-4 opacity-20" />
                        <p>暂无供应商数据</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
