import React, { useState, useEffect } from 'react';
import { Box, Calculator, Scale, AlertTriangle, Info, Grid3X3, Delete, Equal, Tag, DollarSign, Settings } from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';

export const CalculatorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tiktok' | 'freight' | 'standard'>('tiktok');
  
  // --- TikTok Reverse Calculator State ---
  const [tiktokForm, setTiktokForm] = useState({
    costCNY: 0,
    headHaulCNY: 0,
    lastMileUSD: 5,
    adUSD: 2,
    platformRate: 2, // 2%
    affiliateRate: 15, // 15%
    targetMargin: 20 // 20%
  });
  
  const [tiktokResult, setTiktokResult] = useState({
    suggestedPrice: 0,
    breakEvenPrice: 0,
    totalCostUSD: 0
  });

  useEffect(() => {
    // Logic: 
    // Price = Cost / (1 - Margin% - Platform% - Affiliate%)
    // Cost = Product + HeadHaul + LastMile + Ad
    
    const productCostUSD = tiktokForm.costCNY / EXCHANGE_RATE;
    const headHaulUSD = tiktokForm.headHaulCNY / EXCHANGE_RATE;
    const fixedCostUSD = productCostUSD + headHaulUSD + tiktokForm.lastMileUSD + tiktokForm.adUSD;

    const rateSum = (tiktokForm.platformRate + tiktokForm.affiliateRate + tiktokForm.targetMargin) / 100;
    const breakEvenRateSum = (tiktokForm.platformRate + tiktokForm.affiliateRate) / 100;

    let suggested = 0;
    let breakEven = 0;

    if (rateSum < 1) {
        suggested = fixedCostUSD / (1 - rateSum);
    }
    if (breakEvenRateSum < 1) {
        breakEven = fixedCostUSD / (1 - breakEvenRateSum);
    }

    setTiktokResult({
        suggestedPrice: suggested,
        breakEvenPrice: breakEven,
        totalCostUSD: fixedCostUSD
    });
  }, [tiktokForm]);

  const handleTikTokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTiktokForm({ ...tiktokForm, [e.target.name]: parseFloat(e.target.value) || 0 });
  };


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
      
      // Determine volumetric based on the selected divisor standard for costing
      const comparisonVolWeight = freightConfig.divisor === 6000 ? volW6000 : volW5000;
      
      // Traditional logic: Volumetric if VolWeight > RealWeight
      const isVolumetric = comparisonVolWeight > totalRealWeight;
      
      // Charged Weight for Costing
      const chargedWeight = Math.max(comparisonVolWeight, totalRealWeight);

      // Cost Calculation
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
            // Replace visual symbols with JS operators
            const evalStr = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
            // eslint-disable-next-line no-new-func
            const res = new Function('return ' + evalStr)();
            setLastResult(res.toString());
            setCalcDisplay(res.toString());
        } catch {
            setLastResult('Error');
        }
    } else {
        // If we just calculated a result and user types a number, start fresh. 
        // If they type an operator, continue with result.
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

  const inputClass = "block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const calcBtnClass = "h-14 rounded-xl text-lg font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center";
  const numBtnClass = `${calcBtnClass} bg-white text-gray-800 hover:bg-gray-50 border border-gray-200`;
  const opBtnClass = `${calcBtnClass} bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100`;
  const actionBtnClass = `${calcBtnClass} bg-red-50 text-red-500 hover:bg-red-100 border border-red-100`;
  const eqBtnClass = `${calcBtnClass} bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200`;

  return (
    <div className="space-y-6 animate-fade-in">
        
      {/* Tab Switcher */}
      <div className="bg-white p-1 rounded-xl inline-flex border border-gray-200 shadow-sm mb-2 overflow-x-auto max-w-full">
         <button 
           onClick={() => setActiveTab('tiktok')}
           className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'tiktok' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Tag size={16} />
            TikTok 定价反推
         </button>
         <button 
           onClick={() => setActiveTab('freight')}
           className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'freight' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Box size={16} />
            运费试算
         </button>
         <button 
           onClick={() => setActiveTab('standard')}
           className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'standard' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
         >
            <Grid3X3 size={16} />
            常规计算器
         </button>
      </div>
      
      {/* --- TikTok Pricing Reverse Calculator --- */}
      {activeTab === 'tiktok' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="bg-pink-100 p-2 rounded-lg text-pink-600">
                        <Tag size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">TikTok 成本参数</h3>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>采购成本 (¥)</label>
                            <input type="number" name="costCNY" value={tiktokForm.costCNY} onChange={handleTikTokChange} className={inputClass} placeholder="64" />
                        </div>
                        <div>
                            <label className={labelClass}>头程运费 (¥)</label>
                            <input type="number" name="headHaulCNY" value={tiktokForm.headHaulCNY} onChange={handleTikTokChange} className={inputClass} placeholder="10" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>尾程派送 ($)</label>
                            <input type="number" name="lastMileUSD" value={tiktokForm.lastMileUSD} onChange={handleTikTokChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>广告/其他 ($)</label>
                            <input type="number" name="adUSD" value={tiktokForm.adUSD} onChange={handleTikTokChange} className={inputClass} />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">佣金与利润设置</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>平台佣金 (%)</label>
                                <input type="number" name="platformRate" value={tiktokForm.platformRate} onChange={handleTikTokChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>达人佣金 (%)</label>
                                <input type="number" name="affiliateRate" value={tiktokForm.affiliateRate} onChange={handleTikTokChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>目标利润 (%)</label>
                                <input type="number" name="targetMargin" value={tiktokForm.targetMargin} onChange={handleTikTokChange} className={`${inputClass} border-green-300 ring-green-100 bg-green-50`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white rounded-2xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-10 translate-x-10"></div>
                
                <div>
                    <div className="flex items-center gap-2 mb-6 text-gray-300 relative z-10">
                        <Calculator size={20} />
                        <span className="font-semibold tracking-wide uppercase text-xs">定价建议 Suggestion</span>
                    </div>

                    <div className="mb-8 relative z-10">
                        <p className="text-slate-400 text-xs uppercase mb-1">建议零售价 (MSRP)</p>
                        <p className="text-5xl font-bold text-white font-mono tracking-tight">
                            ${tiktokResult.suggestedPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                            基于 {tiktokForm.targetMargin}% 净利润率计算
                        </p>
                    </div>

                    <div className="space-y-4 border-t border-slate-700 pt-6 relative z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">盈亏平衡价 (Break Even)</span>
                            <span className="font-mono text-lg text-orange-400">${tiktokResult.breakEvenPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">固定总成本 (Fixed Cost)</span>
                            <span className="font-mono text-lg text-slate-300">${tiktokResult.totalCostUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                             <span className="text-slate-400 text-sm">预估达人佣金</span>
                             <span className="font-mono text-sm text-pink-400">
                                 ${(tiktokResult.suggestedPrice * tiktokForm.affiliateRate / 100).toFixed(2)}
                             </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- Freight Calculator --- */}
      {activeTab === 'freight' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Box size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">货物参数输入</h3>
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
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
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
                                 <div className="flex rounded-md shadow-sm h-[42px]">
                                     <button
                                        onClick={() => handleFreightConfigChange('unit', 'kg')}
                                        className={`flex-1 flex items-center justify-center text-sm font-medium rounded-l-md border border-r-0 ${freightConfig.unit === 'kg' ? 'bg-blue-50 text-blue-600 border-blue-200 z-10' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                     >
                                        /KG
                                     </button>
                                     <button
                                        onClick={() => handleFreightConfigChange('unit', 'cbm')}
                                        className={`flex-1 flex items-center justify-center text-sm font-medium rounded-r-md border ${freightConfig.unit === 'cbm' ? 'bg-blue-50 text-blue-600 border-blue-200 z-10' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                     >
                                        /CBM
                                     </button>
                                 </div>
                             </div>
                        </div>
                        
                        {/* Divisor Toggle */}
                        <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Settings size={14} className="text-gray-400"/>
                                <span className="text-xs text-gray-600 font-medium">材积系数 (Divisor)</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleFreightConfigChange('divisor', 6000)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${freightConfig.divisor === 6000 ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    6000 (标准)
                                </button>
                                <button 
                                    onClick={() => handleFreightConfigChange('divisor', 5000)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${freightConfig.divisor === 5000 ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    5000 (快递)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Section */}
            <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white rounded-2xl p-8 shadow-xl flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-6 text-gray-300">
                        <Calculator size={20} />
                        <span className="font-semibold tracking-wide uppercase text-xs">计算结果 Analysis</span>
                    </div>

                    <div className="mb-6">
                        <p className="text-slate-400 text-xs uppercase mb-1">预估头程运费 (Est. Freight Cost)</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-bold text-white font-mono">¥{results.estimatedCost.toLocaleString()}</p>
                            <span className="text-sm text-slate-500 font-medium">
                                (≈ ${(results.estimatedCost / EXCHANGE_RATE).toFixed(2)})
                            </span>
                        </div>
                        <p className="text-xs text-blue-300 mt-2">
                            * 按 {freightConfig.unit === 'kg' ? '计费重 (Charged Weight)' : '体积 (CBM)'} 计算
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6 pt-6 border-t border-slate-700/50">
                        <div>
                            <p className="text-slate-400 text-xs uppercase mb-1">总体积 (Total Volume)</p>
                            <p className="text-2xl font-bold text-white font-mono">{results.cbm.toFixed(3)} <span className="text-sm text-slate-500">CBM</span></p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs uppercase mb-1">计费重建议 (Charged Wgt)</p>
                            <p className="text-2xl font-bold text-emerald-400 font-mono">{results.chargedWeight.toFixed(2)} <span className="text-sm text-emerald-700/70">kg</span></p>
                            <p className="text-[10px] text-slate-500 mt-0.5">系数: 1:{freightConfig.divisor}</p>
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-700/50 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">材积重 (Volumetric)</span>
                            <span className="font-mono text-base">{freightConfig.divisor === 6000 ? results.volWeight6000.toFixed(2) : results.volWeight5000.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">实际总重量 (Gross)</span>
                            <span className="font-mono text-base text-slate-300">{dims.weight * dims.quantity} kg</span>
                        </div>
                    </div>
                </div>

                <div className={`mt-6 p-3 rounded-xl flex items-center gap-3 ${results.isVolumetric ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30' : 'bg-blue-500/20 text-blue-200 border border-blue-500/30'}`}>
                    {results.isVolumetric ? <AlertTriangle size={20} /> : <Scale size={20} />}
                    <div>
                        <p className="font-bold text-sm">{results.isVolumetric ? '泡货 (Volumetric)' : '重货 (Heavy Cargo)'}</p>
                        <p className="text-[10px] opacity-80">
                            {results.isVolumetric 
                                ? '体积重大于实重，按体积重计费。' 
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
        <div className="max-w-md mx-auto">
            <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700">
                {/* Screen */}
                <div className="bg-gray-900 rounded-2xl p-6 mb-6 text-right h-32 flex flex-col justify-end shadow-inner border border-gray-800">
                    <div className="text-gray-500 text-sm h-6 font-mono mb-1">{lastResult}</div>
                    <div className="text-white text-4xl font-mono tracking-wider overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {calcDisplay || '0'}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-3">
                    <button onClick={() => handleCalcBtn('AC')} className={actionBtnClass}>AC</button>
                    <button onClick={() => handleCalcBtn('DEL')} className={actionBtnClass}><Delete size={20}/></button>
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
                    <button onClick={() => handleCalcBtn('=')} className={eqBtnClass}><Equal size={24}/></button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};