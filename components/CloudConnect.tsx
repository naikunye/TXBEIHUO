import React, { useState, useEffect } from 'react';
import { Cloud, CloudLightning, CloudOff, Users, CheckCircle2, Loader2, LogOut, Database, AlertCircle, Settings, Key, Link, RefreshCcw, FileCode, Copy, Check } from 'lucide-react';
import { supabase, saveSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured } from '../lib/supabaseClient';
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

-- 3. 关闭 RLS (允许读写)
alter table replenishment_data disable row level security;`;

interface CloudConnectProps {
  currentWorkspaceId: string | null;
  onConnect: (workspaceId: string) => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}

export const CloudConnect: React.FC<CloudConnectProps> = ({ 
  currentWorkspaceId, 
  onConnect, 
  onDisconnect, 
  isSyncing 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'connect' | 'config'>('connect'); 
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Workspace ID State
  const [inputId, setInputId] = useState('');
  
  // Config State
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
        setMode('config');
    }
  }, [isOpen]);

  const handleCopySql = () => {
      navigator.clipboard.writeText(INIT_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // 1. 验证并保存 Supabase URL/Key
  const handleVerifyAndSave = async (e: React.FormEvent) => {
      e.preventDefault();
      
      let url = configUrl.trim().replace(/\/$/, "");
      const key = configKey.trim();

      if (!url || !key) {
          setErrorMsg("请输入完整的 URL 和 Anon Key");
          return;
      }
      if (!url.startsWith('http')) {
          setErrorMsg("URL 必须以 http 或 https 开头");
          return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      try {
          const tempClient = createClient(url, key);
          
          const { error } = await tempClient
              .from('replenishment_data')
              .select('id')
              .limit(1);

          if (error) {
             console.error("Verification error:", error);
             
             if (error.code === '42P01' || error.message.includes('does not exist')) {
                 setShowSql(true); // Auto show SQL if table missing
                 throw new Error("连接成功，但数据库表 'replenishment_data' 不存在。请点击下方按钮复制 SQL 并在 Supabase 执行。");
             } else if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('API key') || error.code === '28P01') {
                 throw new Error("认证失败：API Key 无效或不匹配。");
             } else if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
                 throw new Error("网络连接失败：无法访问该 Supabase URL，请检查网址。");
             } else {
                 throw new Error(`连接验证失败: ${error.message}`);
             }
          }

          saveSupabaseConfig(url, key);
          setMode('connect'); 
          
      } catch (err: any) {
          setErrorMsg(err.message || "未知错误，请重试。");
          setIsLoading(false); 
      }
  };

  // 2. 连接特定 Workspace
  const handleConnectWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    
    setIsLoading(true);
    setErrorMsg(null);

    try {
        const { error } = await supabase
            .from('replenishment_data')
            .select('id')
            .limit(1);

        if (error) {
            if (error.code === '42P01') {
                 setShowSql(true);
                 throw new Error("数据库表不存在，请重新配置数据库或运行 SQL。");
            } else {
                 throw new Error("无法读取数据，可能 Key 已失效，请重置配置。");
            }
        }

        onConnect(inputId);
        setIsOpen(false);
        setInputId('');
    } catch (err: any) {
        console.error("Connection failed:", err);
        setErrorMsg(err.message || "连接失败，请检查配置。");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('确定要退出当前云端工作区吗？(本地缓存将保留)')) {
      onDisconnect();
      setIsOpen(false);
    }
  };
  
  const handleClearConfig = () => {
      if(window.confirm('确定要清除保存的 Supabase URL 和 Key，并退出当前工作区吗？')) {
          onDisconnect();
          clearSupabaseConfig();
      }
  };

  // --- Render: Connected State ---
  if (currentWorkspaceId) {
    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium shadow-sm ${
            isSyncing 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {isSyncing ? <CloudLightning size={14} className="animate-pulse" /> : <Cloud size={14} />}
          <span>{currentWorkspaceId}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1"></span>
        </button>

        {isOpen && (
           <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-20 p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                    <div className="bg-emerald-100 p-2 rounded-full">
                        <Database size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">当前工作区</p>
                        <p className="font-bold text-gray-800 text-sm truncate w-40">{currentWorkspaceId}</p>
                    </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>同步状态</span>
                        {isSyncing ? <span className="text-blue-500 font-medium">同步中...</span> : <span className="text-emerald-500 font-medium">已连接</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <button 
                        onClick={handleDisconnect}
                        className="w-full flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 p-2 rounded-lg text-sm transition-colors"
                    >
                        <LogOut size={14} />
                        退出工作区
                    </button>
                    <button 
                        onClick={handleClearConfig}
                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm transition-colors border border-transparent hover:border-red-100"
                    >
                        <RefreshCcw size={14} />
                        重置数据库配置
                    </button>
                </div>
            </div>
           </>
        )}
      </div>
    );
  }

  // --- Render: Disconnected / Setup State ---
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
      >
        <CloudOff size={16} />
        <span>{isConfigured ? '连接云端' : '配置数据库'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="bg-slate-900 p-6 text-white relative flex-shrink-0">
                  <div className="flex items-center justify-center mb-3">
                      <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
                        {mode === 'config' ? <Settings size={24} className="text-blue-300"/> : <Database size={24} className="text-emerald-300" />}
                      </div>
                  </div>
                  <h3 className="text-lg font-bold text-center">
                      {mode === 'config' ? '配置 Supabase' : '连接云端工作区'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 text-center">
                      {mode === 'config' ? '请输入您的 Supabase 项目连接信息' : '输入团队 ID 以同步数据'}
                  </p>
                  
                  {mode === 'connect' && (
                      <button 
                        onClick={() => setMode('config')}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        title="修改数据库配置"
                      >
                          <Settings size={16} />
                      </button>
                  )}
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                  {/* --- Mode: Config URL/Key --- */}
                  {mode === 'config' && (
                      <form onSubmit={handleVerifyAndSave} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project URL</label>
                              <div className="relative">
                                  <Link className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                  <input 
                                      type="text" 
                                      required
                                      value={configUrl}
                                      onChange={(e) => setConfigUrl(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                      placeholder="https://xyz.supabase.co"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anon API Key</label>
                              <div className="relative">
                                  <Key className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                  <input 
                                      type="password" 
                                      required
                                      value={configKey}
                                      onChange={(e) => setConfigKey(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                      placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                                  />
                              </div>
                          </div>

                          {errorMsg && (
                              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 items-start animate-fade-in">
                                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-red-600 leading-tight">
                                      {errorMsg}
                                  </div>
                              </div>
                          )}

                          <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                          >
                               {isLoading ? (
                                  <>
                                    <Loader2 size={18} className="animate-spin" />
                                    验证连接...
                                  </>
                              ) : (
                                  '验证并保存配置'
                              )}
                          </button>
                          
                          {/* SQL Helper Button */}
                          <div className="pt-2 border-t border-gray-100 mt-2">
                             <button
                                type="button"
                                onClick={() => setShowSql(!showSql)}
                                className="text-xs text-blue-500 flex items-center gap-1 hover:underline mx-auto"
                             >
                                <FileCode size={12} />
                                {showSql ? '隐藏 SQL 代码' : '查看 Supabase 建表 SQL'}
                             </button>
                             
                             {showSql && (
                                <div className="mt-2 bg-slate-800 rounded-lg p-3 relative group animate-fade-in">
                                    <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                        {INIT_SQL}
                                    </pre>
                                    <button 
                                        type="button"
                                        onClick={handleCopySql}
                                        className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
                                        title="复制 SQL"
                                    >
                                        {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14} />}
                                    </button>
                                </div>
                             )}
                          </div>

                          {isConfigured && !isLoading && (
                              <div className="flex flex-col gap-2 mt-2">
                                  <button 
                                    type="button" 
                                    onClick={() => setMode('connect')}
                                    className="w-full text-center text-gray-400 text-xs hover:text-gray-600"
                                  >
                                      返回连接
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={handleClearConfig}
                                    className="w-full text-center text-red-400 hover:text-red-500 text-xs border border-red-100 py-2 rounded-lg bg-red-50/50"
                                  >
                                      清除配置并重置
                                  </button>
                              </div>
                          )}
                      </form>
                  )}

                  {/* --- Mode: Connect Workspace --- */}
                  {mode === 'connect' && (
                      <form onSubmit={handleConnectWorkspace} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Workspace ID (团队标识)</label>
                              <div className="relative">
                                  <Users className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                  <input 
                                      type="text" 
                                      required
                                      value={inputId}
                                      onChange={(e) => setInputId(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none"
                                      placeholder="例如: team-01"
                                  />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">
                                  任意输入一个 ID (如 'team-a')，与同事分享此 ID 即可看到相同数据。
                              </p>
                          </div>
                          
                          {errorMsg && (
                              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex gap-2 items-start">
                                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-red-600 leading-tight">
                                      {errorMsg}
                                  </div>
                              </div>
                          )}

                          {showSql && (
                                <div className="bg-slate-800 rounded-lg p-3 relative group animate-fade-in mb-4">
                                    <p className="text-[10px] text-slate-400 mb-1">请在 Supabase SQL Editor 执行：</p>
                                    <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                        {INIT_SQL}
                                    </pre>
                                    <button 
                                        type="button"
                                        onClick={handleCopySql}
                                        className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
                                        title="复制 SQL"
                                    >
                                        {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14} />}
                                    </button>
                                </div>
                           )}

                          <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                              {isLoading ? (
                                  <>
                                    <Loader2 size={18} className="animate-spin" />
                                    连接中...
                                  </>
                              ) : (
                                  <>
                                    进入工作区
                                    <CheckCircle2 size={18} />
                                  </>
                              )}
                          </button>
                          
                          {/* Explicit Reconfigure Button */}
                          <button 
                            type="button"
                            onClick={() => { setShowSql(false); setMode('config'); }}
                            className="w-full flex items-center justify-center gap-2 bg-gray-50 text-blue-600 hover:bg-blue-50 py-2.5 rounded-lg text-xs font-semibold transition-colors mt-4 border border-gray-100 hover:border-blue-100"
                          >
                              <Settings size={14} />
                              修改数据库连接配置 (URL/Key)
                          </button>

                          <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-full text-center text-gray-400 text-xs hover:text-gray-600 mt-1"
                          >
                              取消
                          </button>
                      </form>
                  )}
              </div>
           </div>
        </div>
      )}
    </>
  );
};