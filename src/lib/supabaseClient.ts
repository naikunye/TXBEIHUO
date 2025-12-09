
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 定义存储 Key
const STORAGE_KEY_URL = 'tanxing_supabase_url';
const STORAGE_KEY_KEY = 'tanxing_supabase_key';

// 兼容 Vite (import.meta.env) 和 Webpack/Node (process.env) 的环境变量读取器
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const val = (import.meta as any).env[key] || (import.meta as any).env[`VITE_${key}`];
    if (val) return val;
  }
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`REACT_APP_${key}`];
    }
  } catch (e) {}
  return undefined;
};

// 辅助函数：清洗 URL
const cleanUrl = (url: string) => {
    if (!url) return '';
    let cleaned = url.trim().replace(/\/$/, ""); // Remove trailing slash
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = `https://${cleaned}`;
    }
    return cleaned;
};

// 获取配置
export const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const envKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    url: cleanUrl(localUrl || envUrl || ''),
    key: (localKey || envKey || '').trim()
  };
};

// 单例持有者
let currentClient: SupabaseClient | null = null;

// 核心函数：获取当前 Client 实例
// 每次调用都会检查是否有缓存，如果配置更新了 (currentClient set to null)，会重新创建
export const getSupabase = () => {
    if (currentClient) return currentClient;

    const config = getSupabaseConfig();
    const url = config.url || 'https://placeholder.supabase.co';
    const key = config.key || 'placeholder-key';

    try {
        currentClient = createClient(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
    }
    return currentClient as SupabaseClient;
};

// 导出默认实例 (建议优先使用 getSupabase())
export const supabase = getSupabase();

// 辅助函数：检查是否已配置
export const isSupabaseConfigured = () => {
    const config = getSupabaseConfig();
    return !!(config.url && config.key && config.url !== 'https://placeholder.supabase.co');
};

// 辅助函数：保存配置并重置 Client
export const saveSupabaseConfig = (url: string, key: string) => {
    const cleanedUrl = cleanUrl(url);
    const cleanedKey = key.trim();
    
    localStorage.setItem(STORAGE_KEY_URL, cleanedUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanedKey);
    
    // 关键：置空当前实例，迫使下一次 getSupabase() 重新创建
    currentClient = null;
    
    // 立即初始化以验证
    getSupabase();
};

// 辅助函数：清除配置
export const clearSupabaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    localStorage.removeItem('tanxing_current_workspace');
    currentClient = null;
};
