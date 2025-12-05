import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const envKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    url: localUrl || envUrl || '',
    key: localKey || envKey || ''
  };
};

// 初始化 Client
const config = getSupabaseConfig();

// 如果没有配置，这里可能会创建一个无效的 client，但在 UI 层我们会拦截并提示用户配置
export const supabase = createClient(
    config.url || 'https://placeholder.supabase.co', 
    config.key || 'placeholder-key'
);

// 辅助函数：检查是否已配置
export const isSupabaseConfigured = () => {
    return !!(config.url && config.key && config.url !== 'https://placeholder.supabase.co');
};

// 辅助函数：保存配置并刷新页面以生效
export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem(STORAGE_KEY_URL, url);
    localStorage.setItem(STORAGE_KEY_KEY, key);
    // 关键修复：修改配置时，必须清除当前的工作区 ID，防止连接到新库时出现 ID 不匹配或权限错误
    localStorage.removeItem(STORAGE_KEY_WORKSPACE);
    window.location.reload(); 
};

// 辅助函数：清除配置
export const clearSupabaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    // 关键修复：清除配置时，同时也清除工作区 ID
    localStorage.removeItem(STORAGE_KEY_WORKSPACE);
    window.location.reload();
};