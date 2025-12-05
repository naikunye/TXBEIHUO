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
  LogOut, 
  AlertCircle,
  Key
} from 'lucide-react';
import { saveSupabaseConfig, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

const INIT_SQL = `-- 1. 创建数据表
create table if not exists replenishment_data (
  id text primary key,
  workspace_id text not null,
  json_content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 创建索引
create index if not exists idx_workspace_id on replenishment_data(workspace_id);

-- 3. 开启 Realtime (关键步骤)
alter publication supabase_realtime add table replenishment_data;

-- 4. 关闭 RLS (允许读写)
alter table replenishment_data disable row level security;`;

interface CloudConnectProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceId: string | null;
  onConnect: (workspaceId: string) => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}

export const CloudConnect: React.FC<CloudConnectProps> = ({ 
  isOpen,
  onClose,
  currentWorkspaceId, 
  onConnect, 
  onDisconnect, 
  isSyncing 
}) => {
  const [mode, setMode] = useState<'connect' | 'config'>('connect'); 
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [inputId, setInputId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize state when opening
  useEffect(() => {
    if (isOpen) {
        const configured = isSupabaseConfigured();
        setIsConfigured(configured);
        // If not configured, force config mode. Otherwise default to connect mode.
        if (!configured) {
            setMode('config');
        } else {
            setMode('connect');
        }
        setErrorMsg(null);
        
        // Pre-fill existing config if available (for editing)
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
          
          // Allow error 42P01 (table undefined) as we provide SQL, but block auth errors
          if (error && (error.code === 'PGRST301' || error.message.includes('JWT') || error.code === '28P01')) {
               throw new Error("认证失败：API Key 无效");
          } else if (error && error.code !== '42P01') {
               // Log other errors but might still be connectivity issues
               console.warn("Connection warning:", error);
          }

          saveSupabaseConfig(url, key);
          setIsConfigured(true);
          setMode('connect');
      } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || "验证失败，请检查配置");
      } finally {
          setIsLoading(false);
      }
  };

  const handleConnectWorkspace = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputId.trim()) {
          onConnect(inputId.trim());
          // We intentionally don't close automatically so user sees the "Connected" state
      }
  };

  const handleCopyConfig = () => {
      const config = getSupabaseConfig();
      const text = `Supabase Config:\nURL: ${config.url}\nKey: ${config.key}\nWorkspace: ${currentWorkspaceId}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Close only if clicking the background overlay, not the modal content
      if (e.target === e.currentTarget) {
          onClose();
      }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-fade-in"
        onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative max-h-[90vh]">
         
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
             <div className="flex items-center gap-2 text-gray-800">
                 <Settings className="text-gray-500" size={20} />
                 <h2 className="font-bold text-lg">系统设置</h2>
             </div>
             <button 
                type="button" 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
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

                 {/* State: Connected */}
                 {currentWorkspaceId ? (
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
                                onClick={onDisconnect}
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
                                 <div className="text-[10px] text-gray-400 text-center">
                                     首次使用？请在 Supabase SQL Editor 执行初始化脚本。
                                     <button type="button" onClick={() => { navigator.clipboard.writeText(INIT_SQL); alert("SQL 已复制到剪贴板"); }} className="text-blue-500 ml-1 hover:underline font-medium">复制 SQL</button>
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
                                         输入团队 ID (如 "Team-A") 以同步数据，或
                                         <button type="button" onClick={() => setMode('config')} className="text-blue-500 hover:underline ml-1">修改配置</button>
                                     </p>
                                 </div>
                                 <input 
                                    type="text"
                                    placeholder="输入 Workspace ID..."
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

             {/* Section 2: Logistics Tracking */}
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