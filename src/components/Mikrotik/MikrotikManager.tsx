import React, { useState } from 'react';
import { Customer, MikrotikConfig } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Wifi,
  Radio,
  FileCode,
  Copy,
  Check,
  Power,
  RotateCw,
  Terminal,
  ShieldCheck,
  Download,
  Settings,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Play,
  Search,
  Lock,
  Unlock,
  ShieldAlert,
  Filter,
  Users,
} from 'lucide-react';

interface MikrotikManagerProps {
  customers: Customer[];
  onUpdateCustomers?: (customers: Customer[]) => void;
}

export const MikrotikManager: React.FC<MikrotikManagerProps> = ({
  customers,
  onUpdateCustomers,
}) => {
  const [mikrotikCfg, setMikrotikCfg] = useState<MikrotikConfig>(apiService.getMikrotikConfig());
  const [activeTab, setActiveTab] = useState<'sessions' | 'connection' | 'interfaces' | 'queues' | 'script'>('sessions');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Search & Filter state for customers in MikroTik API
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ISOLIR'>('ALL');

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    message?: string;
    details?: any;
  }>({
    connected: true,
    latencyMs: 1.2,
    message: 'Terhubung ke MikroTik RouterOS v7.14.3',
  });

  // Filtered customers for MikroTik PPPoE secrets / connections
  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.pppoeUsername.toLowerCase().includes(q) ||
        c.assignedIp.toLowerCase().includes(q) ||
        c.packageName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleIsolir = async (customer: Customer) => {
    setActionLoading(customer.id);
    const res = apiService.toggleCustomerIsolir(customer.id);
    setActionLoading(null);
    if (onUpdateCustomers) {
      onUpdateCustomers(apiService.getCustomers());
    }
    setNotice(res.message);
    setTimeout(() => setNotice(null), 3500);
  };

  // Active Sessions
  const activeSessions = customers
    .filter((c) => c.status === 'ACTIVE')
    .map((c, idx) => ({
      id: `session-${c.id}`,
      user: c.pppoeUsername,
      customerName: c.name,
      callerId: `48:8D:36:${(10 + idx).toString(16).toUpperCase()}:${(20 + idx).toString(16).toUpperCase()}:44`,
      address: c.assignedIp,
      uptime: `${Math.floor(2 + idx * 3)}d ${Math.floor(10 + idx * 2)}h ${Math.floor(20 + idx * 5)}m`,
      rxBytes: (1024 * 1024 * 1024 * (4 + idx * 2.5)).toFixed(1), // GB
      txBytes: (1024 * 1024 * 1024 * (1.2 + idx * 0.8)).toFixed(1), // GB
      service: 'pppoe',
    }));

  const interfaces = [
    {
      name: 'sfp-plus1 (Uplink BGP)',
      type: '10G SFP+',
      rxRate: '345.8 Mbps',
      txRate: '189.2 Mbps',
      packets: '42,100 pps',
      status: 'UP (10Gbps full-duplex)',
    },
    {
      name: 'ether1-olt-trunk (OLT ZTE)',
      type: '1G Ethernet',
      rxRate: '88.4 Mbps',
      txRate: '210.6 Mbps',
      packets: '28,400 pps',
      status: 'UP (1Gbps full-duplex)',
    },
    {
      name: 'ether2-lan-noc',
      type: '1G Ethernet',
      rxRate: '2.1 Mbps',
      txRate: '1.4 Mbps',
      packets: '420 pps',
      status: 'UP (1Gbps full-duplex)',
    },
  ];

  const queues = [
    { name: 'QUEUE-20M-DEFAULT', target: '10.10.100.0/24', maxLimit: '10M/20M', burstLimit: '15M/30M', packetMarks: 'none' },
    { name: 'QUEUE-50M-FAMILY', target: '10.10.100.0/24', maxLimit: '25M/50M', burstLimit: '35M/60M', packetMarks: 'none' },
    { name: 'QUEUE-100M-GAMER', target: '10.10.100.0/24', maxLimit: '50M/100M', burstLimit: '75M/120M', packetMarks: 'none' },
    { name: 'QUEUE-ISOLIR-LIMITED', target: '10.10.200.0/24', maxLimit: '256k/512k', burstLimit: 'none', packetMarks: 'none' },
  ];

  const handleKick = async (user: string) => {
    setActionLoading(user);
    const res = await apiService.kickPppoeSession(user);
    setActionLoading(null);
    setNotice(res.message);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(apiService.generateMikrotikScript());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const text = apiService.generateMikrotikScript();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik_netnms_config_${new Date().toISOString().split('T')[0]}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.saveMikrotikConfig(mikrotikCfg);
    setNotice(`Pengaturan koneksi MikroTik (${mikrotikCfg.host}:${mikrotikCfg.apiPort}) berhasil disimpan!`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const res = await apiService.testMikrotikConnection(mikrotikCfg);
    setTestingConnection(false);
    setConnectionStatus({
      connected: res.success,
      latencyMs: res.latencyMs,
      message: res.message,
      details: res.details,
    });
    setNotice(res.message);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="bg-blue-600/90 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-white hover:text-blue-200">✕</button>
        </div>
      )}

      {/* Router Info Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">MikroTik RouterOS API &amp; Core</h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                  connectionStatus.connected
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{connectionStatus.connected ? `CONNECTED (${connectionStatus.latencyMs} ms)` : 'DISCONNECTED'}</span>
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Host: <span className="text-slate-300 font-semibold">{mikrotikCfg.host}:{mikrotikCfg.apiPort}</span> • {mikrotikCfg.restEnabled ? 'RouterOS v7 REST' : 'API Socket Port 8728'}
            </div>
          </div>
        </div>

        {/* Live System Specs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 text-xs w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">CPU Load</div>
              <div className="font-mono font-bold text-slate-200">14% (36 Cores)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700">
            <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">RAM Terpakai</div>
              <div className="font-mono font-bold text-slate-200">1.8 / 16.0 GB</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Router Uptime</div>
              <div className="font-mono font-bold text-slate-200">42d 18h 33m</div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('connection')}
            className="bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 text-blue-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto col-span-2 sm:col-span-1"
            title="Buka menu pengaturan koneksi API MikroTik"
          >
            <Settings className="w-4 h-4" />
            <span>Koneksi API</span>
          </button>
        </div>
      </div>

      {/* Tabs - Scrollable on Mobile */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 text-xs font-medium space-x-2 pb-1">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'sessions'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Sesi Aktif PPPoE ({activeSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('connection')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'connection'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan &amp; Status API</span>
        </button>
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'interfaces'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Monitor Interface &amp; Trafik
        </button>
        <button
          onClick={() => setActiveTab('queues')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'queues'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Simple Queues (Limit Bandwidth)
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'script'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Generator Script CLI (.rsc)
        </button>
      </div>

      {/* Tab: Connection Setup (Baru Ditambahkan) */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Connection Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>Menu Koneksi API Router MikroTik</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasikan alamat IP, port API/REST, serta kredensial otentikasi RouterOS.
              </p>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">IP Address / Host Router MikroTik</label>
                <input
                  type="text"
                  required
                  value={mikrotikCfg.host}
                  onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, host: e.target.value })}
                  placeholder="Contoh: 10.10.0.1 atau 192.168.88.1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Port API</label>
                  <input
                    type="number"
                    required
                    value={mikrotikCfg.apiPort}
                    onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, apiPort: Number(e.target.value) })}
                    placeholder="8728 / 443"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">8728 (API) / 8729 (SSL) / 80/443 (REST)</div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tipe Protokol API</label>
                  <select
                    value={mikrotikCfg.restEnabled ? 'REST' : 'SOCKET'}
                    onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, restEnabled: e.target.value === 'REST' })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="REST">RouterOS v7 REST API (HTTP)</option>
                    <option value="SOCKET">RouterOS v6/v7 Binary API (Port 8728)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">API Username</label>
                  <input
                    type="text"
                    required
                    value={mikrotikCfg.username}
                    onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, username: e.target.value })}
                    placeholder="admin"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">API Password</label>
                  <input
                    type="password"
                    value={mikrotikCfg.password}
                    onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 text-blue-400 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Menguji Koneksi...' : 'Uji Koneksi API'}</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-lg cursor-pointer"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>

          {/* Connection Diagnostic / Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Status Endpoint MikroTik</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  connectionStatus.connected
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {connectionStatus.connected ? 'ONLINE & SYNCED' : 'TERPUTUS'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Endpoint Target:</span>
                <span className="font-mono text-white">{mikrotikCfg.host}:{mikrotikCfg.apiPort}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Protokol:</span>
                <span className="text-slate-200">{mikrotikCfg.restEnabled ? 'REST API (v7)' : 'API Socket (Port 8728)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Latency Handshake:</span>
                <span className="font-mono text-emerald-400">{connectionStatus.latencyMs || 1.2} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Versi RouterOS:</span>
                <span className="font-mono text-slate-200">RouterOS v7.14.3</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Model Board:</span>
                <span className="font-mono text-purple-300">CCR1036-8G-2S+</span>
              </div>
            </div>

            {/* Diagnostic Command Helper */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-slate-500"># Pastikan layanan API aktif di MikroTik:</div>
              <div className="text-emerald-400">/ip service enable api</div>
              <div className="text-emerald-400">/ip service enable www-ssl # untuk REST</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: PPPoE Sessions & Isolir Pelanggan */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {/* Kolom Search & Filter Pencarian Pelanggan */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari pelanggan (Ketik Nama, Username PPPoE, IP Dial-Up, atau ID)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
              >
                <option value="ALL">Semua Pelanggan ({customers.length})</option>
                <option value="ACTIVE">Aktif ({customers.filter((c) => c.status === 'ACTIVE').length})</option>
                <option value="ISOLIR">Terisolir ({customers.filter((c) => c.status === 'ISOLIR').length})</option>
              </select>
            </div>
          </div>

          {/* Mobile PPPoE Customers & Isolir Cards (Visible on Mobile/Small Screens) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                Tidak ada pelanggan yang sesuai dengan pencarian "{searchTerm}"
              </div>
            ) : (
              filteredCustomers.map((c, idx) => {
                const isIsolir = c.status === 'ISOLIR';
                const isActive = c.status === 'ACTIVE';
                const isLoadingThis = actionLoading === c.id || actionLoading === c.pppoeUsername;

                return (
                  <div
                    key={c.id}
                    className={`bg-slate-900 border rounded-xl p-3.5 space-y-3 transition-colors ${
                      isIsolir ? 'border-rose-800/60 bg-rose-950/15' : 'border-slate-800'
                    }`}
                  >
                    {/* Header: PPPoE Username, Customer Name, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-blue-400 font-bold text-sm">
                          {c.pppoeUsername}
                        </div>
                        <div className="text-white font-medium text-xs mt-0.5">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {c.id} • {c.phone}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>ONLINE</span>
                          </span>
                        ) : isIsolir ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>TERISOLIR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <span>{c.status}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {isActive ? 'Up: 2d 14h' : 'Limit'}
                        </span>
                      </div>
                    </div>

                    {/* Network & Profile Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                      <div>
                        <div className="text-[10px] text-slate-400">IP Dial-Up</div>
                        <div className={`font-mono text-xs font-semibold mt-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {c.assignedIp}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Caller: 48:8D:36:{String(idx + 10).padStart(2, '0')}:A4
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400">Profil RouterOS</div>
                        <div className="mt-0.5">
                          {isIsolir ? (
                            <span className="inline-flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                              <Lock className="w-2.5 h-2.5 text-rose-400" />
                              <span>PROFILE-ISOLIR</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-950/80 text-blue-300 border border-blue-800/80 px-1.5 py-0.2 rounded text-[10px] font-mono">
                              <span>PROFILE-{c.speedMbps}M</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {c.packageName}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Thumb Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Isolir / Buka Isolir Button */}
                      {isIsolir ? (
                        <button
                          disabled={isLoadingThis}
                          onClick={() => handleToggleIsolir(c)}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition min-h-[38px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 disabled:opacity-50"
                        >
                          {isLoadingThis ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          <span>Buka Isolir</span>
                        </button>
                      ) : (
                        <button
                          disabled={isLoadingThis}
                          onClick={() => handleToggleIsolir(c)}
                          className="flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition min-h-[38px] bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/50 disabled:opacity-50"
                        >
                          {isLoadingThis ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                          <span>Isolir Pelanggan</span>
                        </button>
                      )}

                      {/* Putus Sesi PPPoE */}
                      {isActive ? (
                        <button
                          disabled={isLoadingThis}
                          onClick={() => handleKick(c.pppoeUsername)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium min-h-[38px] cursor-pointer disabled:opacity-50 transition"
                        >
                          {actionLoading === c.pppoeUsername ? 'Memutus...' : 'Putus Sesi'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono px-2 py-1">Di-Isolir</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table Container (Visible on Tablets & Desktops) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-800/60 border-b border-slate-800 flex flex-wrap justify-between items-center text-xs gap-2">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Manajemen PPPoE Secret &amp; Sesi RouterOS:</span>
                <code className="text-blue-400">/ppp/secret &amp; /ppp/active</code>
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Ditemukan: <strong className="text-white">{filteredCustomers.length}</strong> pelanggan</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">
                  {customers.filter((c) => c.status === 'ACTIVE').length} Aktif
                </span>
                <span>•</span>
                <span className="text-rose-400 font-medium">
                  {customers.filter((c) => c.status === 'ISOLIR').length} Terisolir
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Username &amp; Pelanggan</th>
                    <th className="py-3 px-4">IP Dial-Up</th>
                    <th className="py-3 px-4">Paket &amp; Profil RouterOS</th>
                    <th className="py-3 px-4">Status Koneksi</th>
                    <th className="py-3 px-4 text-center">Status &amp; Aksi Isolir</th>
                    <th className="py-3 px-4 text-right">Aksi Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada pelanggan yang sesuai dengan pencarian "{searchTerm}"
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c, idx) => {
                      const isIsolir = c.status === 'ISOLIR';
                      const isActive = c.status === 'ACTIVE';
                      const isLoadingThis = actionLoading === c.id || actionLoading === c.pppoeUsername;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isIsolir ? 'bg-rose-950/15' : ''
                          }`}
                        >
                          {/* Username & Pelanggan */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-blue-400 font-bold text-xs flex items-center gap-1.5">
                              <span>{c.pppoeUsername}</span>
                            </div>
                            <div className="text-white font-medium text-xs mt-0.5">{c.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{c.id} • {c.phone}</div>
                          </td>

                          {/* IP Dial-Up */}
                          <td className="py-3 px-4 font-mono">
                            <div className={`font-semibold ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {c.assignedIp}
                            </div>
                            <div className="text-[10px] text-slate-500">Caller ID: 48:8D:36:{String(idx + 10).padStart(2, '0')}:A4</div>
                          </td>

                          {/* Paket & Profil MikroTik */}
                          <td className="py-3 px-4">
                            <div className="text-slate-200 font-medium">{c.packageName}</div>
                            <div className="mt-1">
                              {isIsolir ? (
                                <span className="inline-flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                  <Lock className="w-2.5 h-2.5 text-rose-400" />
                                  <span>PROFILE-ISOLIR (256k/512k)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-blue-950/80 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded text-[10px] font-mono">
                                  <span>PROFILE-{c.speedMbps}M ({c.speedMbps} Mbps)</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Koneksi */}
                          <td className="py-3 px-4">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>ONLINE (AKTIF)</span>
                              </span>
                            ) : isIsolir ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <span>TERISOLIR</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                <span>{c.status}</span>
                              </span>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {isActive ? 'Uptime: 2d 14h 20m' : 'Koneksi Dibatasi'}
                            </div>
                          </td>

                          {/* Kolom Status & Aksi Isolir */}
                          <td className="py-3 px-4 text-center">
                            {isIsolir ? (
                              <button
                                disabled={isLoadingThis}
                                onClick={() => handleToggleIsolir(c)}
                                title="Buka isolir untuk mengaktifkan kembali koneksi internet dan merestore profil normal"
                                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-emerald-900/50 cursor-pointer disabled:opacity-50"
                              >
                                {isLoadingThis ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                                <span>Buka Isolir</span>
                              </button>
                            ) : (
                              <button
                                disabled={isLoadingThis}
                                onClick={() => handleToggleIsolir(c)}
                                title="Isolir pelanggan: ubah profil ke PROFILE-ISOLIR dan putus sesi aktif saat ini"
                                className="inline-flex items-center gap-1.5 bg-rose-600/80 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50"
                              >
                                {isLoadingThis ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                                <span>Isolir</span>
                              </button>
                            )}
                          </td>

                          {/* Aksi Sesi (Kick) */}
                          <td className="py-3 px-4 text-right">
                            {isActive ? (
                              <button
                                disabled={isLoadingThis}
                                onClick={() => handleKick(c.pppoeUsername)}
                                title="Putus sesi PPPoE ini agar ONT dial-up ulang"
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 transition"
                              >
                                {actionLoading === c.pppoeUsername ? 'Memutus...' : 'Putus Sesi'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-mono">Di-Isolir</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Interfaces */}
      {activeTab === 'interfaces' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {interfaces.map((iface) => (
            <div key={iface.name} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="font-bold text-white text-sm">{iface.name}</div>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                  {iface.type}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Traffic Download:</span>
                  <span className="font-mono font-bold text-emerald-400">{iface.rxRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Traffic Upload:</span>
                  <span className="font-mono font-bold text-blue-400">{iface.txRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Paket per Detik:</span>
                  <span className="font-mono text-slate-300">{iface.packets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Port:</span>
                  <span className="text-emerald-400 font-medium">{iface.status}</span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="pt-2">
                <div className="text-[10px] text-slate-400 mb-1">Utilisasi Kapasitas Port</div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[35%]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Queues */}
      {activeTab === 'queues' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-800/60 border-b border-slate-800 text-xs font-semibold text-slate-300">
            Daftar Simple Queue Pembatas Bandwidth: <code className="text-blue-400">/queue/simple/print</code>
          </div>
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Queue</th>
                <th className="py-3 px-4">Target IP Subnet</th>
                <th className="py-3 px-4">Max Limit (Up/Down)</th>
                <th className="py-3 px-4">Burst Limit</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {queues.map((q) => (
                <tr key={q.name} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-white font-bold">{q.name}</td>
                  <td className="py-3 px-4 text-blue-400">{q.target}</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">{q.maxLimit}</td>
                  <td className="py-3 px-4 text-slate-400">{q.burstLimit}</td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-400 text-[11px]">ACTIVE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: CLI Script */}
      {activeTab === 'script' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>RouterOS Auto Script Generator</span>
              </h3>
              <p className="text-xs text-slate-400">
                Salin script ini untuk mengkonfigurasi IP Pool, Profile Bandwidth, Profile Isolir, dan akun PPPoE di MikroTik secara instan.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyScript}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Script'}</span>
              </button>
              <button
                onClick={handleDownloadScript}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .rsc</span>
              </button>
            </div>
          </div>

          <pre className="bg-black/90 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
            {apiService.generateMikrotikScript()}
          </pre>
        </div>
      )}
    </div>
  );
};
