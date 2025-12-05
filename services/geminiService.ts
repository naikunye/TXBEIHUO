import { GoogleGenAI } from "@google/genai";
import { ReplenishmentRecord } from "../types";
import { calculateMetrics } from "../utils/calculations";

export const analyzeInventory = async (records: ReplenishmentRecord[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare a summary of the data for the AI to process lightweight
    const dataSummary = records.map(r => {
      const metrics = calculateMetrics(r);
      return {
        product: r.productName,
        shipping: r.shippingMethod === 'Air' ? '空运' : '海运',
        qty: r.quantity,
        profitPerUnit: metrics.estimatedProfitUSD.toFixed(2),
        margin: metrics.marginRate.toFixed(1) + '%',
        roi: metrics.roi.toFixed(1) + '%',
        headHaulCost: metrics.singleHeadHaulCostUSD.toFixed(2),
        totalInvestmentCNY: (metrics.firstLegCostCNY + (r.quantity * r.unitPriceCNY)).toFixed(0),
        warehouse: r.warehouse
      };
    });

    const prompt = `
      你是一位服务于"探行科技"的专业跨境电商供应链分析师。
      请分析以下的备货计划数据 (JSON格式)。
      
      数据: ${JSON.stringify(dataSummary)}

      任务：请提供一份可视化的战略分析报告。
      
      **要求：**
      1. 直接输出 HTML 代码。
      2. **不要**包含 \`\`\`html 或 markdown 代码块标记。
      3. 使用 Tailwind CSS 类名来美化排版。
      4. 包含以下四个板块：
         - **利润领跑** (使用 emerald/green 色系): 识别利润表现最好的产品，关注高 ROI 和 高毛利。
         - **风险预警** (使用 red/orange 色系): 指出 ROI 过低（<30%）或 毛利率过低（<15%）的产品。
         - **物流优化** (使用 blue/indigo 色系): 针对头程运费过高的空运产品提出海运建议，或指出物流成本占比过高的情况。
         - **资金与库存** (使用 purple/gray 色系): 基于总投入资金(totalInvestmentCNY)和 ROI 提出资金周转建议。

      HTML 结构参考范例：
      <div class="space-y-6">
         <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <h4 class="font-bold text-emerald-800 flex items-center gap-2 text-lg">
               <!-- Icon here if you want -->
               🏆 利润领跑
            </h4>
            <div class="mt-2 text-sm text-emerald-700 space-y-1">
               <p>...</p>
            </div>
         </div>
         <!-- 重复其他板块 -->
      </div>
      
      请保持专业、简洁的语调，用中文回答。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return `
      <div class="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700">
        <h4 class="font-bold">分析服务暂时不可用</h4>
        <p class="text-sm mt-1">请检查 API_KEY 环境变量配置。</p>
      </div>
    `;
  }
};