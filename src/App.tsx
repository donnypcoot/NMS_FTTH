import React, { useState, useEffect } from 'react';
import { Customer, Device, FiberCable, NetworkLog, ODP, UserAccount } from './types';
import { apiService } from './services/apiService';
import { GoogleMapsQuotaBanner } from './components/GoogleMapsQuotaBanner';
import { Navbar, AppTab } from './components/Navbar';
import { NetworkMapEditor } from './components/MapEditor/NetworkMapEditor';
import { CustomerManager } from './components/Customers/CustomerManager';
import { DeviceMonitor } from './components/Monitoring/DeviceMonitor';
import { MikrotikManager } from './components/Mikrotik/MikrotikManager';
import { GenieAcsManager } from './components/GenieAcs/GenieAcsManager';
import { UserManager } from './components/Users/UserManager';
import { LoginPortal } from './components/Auth/LoginPortal';
import { DatabaseSqlModal } from './components/Database/DatabaseSqlModal';
import { ShieldAlert, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('map');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(apiService.isAuthenticated());
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // Core domain states
  const [customers, setCustomers] = useState<Customer[]>(apiService.getCustomers());
  const [devices, setDevices] = useState<Device[]>(apiService.getDevices());
  const [odps, setOdps] = useState<ODP[]>(apiService.getOdps());
  const [cables, setCables] = useState<FiberCable[]>(apiService.getFiberCables());
  const [logs, setLogs] = useState<NetworkLog[]>(apiService.getLogs());

  // User accounts and active session (RBAC)
  const [users, setUsers] = useState<UserAccount[]>(apiService.getUsers());
  const [currentUser, setCurrentUser] = useState<UserAccount>(apiService.getCurrentUser());

  // Demo vs Live Server Mode
  const [isLiveMode, setIsLiveMode] = useState<boolean>(apiService.getLiveMode());

  // Subscribe to apiService updates
  useEffect(() => {
    const unsubscribe = apiService.subscribe(() => {
      setCustomers(apiService.getCustomers());
      setDevices(apiService.getDevices());
      setOdps(apiService.getOdps());
      setCables(apiService.getFiberCables());
      setLogs(apiService.getLogs());
      setUsers(apiService.getUsers());
      setCurrentUser(apiService.getCurrentUser());
      setIsLiveMode(apiService.getLiveMode());
      setIsAuthenticated(apiService.isAuthenticated());
    });
    return unsubscribe;
  }, []);

  const handleLocateOnMap = (lat: number, lng: number) => {
    setActiveTab('map');
  };

  const handleSelectCurrentUser = (user: UserAccount) => {
    setCurrentUser(user);
    apiService.setCurrentUser(user);
  };

  const handleToggleLiveMode = (live: boolean) => {
    setIsLiveMode(live);
    apiService.setLiveMode(live);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
  };

  // If not authenticated, display full-screen Login Portal
  if (!isAuthenticated) {
    return (
      <>
        <LoginPortal
          onLoginSuccess={handleLoginSuccess}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
        />
        <DatabaseSqlModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Required Google Maps Platform Demo Quota Banner */}
      <GoogleMapsQuotaBanner />

      {/* Main App Navigation with Role Badge & User Switcher */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        logs={logs}
        currentUser={currentUser}
        users={users}
        onSelectCurrentUser={handleSelectCurrentUser}
        isLiveMode={isLiveMode}
        onToggleLiveMode={handleToggleLiveMode}
        onLogout={handleLogout}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      {/* Role Notice Banner if in restricted view */}
      {currentUser.role === 'BILLING_CS' && (activeTab === 'mikrotik' || activeTab === 'genieacs') && (
        <div className="bg-amber-950/70 border-b border-amber-800 text-amber-300 px-4 py-2 text-xs flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>
            Mode Terbatas: Akun Anda <strong>{currentUser.name}</strong> berperan sebagai <strong>Kasir &amp; Billing CS</strong>. Modul router dan perangkat ini hanya dapat dilihat dalam mode tinjau.
          </span>
        </div>
      )}

      {currentUser.role === 'TEKNISI' && activeTab === 'mikrotik' && (
        <div className="bg-blue-950/70 border-b border-blue-800 text-blue-300 px-4 py-2 text-xs flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>
            Mode Teknisi: Anda dapat melihat antarmuka dan trafik MikroTik untuk pemeliharaan jalur fiber, perubahan routing core dibatasi untuk Super Admin.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-24 md:pb-8">
        {activeTab === 'map' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Map Editor Persebaran Perangkat &amp; Jalur Fiber Optic
                </h1>
                <p className="text-xs text-slate-400">
                  Visualisasi GIS penempatan tiang ODP, ODC, OLT, dan tarikan kabel drop wire ke rumah pelanggan berbasis Google Maps Platform.
                </p>
              </div>
            </div>

            <NetworkMapEditor
              devices={devices}
              odps={odps}
              cables={cables}
              customers={customers}
              onUpdateDevices={setDevices}
              onUpdateOdps={setOdps}
              onUpdateCables={setCables}
              onUpdateCustomers={setCustomers}
            />
          </div>
        )}

        {activeTab === 'customers' && (
          <CustomerManager
            customers={customers}
            odps={odps}
            onUpdateCustomers={setCustomers}
            onLocateOnMap={handleLocateOnMap}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceMonitor
            devices={devices}
            onUpdateDevices={setDevices}
            onLocateOnMap={handleLocateOnMap}
          />
        )}

        {activeTab === 'mikrotik' && (
          <MikrotikManager
            customers={customers}
            onUpdateCustomers={setCustomers}
          />
        )}

        {activeTab === 'genieacs' && (
          <GenieAcsManager
            devices={devices}
            onUpdateDevices={setDevices}
          />
        )}

        {activeTab === 'users' && (
          <UserManager
            users={users}
            currentUser={currentUser}
            onUpdateUsers={setUsers}
            onSelectCurrentUser={handleSelectCurrentUser}
          />
        )}
      </main>

      {/* System Footer with deployment note and SQL schema shortcut */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-4 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between max-w-7xl mx-auto w-full gap-2 mb-16 md:mb-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
          <span>Arsitektur Server: Ubuntu LTS • Nginx Web Server • MariaDB Database</span>
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-1 cursor-pointer font-mono text-[11px]"
          >
            [Lihat database.sql]
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Role Aktif: <strong className="text-slate-300 font-mono">{currentUser.role}</strong> ({currentUser.name})
          </span>
          <button
            onClick={handleLogout}
            className="text-rose-400 hover:text-rose-300 cursor-pointer text-[11px] underline"
          >
            Logout
          </button>
        </div>
      </footer>

      {/* Database SQL Modal */}
      <DatabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
}
