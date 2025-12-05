import React, { useState, useEffect } from 'react';
import { Cloud, CloudLightning, CloudOff, Users, CheckCircle2, Loader2, LogOut, Database, AlertCircle, Settings, Key, Link } from 'lucide-react';
import { supabase, saveSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured } from '../lib/supabaseClient';

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
  const [mode, setMode] = useState<'connect' | 'config'>('connect'); // 'connect' = 输入WorkspaceID, 'config' = 输入URL/Key
  
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
  }, []);

  // 1. 保存 Supabase URL/Key
  const handleSaveConfig = (e: React.FormEvent) => {
      e.preventDefault();
      if (!configUrl.trim() || !configKey.trim()) {
          setErrorMsg("请输入完整的 URL 和 Anon Key");
          return;
      }
      // 简单验证格式
      if (!configUrl.startsWith('http')) {
          setErrorMsg("URL 必须以 http 或 https 开头");
          return;
      }
      saveSupabaseConfig(configUrl.trim(), configKey.trim());
  };

  // 2. 连接特定 Workspace
  const handleConnectWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    
    setIsLoading(true);
    setErrorMsg(null);

    try {
        // 尝试连接 Supabase 进行验证
        const { error } = await supabase
            .from('replenishment_data')
            .select('id')
            .limit(1);

        if (error) {
            if (error.code === '42P01') {
                 throw new Error("连接成功，但数据库表不存在。请在 Supabase SQL Editor 中运行建表脚本。");
            } else if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('API key')) {
                 throw new Error("认证失败。请检查配置的 URL 和 Key 是否正确。");
            } else if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
                 throw new Error("网络错误，无法连接到 Supabase URL。");
            } else {
                 console.warn("Supabase check warning:", error);
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
    if (window.confirm('确定要退出当前云端工作区吗？')) {
      onDisconnect();
      setIsOpen(false);
    }
  };
  
  const handleClearConfig = () => {
      if(window.confirm('确定要清除保存的 Supabase URL 和 Key 吗？')) {
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
                     <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>配置模式</span>
                        <span className="text-gray-400">自定义</span>
                    </div>
                </div>

                <button 
                    onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded-lg text-sm transition-colors"
                >
                    <LogOut size={14} />
                    退出工作区
                </button>
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
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              
              {/* Header */}
              <div className="bg-slate-900 p-6 text-white relative">
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
              
              <div className="p-6">
                  {/* --- Mode: Config URL/Key --- */}
                  {mode === 'config' && (
                      <form onSubmit={handleSaveConfig} className="space-y-4">
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

                          {errorMsg && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{errorMsg}</p>}

                          <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200"
                          >
                              保存配置
                          </button>
                          
                          {isConfigured && (
                              <button 
                                type="button" 
                                onClick={() => setMode('connect')}
                                className="w-full text-center text-gray-400 text-xs hover:text-gray-600 mt-2"
                              >
                                  返回连接
                              </button>
                          )}
                          {isConfigured && (
                              <button 
                                type="button" 
                                onClick={handleClearConfig}
                                className="w-full text-center text-red-300 hover:text-red-500 text-xs mt-4"
                              >
                                  清除当前配置
                              </button>
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
                                      placeholder="例如: team-alpha"
                                  />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">
                                  用于区分同一数据库下的不同团队数据。
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
                          
                          <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-full text-center text-gray-400 text-xs hover:text-gray-600 mt-2"
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