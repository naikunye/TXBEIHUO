
import React, { useState, useEffect, useRef } from 'react';
import { ReplenishmentRecord, Store } from '../types';
import { X, Upload, Image as ImageIcon, Plane, Ship, RefreshCcw, Package, Box, Percent, Zap, BarChart, Tag, Calculator, DollarSign, RotateCcw, Scale, Store as StoreIcon, Clock, ShieldCheck, Factory, Swords, Truck, ChevronDown, Check } from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';
import { analyzeCompetitor } from '../services/geminiService';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<ReplenishmentRecord, 'id'>) => void;
  initialData?: ReplenishmentRecord | null;
  stores: Store[];
  defaultStoreId?: string;
}

export const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose, onSave, initialData, stores, defaultStoreId }) => {
  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    storeIds: [] as string[],
    productName: '',
    sku: '',
    lifecycle: 'New' as const, // Default
    quantity: 0,
    dailySales: 0, // Default
    unitPriceCNY: 0,
    unitWeightKg: 0,
    
    // Supply Chain Defaults
    leadTimeDays: 30, // Default 30 days
    safetyStockDays: 15, // Default 15 days
    supplierName: '',
    supplierContact: '',
    
    // Competitor
    competitorUrl: '',
    competitorPriceUSD: 0,

    // Packing Defaults
    boxLengthCm: 0,
    boxWidthCm: 0,
    boxHeightCm: 0,
    itemsPerBox: 0,
    totalCartons: 0, // Manual Manual override

    shippingMethod: 'Air' as const,
    shippingUnitPriceCNY: 0,
    manualTotalWeightKg: 0, // New Field
    trackingNumber: '',
    carrier: '',
    
    materialCostCNY: 0,
    customsFeeCNY: 0, 
    portFeeCNY: 0,    
    
    salesPriceUSD: 0,
    lastMileCostUSD: 0,
    adCostUSD: 0,
    
    // TikTok Defaults
    platformFeeRate: 2.0, // Default 2%
    affiliateCommissionRate: 0, // Default 0
    additionalFixedFeeUSD: 0.30, // Default $0.30
    returnRate: 0, // Default 0%
    
    warehouse: '火星/休斯顿/美中',
    imageUrl: '',
  };

  const [formData, setFormData] = useState<Omit<ReplenishmentRecord, 'id' | 'status'>>(defaultForm);
  const [shippingCurrency, setShippingCurrency] = useState<'CNY' | 'USD'>('CNY');
  const [skuInput, setSkuInput] = useState(''); // State for pending SKU input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<string | null>(null);
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  
  // Store Selector State
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Effect to populate form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Destructure to remove id and status, keep the rest for the form
        const { id, status, storeId, storeIds, ...rest } = initialData;
        
        // Migrate legacy storeId to storeIds if needed
        let initStoreIds = storeIds || [];
        if (initStoreIds.length === 0 && storeId) {
            initStoreIds = [storeId];
        }

        setFormData({
            ...defaultForm, // Ensure new fields have defaults if old data is loaded
            ...rest,
            storeIds: initStoreIds
        });
      } else {
        // New Record
        const initialStoreIds = defaultStoreId && defaultStoreId !== 'all' ? [defaultStoreId] : (stores.length > 0 ? [stores[0].id] : []);
        setFormData({
            ...defaultForm,
            storeIds: initialStoreIds
        });
      }
      setSkuInput(''); // Reset SKU input
      // Reset currency toggle to CNY on open
      setShippingCurrency('CNY');
      setCompetitorAnalysis(null);
      setIsStoreDropdownOpen(false);
    }
  }, [isOpen, initialData, defaultStoreId, stores]);

  // Close store dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
              setIsStoreDropdownOpen(false);
          }
      };
      if(isStoreDropdownOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isStoreDropdownOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Check if field is string or number type in defaultForm to decide parsing
    const isStringField = ['date', 'productName', 'sku', 'shippingMethod', 'warehouse', 'imageUrl', 'lifecycle', 'supplierName', 'supplierContact', 'competitorUrl', 'trackingNumber', 'carrier'].includes(name);
    
    setFormData(prev => ({
      ...prev,
      [name]: isStringField ? value : (parseFloat(value) || 0)
    }));
  };

  const toggleStore = (storeId: string) => {
      setFormData(prev => {
          const currentIds = prev.storeIds || [];
          if (currentIds.includes(storeId)) {
              return { ...prev, storeIds: currentIds.filter(id => id !== storeId) };
          } else {
              return { ...prev, storeIds: [...currentIds, storeId] };
          }
      });
  };

  // Helper to auto-calculate cartons if user wants to (Reverse)
  const autoCalculateCartons = () => {
      const safeItemsPerBox = formData.itemsPerBox > 0 ? formData.itemsPerBox : 1;
      const calcCartons = Math.ceil(formData.quantity / safeItemsPerBox);
      setFormData(prev => ({ ...prev, totalCartons: calcCartons }));
  };

  // Helper to auto-calculate quantity from cartons (Forward)
  const autoCalculateQuantity = () => {
      const safeItemsPerBox = formData.itemsPerBox > 0 ? formData.itemsPerBox : 0;
      const calcQty = formData.totalCartons * safeItemsPerBox;
      setFormData(prev => ({ ...prev, quantity: calcQty }));
  };

  // --- SKU Tag Logic ---
  const skuTags = formData.sku ? formData.sku.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkuTag();
    } else if (e.key === 'Backspace' && !skuInput && skuTags.length > 0) {
      const newTags = skuTags.slice(0, -1);
      setFormData(prev => ({ ...prev, sku: newTags.join(', ') }));
    }
  };

  const handleSkuBlur = () => {
      addSkuTag();
  };

  const addSkuTag = () => {
      const val = skuInput.trim().replace(/,/g, '');
      if (val) {
          if (!skuTags.includes(val)) {
               const newTags = [...skuTags, val];
               setFormData(prev => ({ ...prev, sku: newTags.join(', ') }));
          }
          setSkuInput('');
      }
  };

  const removeSkuTag = (tagToRemove: string) => {
      const newTags = skuTags.filter(t => t !== tagToRemove);
      setFormData(prev => ({ ...prev, sku: newTags.join(', ') }));
  };
  // ---------------------

  const handleShippingPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
        setFormData(prev => ({ ...prev, shippingUnitPriceCNY: 0 }));
        return;
    }
    
    const numVal = parseFloat(val);
    if (shippingCurrency === 'CNY') {
        setFormData(prev => ({ ...prev, shippingUnitPriceCNY: numVal }));
    } else {
        setFormData(prev => ({ ...prev, shippingUnitPriceCNY: numVal * EXCHANGE_RATE }));
    }
  };

  const handleCompetitorAnalyze = async () => {
      if(!formData.salesPriceUSD) {
          alert("请先填写我方售价");
          return;
      }
      setIsAnalyzingCompetitor(true);
      // Construct a temporary record for analysis
      const tempRecord = { ...formData, id: 'temp' } as ReplenishmentRecord;
      const result = await analyzeCompetitor(tempRecord);
      setCompetitorAnalysis(result);
      setIsAnalyzingCompetitor(false);
  };

  // Calculate display value based on selected currency
  const displayShippingPrice = shippingCurrency === 'CNY'
    ? formData.shippingUnitPriceCNY
    : parseFloat((formData.shippingUnitPriceCNY / EXCHANGE_RATE).toFixed(2));

  // Dynamic Volume Calculation for UI Feedback
  const boxVolCbm = (formData.boxLengthCm * formData.boxWidthCm * formData.boxHeightCm) / 1000000;
  // Use Manual Total Cartons
  const totalVolCbm = boxVolCbm * formData.totalCartons;
  
  // Theoretical Weight
  const theoreticalWeight = formData.quantity * formData.unitWeightKg;
  
  // DOS Preview
  const dos = formData.dailySales > 0 ? (formData.quantity / formData.dailySales).toFixed(1) : '∞';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const status = initialData ? initialData.status : 'Planning';
    // If totalCartons is 0, try to calc.
    let finalCartons = formData.totalCartons;
    if (finalCartons === 0 && formData.quantity > 0 && formData.itemsPerBox > 0) {
        finalCartons = Math.ceil(formData.quantity / formData.itemsPerBox);
    }

    onSave({ 
        ...formData, 
        totalCartons: finalCartons, 
        status,
        storeId: formData.storeIds?.[0] // Backward compatibility: keep primary storeId
    });
    onClose();
  };

  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  
  const isAir = formData.shippingMethod === 'Air';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {initialData ? `编辑: ${initialData.productName}` : '新增备货计划'}
            </h2>
            <p className="text-sm text-gray-500">
              {initialData ? '完善参数以获得更准确的智能补货建议' : '填写详细信息以计算精准利润'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm hover:shadow transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Section 1: Product Basic Info */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</span>
                <h3 className="text-base font-bold text-gray-800">产品与供应链</h3>
              </div>
              
              {/* Multi-Store Selector */}
              <div className="relative" ref={storeDropdownRef}>
                  <div 
                    className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors select-none"
                    onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  >
                     <StoreIcon size={16} className="text-purple-600"/>
                     <span className="text-sm font-bold text-purple-700 min-w-[80px] truncate max-w-[200px]">
                        {formData.storeIds && formData.storeIds.length > 0 
                          ? `${formData.storeIds.length} 个店铺` 
                          : '选择店铺'}
                     </span>
                     <ChevronDown size={14} className={`text-purple-400 transition-transform ${isStoreDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isStoreDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2 space-y-1 animate-fade-in-down">
                       <div className="px-2 py-1 text-xs font-bold text-gray-400 uppercase">归属店铺</div>
                       <div className="max-h-60 overflow-y-auto custom-scrollbar">
                           {stores.map(store => {
                             const isSelected = formData.storeIds?.includes(store.id);
                             return (
                               <div 
                                 key={store.id}
                                 onClick={() => toggleStore(store.id)}
                                 className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${isSelected ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                               >
                                 <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}>
                                    {isSelected && <Check size={10} className="text-white" />}
                                 </div>
                                 <span className="truncate">{store.name}</span>
                               </div>
                             )
                           })}
                           {stores.length === 0 && <div className="text-center text-xs text-gray-400 py-2">暂无店铺</div>}
                       </div>
                    </div>
                  )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Uploader */}
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">产品图片</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition bg-gray-50 overflow-hidden relative group"
                >
                    {formData.imageUrl ? (
                        <>
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                             <Upload className="text-white" size={24} />
                         </div>
                        </>
                    ) : (
                        <>
                            <ImageIcon className="text-gray-400 mb-2" size={32} />
                            <span className="text-xs text-gray-500">点击上传</span>
                        </>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                </div>
              </div>

              {/* Basic Inputs */}
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>日期</label>
                    <input required type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} />
                  </div>
                   <div>
                    <label className={labelClass}>生命周期阶段</label>
                    <div className="relative">
                        <Zap className="absolute left-3 top-3 text-gray-400" size={16} />
                        <select 
                            name="lifecycle" 
                            value={formData.lifecycle} 
                            onChange={handleChange} 
                            className={`${inputClass} pl-10`}
                        >
                            <option value="New">🌱 新品推广 (New)</option>
                            <option value="Growth">🚀 高速增长 (Growth)</option>
                            <option value="Stable">⚖️ 稳定热卖 (Stable)</option>
                            <option value="Clearance">📉 尾货清仓 (Clearance)</option>
                        </select>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className={labelClass}>产品名称</label>
                    <input required type="text" placeholder="例如: MAD ACID" name="productName" value={formData.productName} onChange={handleChange} className={inputClass} />
                  </div>
                  
                  {/* Enhanced SKU Input */}
                  <div className="md:col-span-1">
                    <label className={labelClass}>SKU (支持多标签，按回车添加)</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 min-h-[42px] transition-all">
                        {skuTags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 animate-fade-in">
                                <Tag size={10} className="opacity-50" />
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeSkuTag(tag)}
                                    className="text-blue-400 hover:text-blue-600 focus:outline-none ml-0.5 hover:bg-blue-100 rounded"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder={skuTags.length === 0 ? "输入SKU (如 MA-001)" : ""}
                            value={skuInput}
                            onChange={(e) => setSkuInput(e.target.value)}
                            onKeyDown={handleSkuKeyDown}
                            onBlur={handleSkuBlur}
                            className="flex-1 min-w-[80px] outline-none text-sm bg-transparent"
                        />
                    </div>
                  </div>

                  {/* Supply Chain Params (New) */}
                  <div className="grid grid-cols-2 gap-4 md:col-span-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <div>
                          <label className={`${labelClass} text-yellow-800`}>生产+物流总时效 (Days)</label>
                          <div className="relative">
                              <Clock className="absolute left-3 top-3 text-yellow-500" size={16} />
                              <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleChange} className={`${inputClass} pl-10 border-yellow-200`} placeholder="30" />
                          </div>
                      </div>
                      <div>
                          <label className={`${labelClass} text-yellow-800`}>安全库存天数 (Days)</label>
                          <div className="relative">
                              <ShieldCheck className="absolute left-3 top-3 text-yellow-500" size={16} />
                              <input type="number" name="safetyStockDays" value={formData.safetyStockDays} onChange={handleChange} className={`${inputClass} pl-10 border-yellow-200`} placeholder="15" />
                          </div>
                      </div>
                  </div>

              </div>
            </div>
          </div>

          {/* Section 2: Procurement & Packing (Combined for Flow) */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* 2a. Cost & Supplier (CRM Update) */}
             <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="text-sm font-bold text-gray-700">采购与供应商 (CRM)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>供应商名称</label>
                        <div className="relative">
                            <Factory className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" name="supplierName" value={formData.supplierName} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="工厂名称" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>联系方式</label>
                        <input type="text" name="supplierContact" value={formData.supplierContact} onChange={handleChange} className={inputClass} placeholder="微信/Email" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>采购单价 (¥/pcs)</label>
                        <input required type="number" step="0.01" name="unitPriceCNY" value={formData.unitPriceCNY} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>单个重量 (KG)</label>
                        <input required type="number" step="0.001" name="unitWeightKg" value={formData.unitWeightKg} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>备货箱数 (Box)</label>
                        <input required type="number" name="totalCartons" value={formData.totalCartons} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>预估日销 (Daily Sales)</label>
                        <div className="relative">
                            <BarChart className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input required type="number" step="0.1" name="dailySales" value={formData.dailySales} onChange={handleChange} className={`${inputClass} pl-10`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            可售天数: <span className={formData.dailySales > 0 ? (formData.quantity/formData.dailySales < 30 ? 'text-red-500 font-bold' : 'text-green-600') : ''}>{dos} 天</span>
                        </p>
                    </div>
                </div>
             </div>

             {/* 2b. Packing Spec */}
             <div className="space-y-4 p-5 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs">3</span>
                        <h3 className="text-sm font-bold text-amber-800">箱规设置</h3>
                    </div>
                    <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        {formData.totalCartons} 箱 | {totalVolCbm.toFixed(3)} CBM
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className={labelClass}>长 (cm)</label>
                        <input type="number" name="boxLengthCm" value={formData.boxLengthCm} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>宽 (cm)</label>
                        <input type="number" name="boxWidthCm" value={formData.boxWidthCm} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>高 (cm)</label>
                        <input type="number" name="boxHeightCm" value={formData.boxHeightCm} onChange={handleChange} className={inputClass} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>每箱数量 (Items/Box)</label>
                        <div className="relative">
                            <Package className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input required type="number" name="itemsPerBox" value={formData.itemsPerBox} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="20" />
                        </div>
                    </div>
                    {/* SWAPPED FIELD: Quantity (Units) is now here */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">备货总数 (Total Pcs)</label>
                            <button 
                                type="button"
                                onClick={autoCalculateQuantity}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                title="点击根据箱数自动计算"
                            >
                                <Calculator size={10} /> 自动计算
                            </button>
                        </div>
                        <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={`${inputClass} font-bold text-amber-700`} placeholder="0" />
                    </div>
                </div>
             </div>
          </div>

          {/* Section 4: Logistics & Tracking (Live Tracking Update) */}
          <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
             <div className="flex items-center gap-2 mb-2">
               <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">4</span>
               <h3 className="text-sm font-bold text-gray-700">头程物流 (First Leg)</h3>
             </div>
             
             {/* Shipping Method Selector */}
             <div>
                <label className={labelClass}>运输渠道</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, shippingMethod: 'Air' }))}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                            isAir 
                            ? 'bg-sky-50 border-sky-200 text-sky-700 shadow-sm ring-1 ring-sky-200' 
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Plane size={18} />
                        <span className="font-medium">空运 (Air)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, shippingMethod: 'Sea' }))}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                            !isAir 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Ship size={18} />
                        <span className="font-medium">海运 (Sea)</span>
                    </button>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>承运商 / 船司</label>
                    <input type="text" name="carrier" value={formData.carrier} onChange={handleChange} className={inputClass} placeholder="Matson/UPS" />
                 </div>
                 <div>
                    <label className={labelClass}>物流追踪号</label>
                    <div className="relative">
                        <Truck className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input type="text" name="trackingNumber" value={formData.trackingNumber} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="Tracking No." />
                    </div>
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {isAir ? '空运单价' : '海运单价'}
                            <span className="text-xs font-normal text-gray-500 ml-1">(/KG)</span>
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setShippingCurrency('CNY')}
                                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                                    shippingCurrency === 'CNY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                CNY
                            </button>
                            <button
                                type="button"
                                onClick={() => setShippingCurrency('USD')}
                                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all ${
                                    shippingCurrency === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                USD
                            </button>
                        </div>
                    </div>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                             {shippingCurrency === 'CNY' ? '¥' : '$'}
                        </span>
                        <input 
                            required 
                            type="number" 
                            step="0.01" 
                            name="shippingUnitPrice" 
                            value={displayShippingPrice || ''} 
                            onChange={handleShippingPriceChange} 
                            className={`${inputClass} pl-7`} 
                            placeholder="0.00"
                        />
                    </div>
                 </div>
                 
                 {/* New Field: Manual Total Weight */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">计费总重 (Manual)</label>
                    </div>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            <Scale size={14} />
                        </span>
                        <input 
                            type="number" 
                            step="0.01" 
                            name="manualTotalWeightKg" 
                            value={formData.manualTotalWeightKg || ''} 
                            onChange={handleChange} 
                            className={`${inputClass} pl-9`} 
                            placeholder="0"
                        />
                        <div className="text-[10px] text-gray-400 text-right mt-1">
                            理论实重: {theoreticalWeight.toFixed(2)} kg
                        </div>
                    </div>
                 </div>
             </div>
             
             {/* New Fees Grid */}
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>耗材/贴标费 (¥)</label>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">¥</span>
                        <input 
                            required 
                            type="number" 
                            step="1" 
                            name="materialCostCNY" 
                            value={formData.materialCostCNY} 
                            onChange={handleChange} 
                            className={`${inputClass} pl-7`} 
                            placeholder="0"
                        />
                    </div>
                 </div>
                 <div>
                    <label className={labelClass}>报关费 (¥)</label>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">¥</span>
                        <input 
                            required 
                            type="number" 
                            step="1" 
                            name="customsFeeCNY" 
                            value={formData.customsFeeCNY} 
                            onChange={handleChange} 
                            className={`${inputClass} pl-7`} 
                            placeholder="0"
                        />
                    </div>
                 </div>
                 <div>
                    <label className={labelClass}>港口/操作费 (¥)</label>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">¥</span>
                        <input 
                            required 
                            type="number" 
                            step="1" 
                            name="portFeeCNY" 
                            value={formData.portFeeCNY} 
                            onChange={handleChange} 
                            className={`${inputClass} pl-7`} 
                            placeholder="0"
                        />
                    </div>
                 </div>
                 <div className="md:col-span-1">
                    <label className={labelClass}>目的仓库</label>
                    <input type="text" name="warehouse" value={formData.warehouse} onChange={handleChange} className={inputClass} />
                  </div>
             </div>
          </div>

           {/* Section 5: Sales & TikTok Details */}
           <div className="space-y-4 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
             <div className="flex items-center gap-2 mb-2">
               <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs">5</span>
               <h3 className="text-sm font-bold text-gray-800">TikTok 销售与竞品 (Market Intel)</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>我方销售价格 ($)</label>
                  <input required type="number" step="0.01" name="salesPriceUSD" value={formData.salesPriceUSD} onChange={handleChange} className={`${inputClass} font-bold text-blue-600`} />
                </div>
                
                {/* Competitor Analysis Section (New) */}
                <div className="col-span-2 bg-white/60 p-3 rounded-lg border border-purple-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Swords size={14} className="text-red-500" />
                            <span className="text-xs font-bold text-gray-700">竞品监控</span>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleCompetitorAnalyze}
                            disabled={isAnalyzingCompetitor}
                            className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 transition flex items-center gap-1"
                        >
                            {isAnalyzingCompetitor ? '分析中...' : 'AI 攻防分析'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <input type="text" name="competitorUrl" value={formData.competitorUrl} onChange={handleChange} className="text-xs p-2 border rounded" placeholder="竞品链接/ASIN" />
                        <div className="relative">
                            <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                            <input type="number" name="competitorPriceUSD" value={formData.competitorPriceUSD} onChange={handleChange} className="text-xs p-2 pl-4 border rounded w-full" placeholder="竞品售价" />
                        </div>
                    </div>
                    {competitorAnalysis && (
                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs border border-slate-200 prose max-w-none" dangerouslySetInnerHTML={{__html: competitorAnalysis}}></div>
                    )}
                </div>

                {/* Visual Group for TikTok Fees */}
                <div className="col-span-2 bg-purple-100/50 p-3 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Tag size={14} className="text-purple-500" />
                        <span className="text-xs font-bold text-purple-800 uppercase">TikTok Cost Structure</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className={labelClass}>平台佣金 (%)</label>
                           <div className="relative">
                                <Percent className="absolute right-3 top-3 text-gray-400" size={14} />
                                <input required type="number" step="0.1" name="platformFeeRate" value={formData.platformFeeRate} onChange={handleChange} className={inputClass} placeholder="2.0" />
                           </div>
                           <p className="text-[10px] text-gray-400 mt-0.5">TikTok Shop 佣金</p>
                        </div>
                        <div>
                           <label className={labelClass}>达人带货佣金 (%)</label>
                           <div className="relative">
                                <Percent className="absolute right-3 top-3 text-gray-400" size={14} />
                                <input required type="number" step="1" name="affiliateCommissionRate" value={formData.affiliateCommissionRate} onChange={handleChange} className={inputClass} placeholder="15.0" />
                           </div>
                           <p className="text-[10px] text-gray-400 mt-0.5">联盟推广费</p>
                        </div>
                        <div>
                           <label className={labelClass}>每单固定费 ($)</label>
                           <div className="relative">
                                <DollarSign className="absolute right-3 top-3 text-gray-400" size={14} />
                                <input required type="number" step="0.01" name="additionalFixedFeeUSD" value={formData.additionalFixedFeeUSD} onChange={handleChange} className={inputClass} placeholder="0.30" />
                           </div>
                           <p className="text-[10px] text-gray-400 mt-0.5">交易定额费 (如 $0.3)</p>
                        </div>
                    </div>
                </div>

                {/* Other Costs */}
                <div>
                   <label className={labelClass}>预估退货率 (%)</label>
                   <div className="relative">
                        <RotateCcw className="absolute right-3 top-3 text-gray-400" size={14} />
                        <input required type="number" step="0.1" name="returnRate" value={formData.returnRate} onChange={handleChange} className={inputClass} placeholder="5.0" />
                   </div>
                   <p className="text-[10px] text-gray-400 mt-0.5">用于计算退货损耗</p>
                </div>

                <div>
                  <label className={labelClass}>尾程派送费 ($)</label>
                  <input required type="number" step="0.01" name="lastMileCostUSD" value={formData.lastMileCostUSD} onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>预估广告费 ($)</label>
                  <input required type="number" step="0.01" name="adCostUSD" value={formData.adCostUSD} onChange={handleChange} className={inputClass} />
                </div>
             </div>
          </div>

          <div className="col-span-1 md:col-span-2 pt-2 border-t border-gray-100">
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              {initialData ? '保存修改' : '确认添加'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
