
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Calculator, Scale, AlertTriangle, Grid3X3, Delete, Equal, Tag, DollarSign, Settings, Sliders, TrendingUp, RefreshCcw } from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';

// --- Helper Component: Range Slider ---
const RangeSlider = ({ label, value, min, max, step, unit, onChange, colorClass }: any) => (
    <div className="space-y-2">
        <div className="flex justify-between items-end">
            <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
            <span className={`text-sm font-bold font-mono ${colorClass}`}>{value} <span className="text-[10px] text-gray-400">{unit}</span></span>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
        />
    </div>
);

export const CalculatorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'freight' | 'standard'>('simulator');
  
  // --- Simulator State ---
  const [simParams, setSimParams] = useState({
      salesPrice: 29.99,
      productCostCNY: 45,
      shippingCostCNY: 35,
      adCpaUSD: 8,
      platformRate: 15, // %
      estimatedSales: 1000 // units
  });

  // Simulator Calculation
  const simResult = useMemo(() => {
      const { salesPrice, productCostCNY, shippingCostCNY, adCpaUSD, platformRate, estimatedSales } = simParams;
      
      const revenue = salesPrice * estimatedSales;
      const cogsUSD = (productCostCNY + shippingCostCNY) / EXCHANGE_RATE;
      const platformFee = salesPrice * (platformRate / 100);
      
      const totalCostPerUnit = cogsUSD + adCpaUSD + platformFee;
      const profitPerUnit = salesPrice - totalCostPerUnit;
      const totalProfit = profitPerUnit * estimatedSales;
      const margin = (profitPerUnit / salesPrice) * 100;
      const roi = (profitPerUnit / totalCostPerUnit) * 100;

      return { revenue, totalProfit, margin, roi, profitPerUnit, totalCostPerUnit };
  }, [simParams]);

  // --- Freight Calculator State ---
  const [dims, setDims] = useState({ length: 0, width: 0, height: 0, weight: 0, quantity: 1 });
  const [freightConfig, setFreightConfig] = useState({
    unitPrice: 0,
    unit: 'kg' as 'kg' | 'cbm',
    divisor: 6000 as 5000 | 6000
  });

  const [results, setResults] = useState({
    cbm: 0,
    volWeight5000: 0,
    volWeight6000: 0,
    isVolumetric: false,
    chargedWeight: 0,
    estimatedCost: 0
  });

  // --- Standard Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState('');
  const [lastResult, setLastResult] = useState('');

  // Freight Effect
  useEffect(() => {
    const { length, width, height, weight, quantity } = dims;
    if (length > 0 && width > 0 && height > 0) {
      const singleVolM3 = (length * width * height) / 1000000;
      const totalCbm = singleVolM3 * quantity;
      
      const volW5000 = (length * width * height * quantity) / 5000;
      const volW6000 = (length * width * height * quantity) / 6000;
      
      const totalRealWeight = weight * quantity;
      const comparisonVolWeight = freightConfig.divisor === 6000 ? volW6000 : volW5000;
      const isVolumetric = comparisonVolWeight > totalRealWeight;
      const chargedWeight = Math.max(comparisonVolWeight, totalRealWeight);

      let cost = 0;
      if (freightConfig.unit === 'kg') {
          cost = chargedWeight * freightConfig.unitPrice;
      } else {
          cost = totalCbm * freightConfig.unitPrice;
      }

      setResults({
        cbm: totalCbm,
        volWeight5000: volW5000,
        volWeight6000: volW6000,
        isVolumetric,
        chargedWeight,
        estimatedCost: cost
      });
    }
  }, [dims, freightConfig]);

  const handleFreightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDims({ ...dims, [e.target.name]: parseFloat(e.target.value) || 0 });
  };
  
  const handleFreightConfigChange = (name: string, value: any) => {
    setFreightConfig(prev => ({ ...prev, [name]: value }));
  };

  // Standard Calc Logic
  const handleCalcBtn = (val: string) => {
    if (val === 'AC') {
        setCalcDisplay('');
        setLastResult('');
    } else if (val === 'DEL') {
        setCalcDisplay(prev => prev.slice(0, -1));
    } else if (val === '=') {
        try {
            const evalStr = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
            // eslint-disable-next-line no-new-func
            const res = new Function('return ' + evalStr)();
            setLastResult(res.toString());
            setCalcDisplay(res.toString());
        } catch {
            setLastResult('Error');
        }
    } else {
        if (lastResult && !['+', '-', '×', '÷'].includes(val)) {
             if (calcDisplay === lastResult) {
                 setCalcDisplay(val);
                 setLastResult('');
                 return;
             }
        }
        setCalcDisplay(prev => prev + val);
    }
  };

  const inputClass = "block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 font-bold";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const calcBtnClass = "h-14 rounded-xl text-lg font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center";
  const numBtnClass = `${calcBtnClass} bg-white text-gray-800 hover:bg-gray-50 border border-gray-200`;
  const opBtnClass = `${calcBtnClass} bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100`;
  const actionBtnClass = `${calcBtnClass} bg-red-50 text-red-500 hover:bg-red-100 border border-red-100`;
  const eqBtnClass = `${calcBtnClass} bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200`;

  return (
    <div className="space-y-6 animate-fade-in">
        
      {/* Tab Switcher */}
      <div className="bg-white p-1.5 rounded-2xl inline-flex border border-gray-200 shadow-sm mb-2 overflow-x-auto max-w-full">
         <button 
           onClick={() => setActiveTab('simulator')}
           className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Sliders size={16} />
            利润沙盘推演
         </button>
         <button 
           onClick={() => setActiveTab('freight')}
           className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'freight' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Box size={16} />
            运费计算器
         </button>
         <button 
           onClick={() => setActiveTab('standard')}
           className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'standard' ? 'bg-slate-700 text-white shadow-lg shadow-slate-300' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Grid3X3 size={16} />
            通用计算器
         </button>
      </div>
      
      {/* --- Tab 1: Profit Simulator (New & Interactive) --- */}
      {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Controls */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Sliders className="text-indigo-600" /> 核心参数调节
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">拖动滑块，实时模拟利润变化趋势</p>
                      </div>
                      <button onClick={() => setSimParams({salesPrice: 29.99, productCostCNY: 45, shippingCostCNY: 35, adCpaUSD: 8, platformRate: 15, estimatedSales: 1000})} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 rounded-lg">
                          <RefreshCcw size={16} />
                      </button>
                  </div>

                  <div className="space-y-8">
                      {/* Product Section */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
                          <RangeSlider 
                              label="销售单价 (Price)" value={simParams.salesPrice} unit="$" min={5} max={200} step={0.5} colorClass="text-indigo-600"
                              onChange={(v: number) => setSimParams(p => ({...p, salesPrice: v}))}
                          />
                          <RangeSlider 
                              label="预估销量 (Volume)" value={simParams.estimatedSales} unit="pcs" min={100} max={10000} step={100} colorClass="text-slate-700"
                              onChange={(v: number) => setSimParams(p => ({...p, estimatedSales: v}))}
                          />
                      </div>

                      {/* Cost Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-6">
                              <RangeSlider 
                                  label="采购成本 (Product Cost)" value={simParams.productCostCNY} unit="¥" min={1} max={500} step={1} colorClass="text-orange-600"
                                  onChange={(v: number) => setSimParams(p => ({...p, productCostCNY: v}))}
                              />
                              <RangeSlider 
                                  label="头程运费 (Shipping)" value={simParams.shippingCostCNY} unit="¥" min={0} max={200} step={1} colorClass="text-orange-600"
                                  onChange={(v: number) => setSimParams(p => ({...p, shippingCostCNY: v}))}
                              />
                          </div>
                          <div className="space-y-6">
                              <RangeSlider 
                                  label="广告成本 (CPA)" value={simParams.adCpaUSD} unit="$" min={0} max={50} step={0.5} colorClass="text-pink-600"
                                  onChange={(v: number) => setSimParams(p => ({...p, adCpaUSD: v}))}
                              />
                              <RangeSlider 
                                  label="综合费率 (Fees)" value={simParams.platformRate} unit="%" min={0} max={40} step={0.5} colorClass="text-purple-600"
                                  onChange={(v: number) => setSimParams(p => ({...p, platformRate: v}))}
                              />
                          </div>
                      </div>
                  </div>
              </div>

              {/* Visualization */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Big Number Card */}
                  <div className={`rounded-3xl p-8 shadow-xl text-white transition-all duration-500 ${simResult.totalProfit > 0 ? 'bg-gradient-to-br from-indigo-600 to-purple-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                              <TrendingUp size={28} className="text-white" />
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Net Profit Margin</p>
                              <p className="text-3xl font-black">{simResult.margin.toFixed(1)}%</p>
                          </div>
                      </div>
                      <div>
                          <p className="text-sm font-medium opacity-80 mb-1">预估总净利 (Total Net Profit)</p>
                          <p className="text-5xl font-black tracking-tight flex items-baseline gap-2">
                              ${simResult.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                          </p>
                      </div>
                      
                      {/* Mini Bar Breakdown */}
                      <div className="mt-8 pt-6 border-t border-white/20">
                          <div className="flex text-xs mb-2 justify-between font-bold opacity-90">
                              <span>Revenue</span>
                              <span>${simResult.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden flex">
                              <div style={{width: `${(simResult.totalCostPerUnit / simParams.salesPrice) * 100}%`}} className="h-full bg-white/40"></div>
                              <div style={{width: `${simResult.margin}%`}} className="h-full bg-white"></div>
                          </div>
                          <div className="flex justify-between text-[10px] mt-1 opacity-60">
                              <span>Cost (${simResult.totalCostPerUnit.toFixed(2)}/u)</span>
                              <span>Profit (${simResult.profitPerUnit.toFixed(2)}/u)</span>
                          </div>
                      </div>
                  </div>

                  {/* ROI Gauge (Simulated CSS) */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"></div>
                      
                      <div className="relative w-48 h-24 mt-4 overflow-hidden">
                          <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-slate-100 border-b-0"></div>
                          <div 
                            className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-indigo-500 border-l-transparent border-r-transparent border-b-transparent transition-all duration-700 ease-out"
                            style={{ transform: `rotate(${(Math.min(simResult.roi, 200) / 200) * 180 - 135}deg)` }}
                          ></div>
                      </div>
                      
                      <div className="text-center -mt-8 relative z-10">
                          <p className="text-4xl font-black text-slate-800">{simResult.roi.toFixed(0)}<span className="text-lg text-slate-400">%</span></p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ROI (回报率)</p>
                      </div>

                      <div className="mt-6 flex gap-4 text-xs text-center w-full justify-center">
                          <div className={`px-4 py-2 rounded-lg font-bold ${simResult.roi > 30 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              High ROI
                          </div>
                          <div className={`px-4 py-2 rounded-lg font-bold ${simResult.roi < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                              Risk
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- Tab 2: Freight Calculator --- */}
      {activeTab === 'freight' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <Box size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">货物参数输入</h3>
                    <p className="text-xs text-gray-400">输入箱规与重量，自动计算体积重</p>
                </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Dims */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>长 (cm)</label>
                                <input type="number" name="length" onChange={handleFreightChange} className={inputClass} placeholder="0" />
                            </div>
                            <div>
                                <label className={labelClass}>宽 (cm)</label>
                                <input type="number" name="width" onChange={handleFreightChange} className={inputClass} placeholder="0" />
                            </div>
                            <div>
                                <label className={labelClass}>高 (cm)</label>
                                <input type="number" name="height" onChange={handleFreightChange} className={inputClass} placeholder="0" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>单箱实重 (kg)</label>
                                <input type="number" name="weight" onChange={handleFreightChange} className={inputClass} placeholder="0" />
                            </div>
                            <div>
                                <label className={labelClass}>箱数 (ctns)</label>
                                <input type="number" name="quantity" value={dims.quantity} onChange={handleFreightChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Pricing Config */}
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-700">
                             <DollarSign size={16} className="text-blue-500"/>
                             费用设置
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className={labelClass}>物流单价 (¥)</label>
                                 <input 
                                    type="number" 
                                    value={freightConfig.unitPrice} 
                                    onChange={(e) => handleFreightConfigChange('unitPrice', parseFloat(e.target.value) || 0)} 
                                    className={inputClass} 
                                    placeholder="0" 
                                 />
                             </div>
                             <div>
                                 <label className={labelClass}>计费单位</label>
                                 <div className="flex rounded-lg shadow-sm h-[42px]">
                                     <button
                                        onClick={() => handleFreightConfigChange('unit', 'kg')}
                                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-l-lg border border-r-0 transition-all ${freightConfig.unit === 'kg' ? 'bg-blue-600 text-white border-blue-600 z-10' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                     >
                                        /KG
                                     </button>
                                     <button
                                        onClick={() => handleFreightConfigChange('unit', 'cbm')}
                                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-r-lg border transition-all ${freightConfig.unit === 'cbm' ? 'bg-blue-600 text-white border-blue-600 z-10' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                     >
                                        /CBM
                                     </button>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Divisor Toggle */}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings size={14} className="text-gray-400"/>
                                <span className="text-xs text-gray-500 font-bold">材积系数</span>
                            </div>
                            <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
                                <button 
                                    onClick={() => handleFreightConfigChange('divisor', 6000)}
                                    className={`text-xs px-3 py-1.5 rounded-md transition-all ${freightConfig.divisor === 6000 ? 'bg-slate-800 text-white font-bold shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    6000 (标准)
                                </button>
                                <button 
                                    onClick={() => handleFreightConfigChange('divisor', 5000)}
                                    className={`text-xs px-3 py-1.5 rounded-md transition-all ${freightConfig.divisor === 5000 ? 'bg-slate-800 text-white font-bold shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    5000 (快递)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8 text-gray-400">
                        <Calculator size={20} />
                        <span className="font-bold tracking-widest uppercase text-xs">计算结果 Analysis</span>
                    </div>

                    <div className="mb-8">
                        <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">预估头程运费</p>
                        <div className="flex items-baseline gap-3">
                            <p className="text-5xl font-black text-white tracking-tight">¥{results.estimatedCost.toLocaleString()}</p>
                            <span className="text-lg text-slate-500 font-medium">
                                (≈ ${(results.estimatedCost / EXCHANGE_RATE).toFixed(2)})
                            </span>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] text-blue-200 border border-white/5 backdrop-blur-md">
                            <Tag size={10} />
                            按 {freightConfig.unit === 'kg' ? '计费重 (Charged Weight)' : '体积 (CBM)'} 计算
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 pt-8 border-t border-white/10">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">总体积</p>
                            <p className="text-2xl font-bold text-white font-mono">{results.cbm.toFixed(3)} <span className="text-sm text-slate-500">CBM</span></p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">计费重</p>
                            <p className="text-2xl font-bold text-emerald-400 font-mono">{results.chargedWeight.toFixed(2)} <span className="text-sm text-emerald-500/70">kg</span></p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">材积重 (Volumetric)</span>
                            <span className="font-mono font-medium">{freightConfig.divisor === 6000 ? results.volWeight6000.toFixed(2) : results.volWeight5000.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">实际总重 (Gross)</span>
                            <span className="font-mono font-medium text-slate-300">{dims.weight * dims.quantity} kg</span>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 p-4 rounded-xl flex items-center gap-4 relative z-10 ${results.isVolumetric ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30' : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'}`}>
                    <div className={`p-2 rounded-lg ${results.isVolumetric ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                        {results.isVolumetric ? <AlertTriangle size={20} /> : <Scale size={20} />}
                    </div>
                    <div>
                        <p className="font-bold text-sm">{results.isVolumetric ? '⚠️ 泡货 (Volumetric)' : '✅ 重货 (Heavy Cargo)'}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">
                            {results.isVolumetric 
                                ? '体积重大于实重，建议优化包装体积。' 
                                : '实重大于体积重，按实重计费。'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )} 
      
      {/* --- Standard Calculator --- */}
      {activeTab === 'standard' && (
        <div className="max-w-md mx-auto py-10">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-4 border-slate-800 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-800 rounded-b-xl"></div>
                
                {/* Screen */}
                <div className="bg-slate-950 rounded-2xl p-6 mb-8 text-right h-40 flex flex-col justify-end shadow-inner border border-slate-800/50">
                    <div className="text-slate-500 text-sm h-6 font-mono mb-2">{lastResult}</div>
                    <div className="text-white text-5xl font-mono tracking-wider overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {calcDisplay || '0'}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-4">
                    <button onClick={() => handleCalcBtn('AC')} className={actionBtnClass}>AC</button>
                    <button onClick={() => handleCalcBtn('DEL')} className={actionBtnClass}><Delete size={24}/></button>
                    <button onClick={() => handleCalcBtn('%')} className={opBtnClass}>%</button>
                    <button onClick={() => handleCalcBtn('÷')} className={opBtnClass}>÷</button>

                    <button onClick={() => handleCalcBtn('7')} className={numBtnClass}>7</button>
                    <button onClick={() => handleCalcBtn('8')} className={numBtnClass}>8</button>
                    <button onClick={() => handleCalcBtn('9')} className={numBtnClass}>9</button>
                    <button onClick={() => handleCalcBtn('×')} className={opBtnClass}>×</button>

                    <button onClick={() => handleCalcBtn('4')} className={numBtnClass}>4</button>
                    <button onClick={() => handleCalcBtn('5')} className={numBtnClass}>5</button>
                    <button onClick={() => handleCalcBtn('6')} className={numBtnClass}>6</button>
                    <button onClick={() => handleCalcBtn('-')} className={opBtnClass}>-</button>

                    <button onClick={() => handleCalcBtn('1')} className={numBtnClass}>1</button>
                    <button onClick={() => handleCalcBtn('2')} className={numBtnClass}>2</button>
                    <button onClick={() => handleCalcBtn('3')} className={numBtnClass}>3</button>
                    <button onClick={() => handleCalcBtn('+')} className={opBtnClass}>+</button>

                    <button onClick={() => handleCalcBtn('0')} className={`${numBtnClass} col-span-2`}>0</button>
                    <button onClick={() => handleCalcBtn('.')} className={numBtnClass}>.</button>
                    <button onClick={() => handleCalcBtn('=')} className={eqBtnClass}><Equal size={28}/></button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
