
import { GoogleGenAI } from "@google/genai";
import { ReplenishmentRecord } from "../types";
import { calculateMetrics } from "../utils/calculations";

const getAiClient = () => {
  // Use a fallback or env key. Ideally, this comes from process.env.API_KEY
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to format error messages
const formatErrorHtml = (error: any, serviceName: string) => {
    const errString = error.toString();
    let title = "分析服务暂时中断";
    let message = "AI 响应超时或连接不稳定，请稍后重试。";
    let solution = "请检查网络连接或 API Key 配置。";
    let colorClass = "red";

    if (errString.includes("401") || errString.includes("API key not valid")) {
        title = "API Key 无效或未配置";
        message = "系统无法连接到 Google Gemini 服务。";
        solution = "请确认环境变量 API_KEY 已正确设置且未过期。";
    } else if (errString.includes("429") || errString.includes("quota")) {
        title = "AI 调用额度已耗尽";
        message = "当前 API Key 的调用配额已达上限 (Quota Exceeded)。";
        solution = "请升级 API 套餐或等待配额重置。";
        colorClass = "amber";
    } else if (errString.includes("503") || errString.includes("overloaded")) {
        title = "AI 服务繁忙";
        message = "Google Gemini 服务当前负载过高。";
        solution = "请稍等 1-2 分钟后再次尝试。";
        colorClass = "orange";
    } else if (errString.includes("500")) {
        title = "AI 服务内部错误";
        message = "模型处理请求时发生未知错误。";
        solution = "请尝试减少请求的数据量重试。";
    }

    // Return a styled HTML card
    return `
      <div class="bg-${colorClass}-50 p-6 rounded-xl border border-${colorClass}-200 text-${colorClass}-800 shadow-sm">
        <div class="flex items-center gap-3 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-${colorClass}-600"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <h4 class="font-bold text-lg">${title}</h4>
        </div>
        <p class="text-sm font-medium mb-1">${message}</p>
        <p class="text-xs opacity-80 bg-${colorClass}-100/50 p-2 rounded inline-block">💡 建议: ${solution}</p>
        <p class="text-[10px] text-${colorClass}-400 mt-2 font-mono">Service: ${serviceName}</p>
      </div>
    `;
};

// Simplify data for AI token limit efficiency
const prepareDataContext = (records: ReplenishmentRecord[]) => {
  return records.map(r => {
    const m = calculateMetrics(r);
    return {
      name: r.productName,
      sku: r.sku,
      lifecycle: r.lifecycle || 'New', // Added lifecycle
      status: r.status,
      stock: r.quantity,
      dailySales: r.dailySales,
      dos: m.daysOfSupply.toFixed(0),
      shipping: r.shippingMethod,
      profit: m.estimatedProfitUSD.toFixed(1),
      margin: m.marginRate.toFixed(1) + '%', 
      roi: m.roi.toFixed(0) + '%',
      stockStatus: m.stockStatus,
      // Additions for Ad Strategy
      price: r.salesPriceUSD,
      affiliateRate: r.affiliateCommissionRate + '%' 
    };
  });
};

export const analyzeInventory = async (records: ReplenishmentRecord[]) => {
  try {
    const ai = getAiClient();
    const dataSummary = prepareDataContext(records);

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
         - **风险预警** (使用 red/orange 色系): 指出 ROI 过低（<30%）或 毛利率过低（<15%）的产品，或者库存周转天数(dos)过低(<15天)的产品。
         - **物流优化** (使用 blue/indigo 色系): 针对头程运费过高的空运产品提出海运建议，或指出物流成本占比过高的情况。
         - **资金与库存** (使用 purple/gray 色系): 基于库存周转状态(stockStatus)提出建议。

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
    return formatErrorHtml(error, "Inventory Analysis");
  }
};

export const analyzeLogisticsChannels = async (records: ReplenishmentRecord[]) => {
  try {
    const ai = getAiClient();
    // Prepare data focused on logistics metrics
    const dataSummary = records.map(r => {
      const m = calculateMetrics(r);
      return {
        sku: r.sku,
        name: r.productName,
        qty: r.quantity,
        totalWeightKg: m.totalWeightKg.toFixed(1),
        totalVolumeCbm: m.totalVolumeCbm.toFixed(3),
        currentMethod: r.shippingMethod,
        shippingCostCNY: m.firstLegCostCNY.toFixed(0),
        productValueCNY: (r.quantity * r.unitPriceCNY).toFixed(0),
        logisticsRatio: ((m.firstLegCostCNY / ((r.quantity * r.unitPriceCNY) || 1)) * 100).toFixed(1) + '%',
        turnoverDays: m.daysOfSupply.toFixed(0)
      };
    });

    const prompt = `
      你是一位资深的跨境电商物流专家，专注于头程物流渠道优化 (Head Haul Optimization)。
      请根据以下产品的物流属性（重量、体积）、货值占比和周转情况，生成一份《头程物流渠道优选报告》。

      数据摘要: ${JSON.stringify(dataSummary)}

      **分析逻辑与目标：**
      1. **降本增效 (空转海)**: 找出当前走空运 (Air)，但物流成本占比过高(>30%)、重量/体积较大、或者非急缺货(周转>45天)的产品，强烈建议转为海运 (Sea)。计算预计节省金额。
      2. **时效保障 (海转空)**: 找出当前走海运 (Sea)，但库存告急(<15天)或新品测款(qty<50)的产品，建议紧急切换空运 (Air) 以防断货。
      3. **泡重优化**: 识别体积大但重量轻的产品，建议优化包装。
      4. **拼箱建议**: 如果总 CBM 较大(>5 CBM)，给出拼箱(LCL)或整柜建议。

      **输出要求：**
      1. 直接输出 HTML 代码，不包含 Markdown 标记。
      2. 使用 Tailwind CSS 美化，主色调使用 Cyan/Sky/Blue，体现"物流"与"速度"感。
      3. 使用表格或卡片形式列出具体的 SKU 建议。
      
      HTML 结构参考：
      <div class="space-y-6">
         <!-- 概览卡片 -->
         <div class="bg-cyan-50 p-5 rounded-xl border border-cyan-100 shadow-sm">
             <h4 class="font-bold text-cyan-800 flex items-center gap-2 text-lg mb-3">
               🚢 物流优化概览
             </h4>
             <p class="text-sm text-cyan-700">...</p>
         </div>
         
         <!-- 建议列表 -->
         <div class="grid grid-cols-1 gap-4">
            <!-- Item -->
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
               <div class="bg-blue-100 text-blue-600 p-2 rounded-lg font-bold text-xs">建议海运</div>
               <div>
                  <h5 class="font-bold text-gray-800">SKU: ...</h5>
                  <p class="text-xs text-gray-500 mt-1">原因: 物流成本占比 40%，且库存充足...</p>
               </div>
            </div>
         </div>
      </div>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Logistics Analysis Failed:", error);
    return formatErrorHtml(error, "Logistics Optimization");
  }
};

export const generateAdStrategy = async (records: ReplenishmentRecord[]) => {
  try {
    const ai = getAiClient();
    const dataSummary = prepareDataContext(records);

    const prompt = `
      你是一位资深的 TikTok Shop 美国站运营专家 (TikTok Ad Strategist)。
      请根据以下产品的**生命周期 (lifecycle)**、利润空间 (Margin/ROI) 和库存周转 (DOS)，制定精准的广告投放与达人营销策略。
      
      数据: ${JSON.stringify(dataSummary)}

      任务：输出一份可视化的《TikTok Shop 阶段性投放策略报告》 (HTML格式)。

      **分析维度与策略逻辑：**
      
      1. **新品测款期 (New)**
         - **核心目标**: 验证素材 CTR (点击率) 和商品 CVR (转化率)。
         - **广告策略**: 
           - 预算建议: $30-50/天/SKU。
           - 投放设置: 开启 ACO (Automated Creative Optimization)，受众选择 Broad (通投) + 1-2个核心兴趣词。
           - 达人配合: 建议寄样给 KOC (1k-10k粉) 铺量，佣金设置参考当前产品的 affiliateRate。
         - **素材方向**: "痛点解决" (Problem-Solution)、"开箱展示" (Unboxing)。

      2. **爆品成长期 (Growth)**
         - **核心目标**: 扩量 (Scale) 并压低 CPA。
         - **广告策略**: 
           - 预算建议: 若 ROI > 2.5，每48小时增加20%预算。
           - 投放设置: 创建 LAL (相似受众) 1-3%，开启 Retargeting (观看>50% / 加购未支付)。
           - 达人配合: 寻找中腰部达人 (Mid-tier)，利用 Spark Ads 投流优质达人视频。
         - **素材方向**: 社交背书 (Social Proof)、限时折扣 (FOMO)、回复评论视频。

      3. **稳定盈利期 (Stable)**
         - **核心目标**: 利润最大化，维持 ROAS。
         - **广告策略**: 
           - 预算建议: 维持稳定，监控频次 (Frequency) 防止素材疲劳。
           - 投放设置: 侧重 VSA (Video Shopping Ads) 和商城流量 (Shop Tab Ads)。
         - **素材方向**: 产品细节质感 (ASMR)、多场景使用展示。

      4. **库存清仓期 (Clearance)**
         - **核心目标**: 现金流回笼，快速出清。
         - **广告策略**: 
           - 预算建议: 激进出价，降低 ROAS 预期。
           - 投放设置: 配合店铺 Flash Sale (秒杀) 活动投放。
         - **素材方向**: "Last Chance", "Huge Discount", "Don't Miss Out".

      **输出要求：**
      1. 直接输出 HTML 代码，不要 Markdown 标记。
      2. 使用 Tailwind CSS 设计卡片式布局。使用 TikTok 品牌色 (黑色、白色、电光蓝 #00f2ea、故障粉 #ff0050)。
      3. **必须针对数据中的具体产品 (SKU) 给出建议**。
         - 例如：如果某产品 ROI 高但库存少，建议"控量保利"；如果库存 DOS 高 (>90天)，建议"加大清仓预算"。
      4. 结构参考：
         - 总体仪表盘 (Total Dashboard)
         - 分阶段策略卡片 (Cards by Lifecycle)

      HTML 结构参考：
      <div class="space-y-8">
         <!-- 新品板块 -->
         <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1.5 h-full bg-[#00f2ea]"></div>
            <h4 class="font-bold text-gray-900 flex items-center gap-2 text-xl mb-4">
               🌱 新品测试策略 (New Products)
            </h4>
            <!-- SKU List -->
         </div>
         
         <!-- 增长板块 -->
         <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white relative overflow-hidden">
             <div class="absolute -right-10 -top-10 w-40 h-40 bg-[#ff0050] rounded-full blur-3xl opacity-20"></div>
             <h4 class="font-bold flex items-center gap-2 text-xl mb-4 text-[#ff0050]">
               🚀 爆品扩量策略 (Growth)
            </h4>
             <!-- ... -->
         </div>
      </div>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Ad Strategy Failed:", error);
    return formatErrorHtml(error, "Ad Strategy");
  }
};

export const generateSelectionStrategy = async (records: ReplenishmentRecord[]) => {
  try {
    const ai = getAiClient();
    const dataSummary = prepareDataContext(records);

    const prompt = `
      你是一位专注于美国市场 (US Market) 的跨境电商选品专家 (Product Research Specialist)。
      请根据"探行科技"当前的库存和销售数据，分析当前的爆品基因，并提供未来的选品方向建议。
      
      当前数据: ${JSON.stringify(dataSummary)}

      任务：输出一份《美区选品与增长策略报告》 (HTML格式)。

      **分析逻辑：**
      1. **复盘当前盘面**:
         - 找出当前 ROI 最高、销量最好的产品，总结它们的共性 (例如：价格段、品类、物流属性)。
         - 找出表现差的产品，作为"避坑指南"。
      
      2. **选品方向拓展 (Expansion Strategy)**:
         - **纵向深挖 (Vertical)**: 基于当前爆品，推荐互补产品。例如：卖电子产品 -> 推荐保护壳、支架；卖美妆 -> 推荐刷具。
         - **横向拓宽 (Horizontal)**: 推荐同受众群体的其他热门品类。
      
      3. **美区市场特性适配**:
         - **物流友好性**: 推荐适合空运 (轻小件) 或适合美西海外仓 (大件) 的产品特性。
         - **价格带建议**: 根据当前毛利情况，建议更有竞争力的定价区间 (e.g. $19.99-$39.99 Sweet Spot)。
      
      4. **趋势洞察 (Trends)**:
         - 结合当前日期和一般电商季节性，给出选品建议 (例如 Q4 礼品属性，Q1 健身属性等)。

      **输出要求：**
      1. 直接输出 HTML 代码，不要 Markdown。
      2. 使用 Tailwind CSS。使用橙色/琥珀色 (Orange/Amber) 作为主色调，体现"探索"与"增长"。
      3. 结构清晰，包含：
         - 🧬 爆品基因解码 (Current DNA)
         - 🧭 蓝海选品推荐 (Blue Ocean Suggestions)
         - 📦 供应链选品标准 (Supply Chain Criteria)

      HTML 结构参考：
      <div class="space-y-6">
         <!-- 基因解码 -->
         <div class="bg-orange-50 p-5 rounded-xl border border-orange-100">
             <h4 class="font-bold text-orange-800 flex items-center gap-2 text-lg mb-3">
               🧬 现有爆品基因分析
            </h4>
            <!-- 分析内容 -->
         </div>

         <!-- 选品推荐 -->
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h5 class="font-bold text-gray-800 mb-2">🔭 纵向拓展建议</h5>
                 <!-- Content -->
             </div>
             <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h5 class="font-bold text-gray-800 mb-2">⚖️ 价格与物流标准</h5>
                 <!-- Content -->
             </div>
         </div>
      </div>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Selection Strategy Failed:", error);
    return formatErrorHtml(error, "Selection Strategy");
  }
};

export const generateMarketingContent = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const m = calculateMetrics(record);
        
        const context = {
            productName: record.productName,
            sku: record.sku,
            price: record.salesPriceUSD,
            lifecycle: record.lifecycle || 'New',
            usp: m.marginRate > 30 ? "High Quality / Premium" : "Cost Effective / Best Value",
            targetAudience: "US TikTok Users"
        };

        const prompt = `
            你是一位顶级的 TikTok 电商文案策划 (Copywriter)。
            请为以下产品生成一套完整的营销内容。
            
            产品信息: ${JSON.stringify(context)}
            
            任务：生成 HTML 格式的内容，包含以下三个部分：
            
            1. **TikTok 爆款短视频脚本 (Viral Video Script)**
               - 格式: 分镜脚本 (Hook -> Body -> CTA)
               - 风格: 根据产品生命周期调整 (新品强调痛点，爆品强调背书，清仓强调折扣)
            
            2. **SEO 英文 Listing 优化**
               - Title (80字符以内, 包含核心词)
               - 5 Bullet Points (强调利益点，而非参数)
            
            3. **直播间口播话术 (Live Stream Pitch)**
               - 30秒的激情口播，包含逼单话术。

            **要求：**
            - 输出 HTML，使用 Tailwind CSS 美化。
            - 脚本部分使用表格布局。
            - Listing 部分全英文，脚本和口播可用中文带英文关键词。
            - 颜色风格: 使用 indigo/purple 渐变风格。
            - 不要包含 markdown 标记。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Marketing Gen Failed", error);
        return formatErrorHtml(error, "Marketing Content");
    }
}

export const askAiAssistant = async (message: string, records: ReplenishmentRecord[], history: {role: string, content: string}[]) => {
    try {
        const ai = getAiClient();
        const dataContext = JSON.stringify(prepareDataContext(records));

        // Construct a prompt that includes context and history
        let promptConstruction = `
            System: 你是探行科技的供应链 AI 助手 (Copilot)。
            你拥有当前用户的实时备货数据权限。
            
            当前库存数据摘要 (JSON):
            ${dataContext}
            
            请根据以上数据回答用户的问题。
            如果用户问具体某个产品，请查询数据后回答。
            如果用户问宏观建议，请根据 ROI、周转天数 (DOS) 等指标给出专业建议。
            回答要简练、口语化、专业。
            
            对话历史:
        `;

        history.forEach(h => {
            promptConstruction += `\n${h.role === 'user' ? 'User' : 'Model'}: ${h.content}`;
        });

        promptConstruction += `\nUser: ${message}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptConstruction,
        });

        return response.text;

    } catch (error: any) {
        console.error("AI Chat Failed:", error);
        // Simple error message for chat, different from HTML cards
        if (error.toString().includes("401")) return "API Key 无效。请检查设置。";
        if (error.toString().includes("429")) return "AI 服务繁忙（配额耗尽），请稍后再试。";
        return "抱歉，我现在的连接有点不稳定，请稍后再试。";
    }
}
