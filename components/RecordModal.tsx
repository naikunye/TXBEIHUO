import React, { useState, useEffect, useRef } from 'react';
import { ReplenishmentRecord } from '../types';
import { X, Upload, Image as ImageIcon, Plane, Ship, RefreshCcw, Package, Box, Percent } from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<ReplenishmentRecord, 'id'>) => void;
  initialData?: ReplenishmentRecord | null;
}

export const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    productName: '',
    sku: '',
    quantity: 0,
    unitPriceCNY: 0,
    unitWeightKg: 0,
    // Packing Defaults
    boxLengthCm: 0,
    boxWidthCm: 0,
    boxHeightCm: 0,
    itemsPerBox: 0,
    
    shippingMethod: 'Air' as const,
    shippingUnitPriceCNY: 0,
    materialCostCNY: 0,
    
    salesPriceUSD: 0,
    lastMileCostUSD: 0,
    adCostUSD: 0,
    
    // TikTok Defaults
    platformFeeRate: 2.0, // Default 2%
    affiliateCommissionRate: 0, // Default 0
    
    warehouse: '火星/休斯顿/美中',
    imageUrl: '',
  };

  const [formData, setFormData] = useState<Omit<ReplenishmentRecord, 'id' | 'status'>>(defaultForm);
  const [shippingCurrency, setShippingCurrency] = useState<'CNY' | 'USD'>('CNY');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to populate form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Destructure to remove id and status, keep the rest for the form
        const { id, status, ...rest } = initialData;
        setFormData(rest);
      } else {
        setFormData(defaultForm);
      }
      // Reset currency toggle to CNY on open
      setShippingCurrency('CNY');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'date' || name === 'productName' || name === 'sku' || name === 'shippingMethod' || name === 'warehouse' || name === 'imageUrl'
        ? value 
        : parseFloat(value) || 0
    }));
  };

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

  // Calculate display value based on selected currency
  const displayShippingPrice = shippingCurrency === 'CNY'
    ? formData.shippingUnitPriceCNY
    : parseFloat((formData.shippingUnitPriceCNY / EXCHANGE_RATE).toFixed(2));

  // Dynamic Volume Calculation for UI Feedback
  const boxVolCbm = (formData.boxLengthCm * formData.boxWidthCm * formData.boxHeightCm) / 1000000;
  const totalBoxes = formData.itemsPerBox > 0 ? Math.ceil(formData.quantity / formData.itemsPerBox) : 0;
  const totalVolCbm = boxVolCbm * totalBoxes;

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
    onSave({ ...formData, status });
    onClose();
  };

  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  
  const isAir = formData.shippingMethod === 'Air';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {initialData ? `编辑: ${initialData.sku}` : '新增备货计划'}
            </h2>
            <p className="text-sm text-gray-500">
              {initialData ? '完善箱规信息以获得更准确的体积计算' : '填写详细信息以计算精准利润'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm hover:shadow transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Section 1: Product Basic Info */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</span>
              <h3 className="text-base font-bold text-gray-800">产品基础信息</h3>
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
                    <label className={labelClass}>目的仓库</label>
                    <input type="text" name="warehouse" value={formData.warehouse} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>产品名称</label>
                    <input required type="text" placeholder="例如: MAD ACID" name="productName" value={formData.productName} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>SKU</label>
                    <input required type="text" placeholder="例如: MA-001" name="sku" value={formData.sku} onChange={handleChange} className={inputClass} />
                  </div>
              </div>
            </div>
          </div>

          {/* Section 2: Procurement & Packing (Combined for Flow) */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* 2a. Cost */}
             <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="text-sm font-bold text-gray-700">采购信息 (CNY)</h3>
                </div>
                <div>
                    <label className={labelClass}>备货数量 (个)</label>
                    <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>采购单价 (¥)</label>
                        <input required type="number" step="0.01" name="unitPriceCNY" value={formData.unitPriceCNY} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>单个重量 (KG)</label>
                        <input required type="number" step="0.001" name="unitWeightKg" value={formData.unitWeightKg} onChange={handleChange} className={inputClass} />
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
                        {totalBoxes} 箱 | {totalVolCbm.toFixed(3)} CBM
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
                <div>
                    <label className={labelClass}>每箱数量 (Pcs/Box)</label>
                    <div className="relative">
                        <Package className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input required type="number" name="itemsPerBox" value={formData.itemsPerBox} onChange={handleChange} className={`${inputClass} pl-10`} placeholder="例如: 20" />
                    </div>
                </div>
             </div>
          </div>

          {/* Section 4: Logistics */}
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
                 <div>
                    <label className={labelClass}>耗材/杂费 (¥)</label>
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
             </div>
          </div>

           {/* Section 5: Sales & TikTok Details */}
           <div className="space-y-4 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
             <div className="flex items-center gap-2 mb-2">
               <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs">5</span>
               <h3 className="text-sm font-bold text-gray-800">TikTok 销售与费用 (USD)</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>销售价格 ($)</label>
                  <input required type="number" step="0.01" name="salesPriceUSD" value={formData.salesPriceUSD} onChange={handleChange} className={`${inputClass} font-bold text-blue-600`} />
                </div>
                
                {/* TikTok Fees */}
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
                  <label className={labelClass}>尾程派送费 ($)</label>
                  <input required type="number" step="0.01" name="lastMileCostUSD" value={formData.lastMileCostUSD} onChange={handleChange} className={inputClass} />
                </div>
                <div>
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