
import { createClient } from '@supabase/supabase-js';

// 定义存储 Key
const STORAGE_KEY_URL = 'tanxing_supabase_url';
const STORAGE_KEY_KEY = 'tanxing_supabase_key';
const STORAGE_KEY_WORKSPACE = 'tanxing_current_workspace';

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

// 获取配置：优先 localStorage，其次环境变量
export const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const envKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    url: localUrl || envUrl || '',
    key: localKey || envKey || ''
  };
};

// 初始化 Client (使用 let 允许热替换)
let currentConfig = getSupabaseConfig();

export let supabase = createClient(
    currentConfig.url || 'https://placeholder.supabase.co', 
    currentConfig.key || 'placeholder-key'
);

// 辅助函数：检查是否已配置 (动态检查最新状态)
export const isSupabaseConfigured = () => {
    const config = getSupabaseConfig();
    return !!(config.url && config.key && config.url !== 'https://placeholder.supabase.co');
};

// 辅助函数：保存配置
export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem(STORAGE_KEY_URL, url);
    localStorage.setItem(STORAGE_KEY_KEY, key);
    
    // FIX: 移除了清除 WORKSPACE ID 的代码，防止保存配置时丢失连接状态
    
    // 热更新客户端实例，无需刷新页面
    try {
        supabase = createClient(url, key);
        console.log("Supabase client hot-swapped successfully.");
    } catch (e) {
        console.error("Failed to hot-swap supabase client", e);
    }
};

// 辅助函数：清除配置 (完全重置时才调用)
export const clearSupabaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    localStorage.removeItem(STORAGE_KEY_WORKSPACE);
    // 重置为占位符
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
};
