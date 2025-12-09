
import { GoogleGenAI } from "@google/genai";
import { ReplenishmentRecord, PurchaseOrder } from "../types";
import { calculateMetrics } from "../utils/calculations";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const formatErrorHtml = (error: any, serviceName: string) => {
    const errString = error.toString();
    return `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded">AI Service Error (${serviceName}): ${errString}</div>`;
};

const prepareDataContext = (records: ReplenishmentRecord[]) => {
  return records.map(r => {
    const m = calculateMetrics(r);
    return {
      name: r.productName,
      sku: r.sku,
      lifecycle: r.lifecycle || 'New',
      stock: r.quantity,
      dailySales: r.dailySales,
      dos: m.daysOfSupply.toFixed(0),
      profit: m.estimatedProfitUSD.toFixed(1),
      roi: m.roi.toFixed(0) + '%',
    };
  });
};

// --- NEW: AI Agent Logic ---
interface AgentAction {
    type: 'create_po' | 'update_lifecycle' | 'none';
    data?: any;
    reason?: string;
}

export const parseAgentAction = async (message: string, records: ReplenishmentRecord[]): Promise<AgentAction> => {
    try {
        const ai = getAiClient();
        const context = prepareDataContext(records);
        
        const prompt = `
            You are an AI Supply Chain Agent for Tanxing Tech.
            User Input: "${message}"
            
            Current Inventory Context (JSON):
            ${JSON.stringify(context)}
            
            Your goal is to determine if the user wants to perform a specific ACTION.
            
            Supported Actions:
            1. **create_po**: User wants to order/buy/restock items.
               - Required Data: { sku: string, quantity: number }
               - If quantity is not specified, estimate it based on daily sales * 30 days.
            2. **update_lifecycle**: User wants to change product status (e.g. "mark SKU as clearance").
               - Required Data: { sku: string, status: 'New'|'Growth'|'Stable'|'Clearance' }
            
            Output JSON ONLY. No markdown.
            Structure: { "type": "create_po" | "update_lifecycle" | "none", "data": {...}, "reason": "short explanation" }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text || '{}';
        return JSON.parse(text);
    } catch (e) {
        console.error("Agent Parse Failed", e);
        return { type: 'none' };
    }
};

// --- NEW: Natural Language Query Parser ---
export interface NLQueryResponse {
    searchQuery: string;
    statusFilter: 'All' | 'Planning' | 'Shipped' | 'Arrived';
    sortKey: string;
    sortDirection: 'asc' | 'desc';
    explanation: string;
}

export const parseNaturalLanguageQuery = async (query: string): Promise<NLQueryResponse> => {
    try {
        const ai = getAiClient();
        const prompt = `
            You are a translation layer between User Natural Language and System Filter State.
            User Query: "${query}"
            
            System Capabilities:
            - searchQuery: string (matches product name or sku)
            - statusFilter: 'All' | 'Planning' | 'Shipped' | 'Arrived'
            - sortKey: 'profit' | 'daysOfSupply' | 'quantity' | 'totalInvestment' | 'date'
            - sortDirection: 'asc' (low to high) | 'desc' (high to low)
            
            Mapping Rules:
            - "Stockout", "Emergency", "Low stock" -> sortKey: 'daysOfSupply', sortDirection: 'asc'
            - "Best selling", "Hot", "High profit" -> sortKey: 'profit', sortDirection: 'desc'
            - "Expensive", "High cost" -> sortKey: 'totalInvestment', sortDirection: 'desc'
            - "New", "Latest" -> sortKey: 'date', sortDirection: 'desc'
            - "On the way", "Transit" -> statusFilter: 'Shipped'
            - "Arrived", "In stock" -> statusFilter: 'Arrived'
            
            Output JSON ONLY. No markdown.
            Structure: { searchQuery, statusFilter, sortKey, sortDirection, explanation }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("NL Query Parse Failed", e);
        // Fallback defaults
        return { searchQuery: '', statusFilter: 'All', sortKey: 'date', sortDirection: 'desc', explanation: 'AI 解析失败' };
    }
};

// --- NEW: Image to Record Parser ---
export const parseImageToRecord = async (base64Image: string): Promise<Partial<ReplenishmentRecord>> => {
    try {
        const ai = getAiClient();
        
        // Remove header if present
        const base64Data = base64Image.split(',')[1] || base64Image;

        const prompt = `
            Analyze this product image/invoice/quote. Extract structured data for an ERP system.
            Return a JSON object with these keys (infer if necessary):
            - productName (string): Short descriptive name
            - sku (string): Generate a short SKU code if not visible (e.g. CAT-001)
            - unitPriceCNY (number): Cost in RMB
            - boxLengthCm (number)
            - boxWidthCm (number)
            - boxHeightCm (number)
            - unitWeightKg (number)
            - itemsPerBox (number)
            
            Output JSON ONLY. No Markdown.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Image Parse Failed", e);
        return {};
    }
};

// --- NEW: Product R&D Analysis ---
export const analyzeProductConcept = async (description: string, base64Image?: string) => {
    try {
        const ai = getAiClient();
        
        let parts: any[] = [{ text: `
            You are a Senior Product Manager for a cross-border e-commerce brand targeting the US market.
            User Product Concept: "${description}"
            
            Task: Provide a detailed "Product Feasibility & Innovation Report".
            
            Output Requirements:
            1. Output HTML code directly. Use Tailwind CSS for styling.
            2. Do NOT use markdown code blocks.
            3. Structure:
               - **材质与工艺建议 (Material & Craft)**: Suggest premium yet cost-effective materials.
               - **痛点狙击 (Pain Point Solution)**: What common problems does this solve?
               - **差异化策略 (Differentiation)**: How to beat competitors?
               - **成本估算 (Cost Estimation)**: Estimated production cost range in RMB (CNY).
            
            Style: Future Lab, Blueprint, Professional.
        `}];

        if (base64Image) {
            const base64Data = base64Image.split(',')[1] || base64Image;
            parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: parts }
        });

        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Product Concept Analysis");
    }
};

export const generateDailyBriefing = async (records: ReplenishmentRecord[]) => {
    try {
        const ai = getAiClient();
        const context = prepareDataContext(records);
        
        const prompt = `
            你是一位专业的电商 CEO 助理。请根据当前的库存和销售数据，生成一份**今日晨报 (Daily Briefing)**。
            
            数据摘要: ${JSON.stringify(context)}
            
            **要求：**
            1. 输出 HTML 格式，使用 Tailwind CSS 类名。
            2. 风格要现代、简洁、商务。
            3. 内容包含 3 个核心板块：
               - **🚨 紧急预警 (Critical Alerts)**: 库存 < 15天 或 利润为负的产品。
               - **📈 增长机会 (Growth Opportunities)**: 销量高且 ROI > 30% 的产品，建议增加广告预算。
               - **🧠 运营建议 (Action Items)**: 基于生命周期给出的具体操作建议（如：新品加速测款，滞销品降价）。
            4. 语气要像真人在汇报工作，不要像机器人在罗列数据。
            
            HTML 结构参考:
            <div class="space-y-4">
                <div class="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-100">...</div>
                <div class="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-100">...</div>
                <div class="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">...</div>
            </div>
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Daily Briefing");
    }
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
      你是一位拥有10年经验的北美跨境电商选品总监 (Chief Merchant)。
      请为"探行科技"生成一份高度定制化的《美国市场选品与增长策略报告》。
      
      **核心任务：**
      深度挖掘现有数据中的"爆品基因"，结合当前美国市场趋势 (US Market Trends)，输出具体的选品方向。

      **输入数据概览:**
      ${JSON.stringify(dataSummary)}

      **报告模板结构 (HTML Output Requirements):**
      请严格按照以下 HTML 结构和 Tailwind CSS 样式输出，不包含 Markdown 标记。

      <div class="space-y-8 font-sans">
        
        <!-- 1. 现有爆品基因解码 (DNA Analysis) -->
        <div class="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
           <h3 class="text-xl font-bold text-orange-900 flex items-center gap-2 mb-4">
              🧬 现有爆品基因解码 (Best-Seller DNA)
           </h3>
           <!-- 分析当前 ROI 和 销量 Top 的产品，总结它们的共性：价格带、功能属性、受众画像 -->
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white/80 p-4 rounded-xl shadow-sm">
                 <h4 class="font-bold text-orange-800 text-sm mb-2 flex items-center gap-1">💎 利润型爆款特征 (High Margin)</h4>
                 <p class="text-sm text-orange-700 leading-relaxed">...</p>
              </div>
              <div class="bg-white/80 p-4 rounded-xl shadow-sm">
                 <h4 class="font-bold text-orange-800 text-sm mb-2 flex items-center gap-1">⚡ 流量型爆款特征 (High Velocity)</h4>
                 <p class="text-sm text-orange-700 leading-relaxed">...</p>
              </div>
           </div>
        </div>

        <!-- 2. 数据驱动的关联推荐 (Data-Driven Expansion) -->
        <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              🔭 关联品类拓展 (Vertical Expansion)
           </h3>
           <p class="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">基于现有库存品类，推荐高连带率的互补产品。</p>
           <!-- 表格或列表形式推荐具体的细分品类 -->
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                 <div class="flex items-center gap-2 mb-2">
                    <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold shrink-0">推荐方向 1</span>
                    <span class="font-bold text-gray-700">品类名称</span>
                 </div>
                 <p class="text-xs text-gray-500 leading-relaxed">推荐逻辑: ...</p>
              </div>
              <div class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                 <div class="flex items-center gap-2 mb-2">
                    <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold shrink-0">推荐方向 2</span>
                    <span class="font-bold text-gray-700">品类名称</span>
                 </div>
                 <p class="text-xs text-gray-500 leading-relaxed">推荐逻辑: ...</p>
              </div>
           </div>
        </div>

        <!-- 3. 美国市场趋势红利 (US Market Trends) -->
        <div class="bg-slate-900 p-6 rounded-2xl text-white relative overflow-hidden shadow-xl">
           <div class="absolute top-0 right-0 bg-purple-500 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
           <h3 class="text-lg font-bold flex items-center gap-2 mb-6 relative z-10">
              🔥 趋势选品雷达 (Trend Radar - US Market)
           </h3>
           <!-- 结合当前美国社媒(TikTok/Ins)趋势，推荐 3 个具体的蓝海方向 -->
           <div class="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <!-- Trend Card -->
              <div class="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
                 <div class="text-purple-300 text-[10px] font-bold uppercase mb-2 tracking-wider">Trend #1</div>
                 <div class="font-bold mb-2 text-sm">关键词/场景</div>
                 <div class="text-xs text-slate-300 leading-relaxed">...</div>
              </div>
              <div class="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
                 <div class="text-purple-300 text-[10px] font-bold uppercase mb-2 tracking-wider">Trend #2</div>
                 <div class="font-bold mb-2 text-sm">关键词/场景</div>
                 <div class="text-xs text-slate-300 leading-relaxed">...</div>
              </div>
              <div class="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
                 <div class="text-purple-300 text-[10px] font-bold uppercase mb-2 tracking-wider">Trend #3</div>
                 <div class="font-bold mb-2 text-sm">关键词/场景</div>
                 <div class="text-xs text-slate-300 leading-relaxed">...</div>
              </div>
           </div>
        </div>

        <!-- 4. 落地执行建议 (Action Plan) -->
        <div class="flex flex-col md:flex-row gap-4">
           <div class="flex-1 bg-emerald-50 p-5 rounded-xl border border-emerald-100">
              <h4 class="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2">💰 定价策略 (Pricing)</h4>
              <p class="text-xs text-emerald-700 leading-relaxed">...</p>
           </div>
           <div class="flex-1 bg-indigo-50 p-5 rounded-xl border border-indigo-100">
              <h4 class="font-bold text-indigo-800 text-sm mb-2 flex items-center gap-2">📦 供应链标准 (Supply Chain)</h4>
              <p class="text-xs text-indigo-700 leading-relaxed">建议体积重控制在...</p>
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

export const generateCampaignStrategy = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const m = calculateMetrics(record);
        const context = {
            product: record.productName,
            lifecycle: record.lifecycle || 'New',
            sales: record.dailySales,
            profit: m.estimatedProfitUSD.toFixed(2),
            margin: m.marginRate.toFixed(1) + '%'
        };
        const prompt = `
            You are a Chief Marketing Officer (CMO).
            Create a "4-Week Marketing Campaign Calendar" for the following product:
            ${JSON.stringify(context)}
            
            Output HTML with Tailwind CSS.
            Structure:
            1. **Executive Summary**: Campaign Theme & Goals.
            2. **Week 1-4 Cards**: Specific activities for each week (e.g. Teaser, Launch, Sustaining, Retargeting).
               - Include Channel mix and estimated budget allocation.
            
            Style: Professional, Strategic, Clean.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Campaign Strategy"); }
};

export const generateChannelContent = async (record: ReplenishmentRecord, channel: string) => {
    try {
        const ai = getAiClient();
        const prompt = `
            Act as a Copywriter for ${channel}. Product: ${record.productName}.
            Task: Generate content optimized for ${channel} (e.g. Script for TikTok, Bullets for Amazon).
            Output HTML with Tailwind.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Channel Content"); }
};

export const generateInfluencerBrief = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const prompt = `
            Act as Influencer Manager. Product: ${record.productName}.
            Generate: 1. Outreach DM (Short/Punchy). 2. Creative Brief (Do's/Don'ts).
            Output HTML with Tailwind.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Influencer Brief"); }
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

// --- VISUAL DIRECTOR (New) ---
export const generateVisualDirectives = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const context = {
            name: record.productName,
            sku: record.sku,
            audience: "US Gen Z & Millennials on TikTok",
            vibe: "Viral, High Quality, Aesthetic"
        };

        const prompt = `
            Act as an expert Art Director and Prompt Engineer for Midjourney and Stable Diffusion.
            
            Product: ${JSON.stringify(context)}
            
            Task: Generate 3 high-quality AI Image Prompts optimized for e-commerce marketing.
            
            1. **Lifestyle Scene (TikTok Viral Style)**: Realistic, in-context use, warm lighting, high engagement vibe.
            2. **Professional Product Shot (Amazon Main)**: Pure white background, 8k resolution, studio lighting, hyper-realistic.
            3. **Creative Concept (Scroll Stopper)**: Surreal or neon style, eye-catching, unique composition.
            
            Output Format: HTML with Tailwind CSS.
            - Provide the PROMPT text clearly in a code block for easy copying.
            - Add a small tip for aspect ratio (e.g., --ar 9:16).
            - Do not include markdown tags.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Visual Director");
    }
};

// --- REVIEW INSIGHTS (New) ---
export const analyzeReviewSentiment = async (reviewsText: string, productName: string) => {
    try {
        const ai = getAiClient();
        const prompt = `
            You are a Consumer Insights Expert.
            Analyze the following raw customer reviews for a competitor product similar to "${productName}".
            
            Reviews: "${reviewsText.substring(0, 2000)}"
            
            Task: Generate a "Voice of Customer (VOC) Insight Card" in HTML/Tailwind.
            
            Include:
            1. **😡 Top Pain Points (Dissatisfaction)**: What do they hate? (Use Red colors)
            2. **❤️ Top Selling Points (Satisfaction)**: What do they love? (Use Green colors)
            3. **💡 Marketing Hook Suggestion**: How can we market OUR product to solve these pain points? (e.g., "Unlike them, we have...")
            
            Style: Professional, data-driven, concise.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Review Analysis");
    }
};

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

export const generatePurchaseOrderEmail = async (record: ReplenishmentRecord, quantity: number) => {
    try {
        const ai = getAiClient();
        const context = {
            supplier: record.supplierName || "Supplier",
            product: record.productName,
            sku: record.sku,
            currentPrice: record.unitPriceCNY,
            quantity: quantity,
            total: quantity * record.unitPriceCNY
        };

        const prompt = `
            你是一位专业的采购经理。请根据以下采购信息，写一封**商务谈判/下单邮件**给供应商。
            
            信息: ${JSON.stringify(context)}
            
            **要求：**
            1. 语气专业、礼貌但坚定。
            2. 如果数量较大（>500），尝试询问是否有折扣。
            3. 强调交货期 (Lead Time) 的重要性。
            4. 询问是否有新款或改进款推荐。
            5. 输出格式：纯文本 (Text)，方便用户复制。不要 Markdown。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        console.error("PO Email Gen Failed:", error);
        return "Error generating email template.";
    }
};

export const generateFinancialReport = async (records: ReplenishmentRecord[], financialContext?: any) => {
    try {
        const ai = getAiClient();
        
        let promptContext = "";
        
        if (financialContext) {
            promptContext = `
            **财务报表数据 (Financial Statement):**
            - 本月营收 (Revenue): ¥${financialContext.revenue}
            - 采购成本 (COGS): ¥${financialContext.cogs}
            - 运营支出 (OPEX): ¥${financialContext.opex}
            - 净利润 (Net Profit): ¥${financialContext.netProfit}
            - 净利率 (Net Margin): ${financialContext.netMargin.toFixed(2)}%
            - 支出明细: ${JSON.stringify(financialContext.breakdown)}
            - 近6个月趋势: ${JSON.stringify(financialContext.trend)}
            `;
        } else {
            const dataSummary = prepareDataContext(records);
            promptContext = `**库存资产数据:** ${JSON.stringify(dataSummary)}`;
        }
        
        const prompt = `
            你是一位首席财务官 (CFO)。
            请根据以下业务数据，生成一份《月度供应链财务损益分析报告 (P&L Analysis)》。
            
            ${promptContext}
            
            **要求：**
            1. 直接输出 HTML 代码，使用 Tailwind CSS 美化。
            2. 包含一个可视化的 **瀑布流 (Waterfall) 概念描述**，展示从总销售额 (Revenue) 到 净利润 (Net Profit) 的各项扣除。
            3. 计算整体的净利率 (Net Margin %) 并给出评级 (S/A/B/C)。
            4. 给出具体的**降本增效建议** (Cost Cutting Action Plan)，重点分析支出占比高的科目。
            5. 如果提供了趋势数据，请分析增长或衰退的原因。
            
            风格要求：专业、数据驱动、深色模式或金融风格 (Dark/Slate theme)。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Financial Report");
    }
};

export const analyzeCompetitor = async (myProduct: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const m = calculateMetrics(myProduct);
        const context = {
            myName: myProduct.productName,
            myPrice: myProduct.salesPriceUSD,
            myMargin: m.marginRate.toFixed(1) + '%',
            competitorUrl: myProduct.competitorUrl || 'N/A',
            competitorPrice: myProduct.competitorPriceUSD || 'N/A'
        };

        const prompt = `
            你是一位市场竞争分析专家。
            
            我方产品信息: ${JSON.stringify(context)}
            
            任务：生成一份《竞品攻防策略卡片 (Competitor Battlecard)》。
            
            假设竞品价格为 ${context.competitorPrice} (如果未提供，请根据市场常识假设一个类似产品的价格范围)。
            
            **内容要求 (HTML):**
            1. **价格战力对比**: 分析价格优势或劣势。
            2. **差异化打法**: 如果我方价格高，如何强调品质/服务？如果低，如何强调性价比？
            3. **关键词建议**: 针对竞品流量词的截流建议。
            
            UI风格：卡片式设计，简洁有力。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        return formatErrorHtml(error, "Competitor Analysis");
    }
};