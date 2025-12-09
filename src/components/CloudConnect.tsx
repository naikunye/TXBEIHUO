
import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Settings, 
  X, 
  Truck, 
  Copy, 
  Check, 
  Database, 
  Loader2, 
  AlertCircle,
  Key,
  Terminal,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { saveSupabaseConfig, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// --- 企业级 SQL 脚本 (带历史审计功能) ---
const INIT_SQL = `-- 1. 主数据表 (存储当前状态)
create table if not exists public.replenishment_data (
  id text primary key,
  workspace_id text not null,
  json_content jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 索引：加速查询
create index if not exists idx_workspace_id on public.replenishment_data(workspace_id);

-- 2. [关键] 历史审计表 (Time Machine)
-- 用于记录所有修改和删除操作，防止数据意外丢失
create table if not exists public.replenishment_history (
  history_id uuid primary key default gen_random_uuid(),
  record_id text not null,
  workspace_id text,
  old_content jsonb,
  operation_type text, -- 'UPDATE' or 'DELETE'
  changed_at timestamp with time zone default now()
);

-- 3. 触发器函数：自动记录历史
create or replace function log_replenishment_changes()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    insert into public.replenishment_history (record_id, workspace_id, old_content, operation_type)
    values (OLD.id, OLD.workspace_id, OLD.json_content, 'DELETE');
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    insert into public.replenishment_history (record_id, workspace_id, old_content, operation_type)
    values (NEW.id, NEW.workspace_id, OLD.json_content, 'UPDATE');
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- 4. 绑定触发器
drop trigger if exists trigger_log_replenishment_changes on public.replenishment_data;
create trigger trigger_log_replenishment_changes
before update or delete on public.replenishment_data
for each row execute procedure log_replenishment_changes();

-- 5. 开启 Realtime (多端同步)
do $$
begin
  alter publication supabase_realtime add table public.replenishment_data;
exception when duplicate_object then
  null;
end;
$$;

-- 6. 设置 Replica Identity (确保 Delete 事件包含完整数据)
alter table public.replenishment_data replica identity full;

-- 7. 安全策略 (根据需要开启，目前为宽容模式)
alter table public.replenishment_data disable row level security;
`;

interface CloudConnectProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceId: string | null;
  onConnect: (workspaceId: string) => void;
  onDisconnect: () => void;
  isSyncing: boolean;
  onConfigChange?: () => void;
}

export const CloudConnect: React.FC<CloudConnectProps> = ({ 
  isOpen,
  onClose,
  currentWorkspaceId, 
  onConnect, 
  onDisconnect, 
  isSyncing,
  onConfigChange
}) => {
  const [mode, setMode] = useState<'connect' | 'config'>('connect'); 
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [inputId, setInputId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize state when opening
  useEffect(() => {
    if (isOpen) {
        const configured = isSupabaseConfigured();
        setIsConfigured(configured);
        setSaveSuccess(false); 
        
        if (!configured) {
            setMode('config');
            setShowSql(true); 
        } else {
            setMode('connect');
            setShowSql(false);
        }
        setErrorMsg(null);
        
        if (configured) {
            const current = getSupabaseConfig();
            setConfigUrl(current.url);
            setConfigKey(current.key);
        }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handleVerifyAndSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMsg(null);

      try {
          const url = configUrl.trim().replace(/\/$/, "");
          const key = configKey.trim();
          
          if (!url || !key) throw new Error("请输入完整的 URL 和 Key");
          
          // Verify connection
          const tempClient = createClient(url, key);
          const { error } = await tempClient.from('replenishment_data').select('id').limit(1);
          
          if (error && (error.code === 'PGRST301' || error.message.includes('JWT') || error.code === '28P01')) {
               throw new Error("认证失败：API Key 无效");
          } 

          saveSupabaseConfig(url, key);
          setIsConfigured(true);
          setSaveSuccess(true); 
          setShowSql(true);
          
          if (onConfigChange) onConfigChange();

      } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || "验证失败，请检查配置");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDone = () => {
      onClose();
  };

  const handleConnectWorkspace = (e: React.FormEvent) => {
      e.preventDefault();
      const val = inputId.trim();
      if (val) {
          // Force Save to LocalStorage immediately to prevent race conditions
          localStorage.setItem('tanxing_current_workspace', val);
          onConnect(val);
          onClose(); 
      }
  };

  const handleDisconnect = () => {
      localStorage.removeItem('tanxing_current_workspace');
      onDisconnect();
  };

  const handleCopyConfig = () => {
      const config = getSupabaseConfig();
      const text = `Supabase Config:\nURL: ${config.url}\nKey: ${config.key}\nWorkspace: ${currentWorkspaceId}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
          onClose();
      }
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-fade-in"
        onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative max-h-[90vh]">
         
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white z-20">
             <div className="flex items-center gap-2 text-gray-800">
                 <Settings className="text-gray-500" size={20} />
                 <h2 className="font-bold text-lg">系统设置 (Settings)</h2>
             </div>
             <button 
                type="button" 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-30"
             >
                 <X size={20} />
             </button>
         </div>

         <div className="p-6 space-y-8 overflow-y-auto">
             
             {/* Section 1: Cloud Collaboration */}
             <div>
                 <div className="flex items-center gap-2 mb-4">
                     <Cloud className="text-blue-600" size={20} />
                     <h3 className="font-bold text-gray-800">云端协作 (Supabase)</h3>
                 </div>

                 {saveSuccess ? (
                     <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-4 animate-fade-in">
                        <div className="flex justify-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                                <Check size={24} strokeWidth={3} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-green-800 font-bold text-lg">连接配置已保存！</h4>
                            <p className="text-green-700 text-sm mt-2">
                                请复制下方的 SQL 初始化脚本并在 Supabase SQL Editor 中运行。
                            </p>
                        </div>
                        
                        <div className="bg-slate-900 rounded-lg p-3 text-left relative group my-2">
                            <button 
                                type="button"
                                onClick={() => { navigator.clipboard.writeText(INIT_SQL); alert("SQL 已复制"); }}
                                className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                            >
                                复制
                            </button>
                            <pre className="text-[10px] text-green-400 overflow-x-auto h-24 custom-scrollbar font-mono">
                                {INIT_SQL}
                            </pre>
                        </div>

                        <button 
                           onClick={handleDone}
                           className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                        >
                           <Check size={18} />
                           完成设置
                        </button>
                     </div>
                 ) : currentWorkspaceId ? (
                     /* State: Connected */
                     <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center space-y-4 animate-fade-in">
                         <div className="flex justify-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                                <Check size={24} strokeWidth={3} />
                            </div>
                         </div>
                         <div>
                             <h4 className="text-emerald-800 font-bold text-lg">已连接云端数据库</h4>
                             <p className="text-emerald-600 text-sm mt-1 font-mono bg-emerald-100/50 inline-block px-2 py-0.5 rounded">
                                 工作区: {currentWorkspaceId}
                             </p>
                         </div>
                         
                         <div className="flex flex-col gap-3 pt-2">
                             <button 
                                type="button"
                                onClick={handleCopyConfig}
                                className="w-full bg-white border border-emerald-200 text-emerald-700 font-semibold py-2.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                             >
                                 {copied ? <Check size={16}/> : <Copy size={16} />}
                                 {copied ? '已复制' : '复制配置给同事'}
                             </button>
                             <button 
                                type="button"
                                onClick={handleDisconnect}
                                className="text-red-400 text-sm hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                             >
                                 断开连接
                             </button>
                         </div>
                     </div>
                 ) : (
                     /* State: Disconnected */
                     <div className="space-y-4">
                         {!isConfigured || mode === 'config' ? (
                             <form onSubmit={handleVerifyAndSave} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4 animate-fade-in">
                                 <div className="flex justify-between items-center">
                                     <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                         <Database size={14} /> 配置数据库连接
                                     </h4>
                                     {isConfigured && (
                                         <button type="button" onClick={() => setMode('connect')} className="text-xs text-blue-500 hover:underline">
                                             返回连接
                                         </button>
                                     )}
                                 </div>
                                 <div className="space-y-3">
                                     <div>
                                         <label className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Project URL</label>
                                         <input 
                                            type="text" 
                                            placeholder="https://your-project.supabase.co"
                                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            value={configUrl}
                                            onChange={e => setConfigUrl(e.target.value)}
                                            required
                                         />
                                     </div>
                                     <div>
                                         <label className="text-xs text-gray-500 font-semibold uppercase mb-1 block">Anon Public Key</label>
                                         <input 
                                            type="password" 
                                            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            value={configKey}
                                            onChange={e => setConfigKey(e.target.value)}
                                            required
                                         />
                                     </div>
                                 </div>
                                 
                                 {errorMsg && (
                                     <div className="flex items-start gap-2 text-red-600 bg-red-50 p-2 rounded text-xs border border-red-100">
                                         <AlertCircle size={14} className="mt-0.5 flex-shrink-0"/>
                                         {errorMsg}
                                     </div>
                                 )}

                                 <button disabled={isLoading} className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                                     {isLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                                     {isLoading ? '验证中...' : '保存配置'}
                                 </button>
                                 
                                 <div className="pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowSql(!showSql)}
                                        className="text-xs text-blue-500 flex items-center gap-1 hover:underline mx-auto mb-2"
                                    >
                                        <Terminal size={12} />
                                        {showSql ? '隐藏 SQL 脚本' : '查看 Supabase 初始化 SQL'}
                                    </button>
                                    
                                    {showSql && (
                                        <div className="bg-slate-900 rounded-lg p-3 relative group">
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                 <button 
                                                    type="button"
                                                    onClick={() => { navigator.clipboard.writeText(INIT_SQL); alert("SQL 已复制"); }}
                                                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white transition-colors text-xs"
                                                >
                                                    {copied ? '已复制' : '复制'}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2 text-green-400 text-xs font-bold border-b border-slate-700 pb-2">
                                                <ShieldCheck size={14} /> 
                                                企业级 Schema (含防丢失审计)
                                            </div>
                                            <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed h-32 custom-scrollbar">
                                                {INIT_SQL}
                                            </pre>
                                        </div>
                                    )}
                                 </div>
                             </form>
                         ) : (
                             <form onSubmit={handleConnectWorkspace} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm animate-fade-in">
                                 <div className="text-center space-y-2">
                                     <div className="inline-flex bg-blue-50 p-3 rounded-full text-blue-500 mb-1">
                                         <Database size={24} />
                                     </div>
                                     <h4 className="font-bold text-gray-800">连接工作区</h4>
                                     <p className="text-xs text-gray-500">
                                         输入团队 ID 以同步数据
                                         <button type="button" onClick={() => setMode('config')} className="text-blue-500 hover:underline ml-1">修改配置</button>
                                     </p>
                                 </div>
                                 <input 
                                    type="text"
                                    placeholder="输入 Workspace ID (如: Team1)"
                                    className="w-full p-3 rounded-lg border border-gray-300 text-center font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    value={inputId}
                                    onChange={e => setInputId(e.target.value)}
                                    autoFocus
                                 />
                                 <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-100">
                                     立即连接
                                 </button>
                             </form>
                         )}
                     </div>
                 )}
             </div>

             <div className="border-t border-gray-100"></div>

             {/* Section 3: Logistics Tracking */}
             <div>
                 <div className="flex items-center gap-2 mb-4">
                     <Truck className="text-amber-600" size={20} />
                     <h3 className="font-bold text-gray-800">物流追踪 (17TRACK)</h3>
                 </div>
                 <div className="space-y-3">
                     <p className="text-xs text-gray-500">
                         填入 API Key 可自动更新物流状态。留空则使用本地智能推断。
                     </p>
                     <div className="relative">
                         <Key className="absolute left-3 top-3 text-gray-400" size={16} />
                         <input 
                            type="password"
                            disabled
                            placeholder="••••••••••••••••••••••••"
                            className="w-full p-3 pl-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                         />
                     </div>
                     <div className="flex justify-end">
                         <a href="#" className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1">
                             获取 API Key <span className="text-[10px] transform rotate-[-45deg]">→</span>
                         </a>
                     </div>
                 </div>
             </div>

         </div>
      </div>
    </div>
  );
};
