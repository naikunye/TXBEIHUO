import { createClient } from '@supabase/supabase-js';

// 防止在纯浏览器环境中 process 未定义导致报错
const getEnv = (key: string) => {
  try {
    return typeof process !== 'undefined' ? process.env?.[key] : undefined;
  } catch (e) {
    return undefined;
  }
};

// 【重要】请在此处填入您的 Supabase Project URL 和 Anon Key
// 如果您没有配置环境变量，请直接替换下方的字符串
const supabaseUrl = getEnv('SUPABASE_URL') || 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = getEnv('SUPABASE_ANON_KEY') || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);