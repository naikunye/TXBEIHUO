import { GoogleGenAI } from "@google/genai";
import { ReplenishmentRecord, PurchaseOrder } from "../types";
import { calculateMetrics } from "../utils/calculations";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const formatErrorHtml = (error: any, serviceName: string) => {
    const errString = error.toString();
    return `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
        <strong>AI Service Error (${serviceName}):</strong><br/>
        ${errString}
        <br/><br/>
        <span class="text-xs text-red-400">Tip: Check if your API Key is valid and supports the selected model.</span>
    </div>`;
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

// --- Supply Chain Agents ---

export const parseAgentAction = async (message: string, records: ReplenishmentRecord[]) => {
    try {
        const ai = getAiClient();
        const context = prepareDataContext(records);
        
        const prompt = `
            You are an AI Supply Chain Agent.
            User Input: "${message}"
            Inventory Context: ${JSON.stringify(context)}
            
            Determine if the user wants to perform an ACTION:
            1. **create_po**: Buy/restock items. Data: { sku, quantity }
            2. **update_lifecycle**: Change status. Data: { sku, status }
            
            Output JSON ONLY: { "type": "create_po"|"update_lifecycle"|"none", "data": {...}, "reason": "..." }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { type: 'none' };
    }
};

export const parseNaturalLanguageQuery = async (query: string) => {
    try {
        const ai = getAiClient();
        const prompt = `
            Translate User Query to Filter State.
            Query: "${query}"
            Output JSON: { searchQuery, statusFilter: 'All'|'Planning'|'Shipped'|'Arrived', sortKey, sortDirection }
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { searchQuery: '', statusFilter: 'All', sortKey: 'date', sortDirection: 'desc' };
    }
};

// --- Image & Product Analysis ---

export const parseImageToRecord = async (base64Image: string) => {
    try {
        const ai = getAiClient();
        const base64Data = base64Image.split(',')[1] || base64Image;
        const prompt = `Extract product data JSON: { productName, sku, unitPriceCNY, boxLengthCm, boxWidthCm, boxHeightCm, unitWeightKg, itemsPerBox }`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return {}; }
};

export const analyzeProductConcept = async (description: string, base64Image?: string) => {
    try {
        const ai = getAiClient();
        let parts: any[] = [{ text: `Act as Product Manager. Analyze this concept: "${description}". Output HTML with Tailwind. Sections: Material, Pain Points, Differentiation, Cost Est.` }];
        if (base64Image) parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts } });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Product Concept"); }
};

// --- Reports ---

export const generateDailyBriefing = async (records: ReplenishmentRecord[]) => {
    try {
        const ai = getAiClient();
        // Simplify context to only essential data to keep prompt clear
        const context = records.map(r => ({
            name: r.productName,
            stock: r.quantity,
            sales: r.dailySales,
            status: r.lifecycle
        }));
        
        const prompt = `
            ROLE: Professional E-commerce Supply Chain Analyst.
            TASK: Generate a Daily Inventory Briefing based on the provided data.
            LANGUAGE: Chinese (Simplified).
            
            DATA: ${JSON.stringify(context)}
            
            STRICT CONSTRAINTS:
            1. DO NOT generate product reviews, fake testimonials, or skincare advice.
            2. Focus ONLY on: Inventory Levels, Sales Velocity, and Restock Warnings.
            3. Output pure HTML with Tailwind CSS classes.
            4. If data is empty, suggest adding products.
            
            STRUCTURE:
            <div class="space-y-4">
                <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 class="text-red-800 font-bold mb-1">🚨 紧急库存预警 (Critical)</h4>
                    <p class="text-sm text-red-600">Analyze which items have low stock (stock < 5 * sales).</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 class="text-blue-800 font-bold mb-1">📈 销售异动监测 (Trends)</h4>
                    <p class="text-sm text-blue-600">Identify high velocity items.</p>
                </div>
                <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                    <h4 class="text-green-800 font-bold mb-1">🧠 智能行动建议 (Actions)</h4>
                    <ul class="list-disc pl-5 text-sm text-green-700">
                        <li>Specific action items like "Restock SKU-X" or "Clear SKU-Y".</li>
                    </ul>
                </div>
            </div>
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (e) { 
        return formatErrorHtml(e, "Briefing Generation"); 
    }
};

export const analyzeInventory = async (records: ReplenishmentRecord[]) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze Inventory Strategy (HTML/Tailwind) for: ${JSON.stringify(prepareDataContext(records))}. Focus on Profit, Risks, Logistics.`
        });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Analysis"); }
};

export const analyzeLogisticsChannels = async (records: ReplenishmentRecord[]) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze Logistics Optimization (HTML/Tailwind). Suggest Air vs Sea switch based on weight/value ratio.`
        });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Logistics"); }
};

export const generateAdStrategy = async (records: ReplenishmentRecord[]) => {
    try {
    const ai = getAiClient();
    const dataSummary = prepareDataContext(records);

    const prompt = `
      You are a TikTok Shop Ad Strategist.
      Data: ${JSON.stringify(dataSummary)}
      Task: Create "TikTok Shop Ad Strategy Report" (HTML).
      Focus on Lifecycle (New/Growth/Stable/Clearance).
      Output HTML with Tailwind CSS.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return formatErrorHtml(error, "Ad Strategy");
  }
};

export const generateSelectionStrategy = async (records: ReplenishmentRecord[]) => {
    try {
    const ai = getAiClient();
    const dataSummary = prepareDataContext(records);

    const prompt = `
      You are a Chief Merchant.
      Data: ${JSON.stringify(dataSummary)}
      Task: Create "US Market Selection & Growth Strategy Report" (HTML).
      Analyze Best-Seller DNA and suggest Vertical Expansion.
      Output HTML with Tailwind CSS.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return formatErrorHtml(error, "Selection Strategy");
  }
};

export const generateFinancialReport = async (records: ReplenishmentRecord[], financialContext?: any) => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate Monthly P&L Financial Report (HTML/Tailwind). Context: ${JSON.stringify(financialContext || records)}`
        });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Financial"); }
};

// --- MARKETING OS 3.0 AGENTS ---

export const generateCampaignStrategy = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const context = {
            product: record.productName,
            lifecycle: record.lifecycle || 'New',
            sales: record.dailySales
        };
        const prompt = `
            Act as a CMO. Create a "4-Week Marketing Campaign Calendar" for: ${JSON.stringify(context)}.
            Output HTML with Tailwind CSS.
            Structure: Executive Summary, Week 1-4 Cards (Theme, Channel, Budget).
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

export const generateVisualDirectives = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const prompt = `
            Act as Art Director. Product: ${record.productName}.
            Generate 3 AI Image Prompts (Midjourney/SD) for: Lifestyle, Studio, Creative.
            Output HTML with Tailwind.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Visual Directives"); }
};

export const analyzeReviewSentiment = async (reviewsText: string, productName: string) => {
    try {
        const ai = getAiClient();
        const prompt = `
            Analyze Competitor Reviews for ${productName}.
            Reviews: "${reviewsText.substring(0, 1000)}..."
            Output HTML (Tailwind): Pain Points, Selling Points, Marketing Hooks.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "VOC Analysis"); }
};

// --- Utilities ---

export const askAiAssistant = async (message: string, records: ReplenishmentRecord[], history: any[]) => {
    try {
        const ai = getAiClient();
        const prompt = `System: Supply Chain Assistant. Data: ${JSON.stringify(prepareDataContext(records))}. User: ${message}`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return "AI connection error."; }
};

export const generatePurchaseOrderEmail = async (record: ReplenishmentRecord, qty: number) => {
    try {
        const ai = getAiClient();
        const prompt = `Write a Purchase Order Email to supplier for ${qty} x ${record.productName}. Professional tone.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return "Error generating email."; }
};

export const analyzeCompetitor = async (record: ReplenishmentRecord) => {
    try {
        const ai = getAiClient();
        const prompt = `Analyze Competitor Battlecard for ${record.productName} vs ${record.competitorUrl}. HTML Output.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (e) { return formatErrorHtml(e, "Competitor Analysis"); }
};

// Legacy compatibility
export const generateMarketingContent = async (record: ReplenishmentRecord) => {
    return generateCampaignStrategy(record);
};
