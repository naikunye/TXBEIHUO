
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Calculator, Scale, AlertTriangle, Grid3X3, Delete, Equal, Tag, DollarSign, Settings, Sliders, TrendingUp, RefreshCcw, Lock, Unlock, Target, LineChart, BarChart3, CloudRain } from 'lucide-react';
import { EXCHANGE_RATE } from '../constants';

const RangeSlider = ({ label, value, min, max, step, unit, onChange, colorClass, disabled = false }: any) => (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                {label}
                {disabled && <Lock size={10} />}
            </label>
            <span className={`text-sm font-bold font-mono ${colorClass}`}>{value} <span className="text-[10px] text-slate-500">{unit}</span></span>
        </div>
        <div className="relative h-2 bg-slate-700 rounded-full">
            <div className={`absolute top-0 left-0 h-full rounded-full opacity-50 ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${((value - min) / (max - min)) * 100}%` }}></div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={disabled}
            />
            <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none transition-all`} 
                style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 8px)` }}
            ></div>
        </div>
    </div>
);

export const CalculatorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'sensitivity' | 'freight' | 'standard'>('simulator');
  
  // Simulator State
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [simParams, setSimParams] = useState({
      salesPrice: 29.99, targetMargin: 30, productCostCNY: 45, shippingCostCNY: 35,
      adCpaUSD: 8, platformRate: 15, estimatedSales: 1000, exchangeRate: 7.3
  });

  const simResult = useMemo(() => {
      const { salesPrice, targetMargin, productCostCNY, shippingCostCNY, adCpaUSD, platformRate, estimatedSales, exchangeRate } = simParams;
      const cogsUSD = (productCostCNY + shippingCostCNY) / exchangeRate;
      let calculatedPrice = salesPrice;
      let profitPerUnit = 0; let totalCostPerUnit = 0;

      if (mode === 'forward') {
          const platformFee = salesPrice * (platformRate / 100);
          totalCostPerUnit = cogsUSD + adCpaUSD + platformFee;
          profitPerUnit = salesPrice - totalCostPerUnit;
      } else {
          const fixedCosts = cogsUSD + adCpaUSD;
          const denominator = 1 - (platformRate / 100) - (targetMargin / 100);
          calculatedPrice = denominator > 0.01 ? fixedCosts / denominator : 9999;
          const platformFee = calculatedPrice * (platformRate / 100);
          totalCostPerUnit = cogsUSD + adCpaUSD + platformFee;
          profitPerUnit = calculatedPrice - totalCostPerUnit;
      }
      return { 
          calculatedPrice, revenue: calculatedPrice * estimatedSales, totalProfit: profitPerUnit * estimatedSales,
          margin: mode === 'reverse' ? targetMargin : (calculatedPrice > 0 ? (profitPerUnit / calculatedPrice) * 100 : 0),
          roi: totalCostPerUnit > 0 ? (profitPerUnit / totalCostPerUnit) * 100 : 0,
          profitPerUnit, totalCostPerUnit 
      };
  }, [simParams, mode]);

  // Freight & Standard Calc State (Simplified for brevity)
  const [dims, setDims] = useState({ length: 0, width: 0, height: 0, weight: 0, quantity: 1 });
  const [freightConfig, setFreightConfig] = useState({ unitPrice: 0, unit: 'kg' as 'kg' | 'cbm', divisor: 6000 as 5000 | 6000 });
  const [freightResults, setFreightResults] = useState({ cbm: 0, volWeight6000: 0, isVolumetric: false, chargedWeight: 0, estimatedCost: 0 });
  const [calcDisplay, setCalcDisplay] = useState('');

  // Freight Effect
  useEffect(() => {
      const { length, width, height, weight, quantity } = dims;
      if (length > 0) {
          const vol = (length * width * height) / 1000000 * quantity;
          const volW = (length * width * height * quantity) / freightConfig.divisor;
          const realW = weight * quantity;
          const charged = Math.max(volW, realW);
          setFreightResults({ cbm: vol, volWeight6000: volW, isVolumetric: volW > realW, chargedWeight: charged, estimatedCost: freightConfig.unit === 'kg' ? charged * freightConfig.unitPrice : vol * freightConfig.unitPrice });
      }
  }, [dims, freightConfig]);

  const handleCalcBtn = (val: string) => {
      if(val === 'AC') setCalcDisplay(''); else if(val === '=') { try { setCalcDisplay(eval(calcDisplay).toString()) } catch{ setCalcDisplay('Error') } } else setCalcDisplay(p => p+val);
  };

  const inputClass = "block w-full rounded-xl border border-white/10 bg-black/20 text-white shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 p-3 font-mono text-sm";
  const btnClass = "h-14 rounded-xl text-lg font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center bg-slate-800 text-white hover:bg-slate-700 border border-white/5";

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Tab Switcher */}
      <div className="bg-slate-900 p-1.5 rounded-2xl inline-flex border border-white/10 shadow-lg overflow-x-auto max-w-full">
         {[
             { id: 'simulator', label: '利润模拟器 (Profit)', icon: Sliders },
             { id: 'freight', label: '运费计算 (Freight)', icon: Box },
             { id: 'standard', label: '计算器 (Calc)', icon: Grid3X3 },
         ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap uppercase tracking-wider ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-glow-cyan' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <tab.icon size={16} /> {tab.label}
             </button>
         ))}
      </div>
      
      {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Controls */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 text-glow">
                          <Target className="text-purple-400"/>
                          {mode === 'forward' ? '正向利润推演' : '反向定价推演'}
                      </h3>
                      <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
                          <button onClick={() => setMode('forward')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'forward' ? 'bg-slate-700 text-cyan-400 shadow' : 'text-slate-500'}`}>正推</button>
                          <button onClick={() => setMode('reverse')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'reverse' ? 'bg-slate-700 text-pink-400 shadow' : 'text-slate-500'}`}>反推</button>
                      </div>
                  </div>

                  <div className="space-y-8 relative z-10">
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                          {mode === 'forward' ? (
                              <RangeSlider label="销售定价 ($)" value={simParams.salesPrice} unit="" min={5} max={200} step={0.5} colorClass="text-cyan-400" onChange={(v: number) => setSimParams(p => ({...p, salesPrice: v}))} />
                          ) : (
                              <RangeSlider label="目标利润率 (%)" value={simParams.targetMargin} unit="" min={0} max={80} step={1} colorClass="text-pink-400" onChange={(v: number) => setSimParams(p => ({...p, targetMargin: v}))} />
                          )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <RangeSlider label="采购成本 (¥)" value={simParams.productCostCNY} unit="CNY" min={1} max={500} step={1} colorClass="text-orange-400" onChange={(v: number) => setSimParams(p => ({...p, productCostCNY: v}))} />
                              <RangeSlider label="头程运费 (¥)" value={simParams.shippingCostCNY} unit="CNY" min={0} max={200} step={1} colorClass="text-orange-400" onChange={(v: number) => setSimParams(p => ({...p, shippingCostCNY: v}))} />
                          </div>
                          <div className="space-y-6">
                              <RangeSlider label="广告成本 CPA ($)" value={simParams.adCpaUSD} unit="USD" min={0} max={50} step={0.5} colorClass="text-purple-400" onChange={(v: number) => setSimParams(p => ({...p, adCpaUSD: v}))} />
                              <RangeSlider label="平台费率 (%)" value={simParams.platformRate} unit="%" min={0} max={40} step={0.5} colorClass="text-purple-400" onChange={(v: number) => setSimParams(p => ({...p, platformRate: v}))} />
                          </div>
                      </div>
                  </div>
              </div>

              {/* Visualization */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className={`rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden bg-slate-900 border border-white/10 h-full flex flex-col justify-between`}>
                      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3 ${mode === 'forward' ? 'bg-cyan-500' : 'bg-pink-500'}`}></div>
                      
                      <div className="relative z-10">
                          <div className="text-right mb-6">
                              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest font-mono">
                                  {mode === 'forward' ? 'PROFIT MARGIN' : 'TARGET PRICE'}
                              </p>
                              {mode === 'forward' ? (
                                  <p className="text-4xl font-black text-glow">{simResult.margin.toFixed(1)}%</p>
                              ) : (
                                  <p className="text-4xl font-black text-pink-400 text-glow">${simResult.calculatedPrice.toFixed(2)}</p>
                              )}
                          </div>
                          <div>
                              <p className="text-xs font-bold opacity-60 mb-2 uppercase tracking-widest">{mode === 'forward' ? '预估总利润 (Total Profit)' : '建议售价 (Suggested Price)'}</p>
                              <p className="text-5xl font-black tracking-tight flex items-baseline gap-2 text-white">
                                  ${mode === 'forward' ? simResult.totalProfit.toLocaleString() : simResult.calculatedPrice.toFixed(2)}
                              </p>
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                          <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden flex shadow-inner mb-2">
                              <div style={{width: `${Math.min(100, (simResult.totalCostPerUnit / (mode === 'forward' ? simParams.salesPrice : simResult.calculatedPrice)) * 100)}%`}} className="h-full bg-white/20"></div>
                              <div style={{width: `${simResult.margin}%`}} className={`h-full ${mode === 'forward' ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-pink-500 shadow-[0_0_8px_#ec4899]'}`}></div>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono opacity-60">
                              <span>总成本: ${simResult.totalCostPerUnit.toFixed(2)}</span>
                              <span>单利: ${simResult.profitPerUnit.toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'freight' && (
        <div className="glass-panel p-8 rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h3 className="font-bold text-white flex items-center gap-2"><Box className="text-blue-400"/> 运费试算参数</h3>
                <div className="grid grid-cols-3 gap-4">
                    <input type="number" name="length" onChange={(e) => setDims({...dims, length: parseFloat(e.target.value)})} className={inputClass} placeholder="长 L (cm)" />
                    <input type="number" name="width" onChange={(e) => setDims({...dims, width: parseFloat(e.target.value)})} className={inputClass} placeholder="宽 W (cm)" />
                    <input type="number" name="height" onChange={(e) => setDims({...dims, height: parseFloat(e.target.value)})} className={inputClass} placeholder="高 H (cm)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" name="weight" onChange={(e) => setDims({...dims, weight: parseFloat(e.target.value)})} className={inputClass} placeholder="单箱重 Weight (kg)" />
                    <input type="number" name="quantity" value={dims.quantity} onChange={(e) => setDims({...dims, quantity: parseFloat(e.target.value)})} className={inputClass} placeholder="箱数 Qty" />
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                    <input type="number" value={freightConfig.unitPrice} onChange={(e) => setFreightConfig({...freightConfig, unitPrice: parseFloat(e.target.value)})} className={inputClass} placeholder="物流单价 (元/kg)" />
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => setFreightConfig({...freightConfig, divisor: 6000})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${freightConfig.divisor === 6000 ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-white/10 text-slate-500'}`}>6000 (红单)</button>
                        <button onClick={() => setFreightConfig({...freightConfig, divisor: 5000})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${freightConfig.divisor === 5000 ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'border-white/10 text-slate-500'}`}>5000 (快递)</button>
                    </div>
                </div>
            </div>
            <div className="bg-black/40 rounded-2xl p-6 flex flex-col justify-center border border-white/10 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">预估总运费</p>
                    <p className="text-5xl font-black text-white font-mono tracking-tighter text-glow">¥{freightResults.estimatedCost.toLocaleString()}</p>
                    <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">总体积 (CBM)</p>
                            <p className="text-xl font-mono text-white">{freightResults.cbm.toFixed(3)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">计费重 (Charged)</p>
                            <p className="text-xl font-mono text-cyan-400">{freightResults.chargedWeight.toFixed(2)} kg</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'standard' && (
        <div className="max-w-xs mx-auto py-10">
            <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-white/10">
                <div className="bg-black/50 rounded-xl p-4 mb-6 text-right h-24 flex flex-col justify-end">
                    <div className="text-white text-3xl font-mono overflow-hidden">{calcDisplay || '0'}</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {['AC','/','*','-', '7','8','9','+', '4','5','6','=', '1','2','3','0'].map(k => (
                        <button key={k} onClick={() => handleCalcBtn(k === '*' ? '*' : k)} className={`h-12 rounded-lg font-bold text-lg ${['AC','=','/','*','-','+'].includes(k) ? 'bg-cyan-600 text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                            {k}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
