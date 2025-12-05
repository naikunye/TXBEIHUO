import { createClient } from '@supabase/supabase-js';

// 兼容 Vite (import.meta.env) 和 Webpack/Node (process.env) 的环境变量读取器
const getEnv = (key: string) => {
  // 1. 尝试读取 Vite 环境变量 (通常需要 VITE_ 前缀)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const val = (import.meta as any).env[key] || (import.meta as any).env[`VITE_${key}`];
    if (val) return val;
  }
  
  // 2. 尝试读取 process.env (兼容 Create React App 或 Node 环境)
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`REACT_APP_${key}`];
    }
  } catch (e) {
    // 忽略 process 未定义的错误
  }
  
  return undefined;
};

// 获取配置
const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);