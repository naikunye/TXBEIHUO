
import React from 'react';
import { ReplenishmentRecord } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { TrendingUp, TrendingDown, DollarSign, Package, Zap } from 'lucide-react';

interface AnalyticsDashboardProps {
  records: ReplenishmentRecord[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ records }) => {
  // Data Preparation
  const chartData = records.map(r => {
    const m = calculateMetrics(r);
    return {
      name: r.productName,
      sku: r.sku,
      profit: m.estimatedProfitUSD,
      revenue: r.salesPriceUSD,
      cost: m.totalCostPerUnitUSD,
      shipping: m.singleHeadHaulCostUSD,
      margin: m.marginRate
    };
  });

  const maxProfit = Math.max(...chartData.map(d => d.profit), 1);
  const maxCost = Math.max(...chartData.map(d => d.cost), 1);

  // Aggregates for Logistics
  const logisticsData = records.reduce((acc, curr) => {
    const m = calculateMetrics(curr);
    const method = curr.shippingMethod;
    if (!acc[method]) acc[method] = { weight: 0, cost: 0, count: 0 };
    acc[method].weight += m.totalWeightKg;
    acc[method].cost += m.firstLegCostCNY;
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { weight: number, cost: number, count: number }>);

  // Aggregates for Lifecycle
  const lifecycleCounts = records.reduce((acc, curr) => {
      const stage = curr.lifecycle || 'New';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  const totalRecords = records.length;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Lifecycle Breakdown (New Chart) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
         <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="text-purple-600 h-5 w-5" />
            产品生命周期分布
          </h3>
          <div className="grid grid-cols-4 gap-4">
              {['New', 'Growth', 'Stable', 'Clearance'].map((stage) => {
                  const count = lifecycleCounts[stage] || 0;
                  const pct = totalRecords > 0 ? (count / totalRecords) * 100 : 0;
                  let colorClass = '';
                  let label = '';
                  switch(stage) {
                      case 'New': colorClass = 'bg-blue-500'; label = '新品推广'; break;
                      case 'Growth': colorClass = 'bg-emerald-500'; label = '高速增长'; break;
                      case 'Stable': colorClass = 'bg-indigo-500'; label = '稳定热卖'; break;
                      case 'Clearance': colorClass = 'bg-red-500'; label = '尾货清仓'; break;
                  }

                  return (
                      <div key={stage} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-wide">{label}</span>
                          <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold text-gray-800">{count}</span>
                              <span className="text-xs text-gray-400 mb-1">SKUs</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                              <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${pct}%` }}></div>
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Profitability Landscape */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-green-600 h-5 w-5" />
            单品净利润分析 (Net Profit)
          </h3>
          <div className="space-y-5">
            {chartData.map((item, idx) => (
              <div key={idx} className="relative group">
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span className="text-gray-700 w-32 truncate" title={item.name}>{item.sku}</span>
                  <div className="flex gap-4">
                     <span className="text-gray-500 text-xs">总成本: ${item.cost.toFixed(2)}</span>
                     <span className={item.profit > 0 ? "text-green-600" : "text-red-500"}>
                        利润: ${item.profit.toFixed(2)}
                     </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden flex">
                   {/* Cost Bar */}
                   <div 
                      className="bg-gray-400 h-full opacity-30" 
                      style={{ width: `${(item.cost / (item.cost + Math.abs(item.profit))) * 100}%` }}
                   ></div>
                   {/* Profit Bar */}
                   <div 
                      className={`h-full transition-all duration-500 ${item.profit > 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${(Math.abs(item.profit) / (item.cost + Math.abs(item.profit))) * 100}%` }}
                   ></div>
                </div>
                <div className="flex justify-between mt-1">
                   <span className="text-[10px] text-gray-400">毛利率: {item.margin.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Cost Structure Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <DollarSign className="text-blue-600 h-5 w-5" />
            TikTok 成本结构拆解
          </h3>
          <div className="space-y-6">
            {records.map((r, idx) => {
              const m = calculateMetrics(r);
              const total = m.totalCostPerUnitUSD;
              
              const p_prod = (m.productCostUSD / total) * 100;
              const p_ship = (m.singleHeadHaulCostUSD / total) * 100;
              const p_last = (r.lastMileCostUSD / total) * 100;
              const p_fees = ((m.platformFeeUSD + m.affiliateCommissionUSD + (r.additionalFixedFeeUSD || 0)) / total) * 100;
              const p_loss = (m.returnLossProvisionUSD / total) * 100;
              // Remaining is Ad or adjust
              const p_ad = (r.adCostUSD / total) * 100;


              return (
                <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-gray-700">{r.productName}</span>
                    <span className="text-gray-500">总成本: ${total.toFixed(2)}</span>
                  </div>
                  <div className="flex h-6 rounded-md overflow-hidden text-[10px] font-bold text-white leading-6 text-center shadow-inner">
                    <div style={{ width: `${p_prod}%` }} className="bg-blue-500" title={`货值: $${m.productCostUSD.toFixed(2)}`}>货</div>
                    <div style={{ width: `${p_ship}%` }} className="bg-orange-400" title={`头程: $${m.singleHeadHaulCostUSD.toFixed(2)}`}>头</div>
                    <div style={{ width: `${p_last}%` }} className="bg-purple-400" title={`尾程: $${r.lastMileCostUSD.toFixed(2)}`}>尾</div>
                    <div style={{ width: `${p_fees}%` }} className="bg-pink-500" title={`佣金: $${(m.platformFeeUSD + m.affiliateCommissionUSD + (r.additionalFixedFeeUSD||0)).toFixed(2)}`}>佣</div>
                    <div style={{ width: `${p_loss}%` }} className="bg-red-400" title={`退货损耗: $${m.returnLossProvisionUSD.toFixed(2)}`}>损</div>
                    <div style={{ width: `${p_ad}%` }} className="bg-gray-400" title={`广告: $${r.adCostUSD.toFixed(2)}`}>广</div>
                  </div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>货值</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div>头程</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div>佣金</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>退货损耗</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logistics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-indigo-900 font-bold">空运 (Air) 统计</h4>
              <Package className="text-indigo-400 h-6 w-6" />
           </div>
           <div className="flex gap-8">
              <div>
                <p className="text-xs text-indigo-500 uppercase font-semibold">总重量</p>
                <p className="text-2xl font-bold text-indigo-900">{logisticsData['Air']?.weight.toFixed(1) || 0} <span className="text-sm text-indigo-400">kg</span></p>
              </div>
              <div>
                <p className="text-xs text-indigo-500 uppercase font-semibold">头程总花费</p>
                <p className="text-2xl font-bold text-indigo-900">¥{logisticsData['Air']?.cost.toLocaleString() || 0}</p>
              </div>
           </div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-teal-900 font-bold">海运 (Sea) 统计</h4>
              <Package className="text-teal-400 h-6 w-6" />
           </div>
           <div className="flex gap-8">
              <div>
                <p className="text-xs text-teal-500 uppercase font-semibold">总重量</p>
                <p className="text-2xl font-bold text-teal-900">{logisticsData['Sea']?.weight.toFixed(1) || 0} <span className="text-sm text-teal-400">kg</span></p>
              </div>
              <div>
                <p className="text-xs text-teal-500 uppercase font-semibold">头程总花费</p>
                <p className="text-2xl font-bold text-teal-900">¥{logisticsData['Sea']?.cost.toLocaleString() || 0}</p>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
};
