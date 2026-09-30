import React, { useState } from 'react';
import {
  Map,
  Users,
  Activity,
  Radio,
  Router,
  Bell,
  Shield,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  LogOut,
  Database,
} from 'lucide-react';
import { NetworkLog, UserAccount } from '../types';

export type AppTab = 'map' | 'customers' | 'devices' | 'mikrotik' | 'genieacs' | 'users';

interface NavbarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  logs: NetworkLog[];
  currentUser: UserAccount;
  users: UserAccount[];
  onSelectCurrentUser: (user: UserAccount) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
  onLogout: () => void;
  onOpenSqlModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  logs,
  currentUser,
  users,
  onSelectCurrentUser,
  isLiveMode,
  onToggleLiveMode,
  onLogout,
  onOpenSqlModal,
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const criticalCount = logs.filter((l) => l.level === 'CRITICAL' || l.level === 'WARNING').length;

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    NetNMS <span className="text-blue-400">ISP</span>
                  </span>
                  <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded font-bold">
                    v2.5
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 hidden lg:block">
                  MikroTik + GenieACS + Google Maps Editor
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onSelectTab('map')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>Map Editor</span>
              </button>

              <button
                onClick={() => onSelectTab('customers')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Data Pelanggan</span>
              </button>

              <button
                onClick={() => onSelectTab('devices')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'devices'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Perangkat</span>
              </button>

              <button
                onClick={() => onSelectTab('mikrotik')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'mikrotik'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Router className="w-4 h-4" />
                <span>MikroTik</span>
              </button>

              <button
                onClick={() => onSelectTab('genieacs')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'genieacs'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>GenieACS</span>
              </button>

              <button
                onClick={() => onSelectTab('users')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Role &amp; User</span>
              </button>
            </nav>

            {/* Right Status Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Live vs Demo Switching Button */}
              <button
                onClick={() => onToggleLiveMode(!isLiveMode)}
                className={`px-2 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all ${
                  isLiveMode
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-sm'
                    : 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-sm'
                }`}
                title={
                  isLiveMode
                    ? 'Mode LIVE SERVER Aktif: Terkoneksi ke RouterOS & GenieACS. Klik untuk beralih ke Demo.'
                    : 'Mode DEMO SIMULATOR Aktif: Menggunakan data simulasi. Klik untuk beralih ke Live.'
                }
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isLiveMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">{isLiveMode ? '⚡ LIVE SERVER' : '🧪 DEMO MODE'}</span>
                <span className="sm:hidden">{isLiveMode ? 'LIVE' : 'DEMO'}</span>
              </button>

              {/* System Log Button */}
              <div className="relative">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer relative"
                  title="Log Aktivitas & Notifikasi Jaringan"
                >
                  <Bell className="w-4 h-4" />
                  {criticalCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-900">
                      {criticalCount}
                    </span>
                  )}
                </button>

                {/* Log Dropdown - Responsive for mobile */}
                {showLogs && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/50 sm:hidden"
                      onClick={() => setShowLogs(false)}
                    />
                    <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                        <span className="font-bold text-white">Log Aktivitas Terkini</span>
                        <button
                          onClick={() => setShowLogs(false)}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className={`p-2 rounded-lg border text-[11px] ${
                              log.level === 'CRITICAL'
                                ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                                : log.level === 'WARNING'
                                ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                                : log.level === 'SUCCESS'
                                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
                              <span className="font-bold text-slate-300">[{log.source}]</span>
                              <span>{log.timestamp}</span>
                            </div>
                            <div className="leading-relaxed">{log.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Current User Session & Role Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow transition-colors"
                  title="Ganti sesi role pengguna"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="leading-tight text-white">{currentUser.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-indigo-400 font-mono leading-tight">{currentUser.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* User switcher dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/50 sm:hidden"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 text-xs">
                      <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                        <span>Ganti Sesi Role (RBAC)</span>
                        <button
                          onClick={() => setShowUserMenu(false)}
                          className="sm:hidden text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSelectCurrentUser(u);
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                              u.id === currentUser.id
                                ? 'bg-indigo-950/80 border border-indigo-700 text-white'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{u.role}</div>
                            </div>
                            {u.id === currentUser.id && (
                              <UserCheck className="w-4 h-4 text-indigo-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
                        <button
                          onClick={() => {
                            onSelectTab('users');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 font-medium flex items-center justify-between cursor-pointer"
                        >
                          <span>Kelola Role &amp; Izin</span>
                          <span>&rarr;</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenSqlModal();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5 text-blue-400" />
                          <span>Skema MySQL (.sql)</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Keluar (Logout)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Dock) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-1 py-1 shadow-2xl safe-area-inset-bottom">
        <button
          onClick={() => onSelectTab('map')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'map' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'map' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Map className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">Map GIS</span>
        </button>

        <button
          onClick={() => onSelectTab('customers')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'customers' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">Pelanggan</span>
        </button>

        <button
          onClick={() => onSelectTab('devices')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'devices' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'devices' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">Perangkat</span>
        </button>

        <button
          onClick={() => onSelectTab('mikrotik')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'mikrotik' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'mikrotik' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Router className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">MikroTik</span>
        </button>

        <button
          onClick={() => onSelectTab('genieacs')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'genieacs' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'genieacs' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">GenieACS</span>
        </button>

        <button
          onClick={() => onSelectTab('users')}
          className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer rounded-xl touch-manipulation active:scale-95 select-none min-h-[44px] ${
            activeTab === 'users' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600/25 text-blue-400 shadow-sm' : ''}`}>
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-tight font-medium">User/Role</span>
        </button>
      </nav>
    </>
  );
};

