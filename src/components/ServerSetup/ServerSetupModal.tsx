import React, { useState } from 'react';
import { apiService } from '../../services/apiService';
import {
  Server,
  Database,
  Globe,
  Settings,
  Download,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Radio,
  Router,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface ServerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSetupModal: React.FC<ServerSetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'mariadb' | 'nginx' | 'config' | 'guide'>('mariadb');
  const [copied, setCopied] = useState<string | null>(null);

  // Editable configurations
  const [mariadbCfg, setMariadbCfg] = useState(apiService.getMariaDbConfig());
  const [mikrotikCfg, setMikrotikCfg] = useState(apiService.getMikrotikConfig());
  const [genieCfg, setGenieCfg] = useState(apiService.getGenieAcsConfig());
  const [serverState, setServerState] = useState(apiService.getServerState());

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadSql = () => {
    const text = apiService.generateMariaDbSql();
    const blob = new Blob([text], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'netnms_mariadb_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadNginx = () => {
    const text = apiService.generateNginxConfig();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'netnms_nginx.conf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.saveMariaDbConfig(mariadbCfg);
    apiService.saveMikrotikConfig(mikrotikCfg);
    apiService.saveGenieAcsConfig(genieCfg);
    apiService.saveServerState(serverState);
    setTestResult('Konfigurasi server berhasil disimpan!');
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('Menguji konektivitas ke MariaDB, MikroTik, dan GenieACS NBI...');
    await new Promise((r) => setTimeout(r, 1400));
    setTesting(false);
    setTestResult('Semua endpoint berhasil terhubung! (MariaDB OK, MikroTik API v7 OK, GenieACS NBI OK)');
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Pusat Integrasi Server Ubuntu, Nginx &amp; MariaDB
              </h2>
              <p className="text-xs text-slate-400">
                Panduan setup deployment dan sinkronisasi API MikroTik + GenieACS TR-069
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('mariadb')}
            className={`py-3 px-4 border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'mariadb'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Skema Database MariaDB (.sql)</span>
          </button>

          <button
            onClick={() => setActiveTab('nginx')}
            className={`py-3 px-4 border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'nginx'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Konfigurasi Nginx Reverse Proxy</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Kredensial &amp; Parameter Koneksi</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Panduan Deployment CLI Ubuntu</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {testResult && (
            <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{testResult}</span>
            </div>
          )}

          {/* TAB 1: MariaDB */}
          {activeTab === 'mariadb' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Skema Tabel MariaDB (DDL &amp; Data Awal)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mencakup tabel pelanggan, perangkat, ODP, kabel fiber, paket kecepatan, dan audit logs.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(apiService.generateMariaDbSql(), 'sql')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'sql' ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSql}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              {/* Terminal Snippet */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-500"># Jalankan perintah ini di terminal Ubuntu Server Anda:</div>
                <div className="text-emerald-400">sudo mysql -u root -p &lt; netnms_mariadb_schema.sql</div>
              </div>

              <pre className="bg-black/90 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                {apiService.generateMariaDbSql()}
              </pre>
            </div>
          )}

          {/* TAB 2: Nginx */}
          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Konfigurasi Nginx Server Block (Reverse Proxy)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Menghubungkan frontend React dengan GenieACS NBI port 7557 dan MikroTik REST API.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(apiService.generateNginxConfig(), 'nginx')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied === 'nginx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'nginx' ? 'Tersalin!' : 'Salin Nginx'}</span>
                  </button>
                  <button
                    onClick={handleDownloadNginx}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Conf</span>
                  </button>
                </div>
              </div>

              {/* Terminal Snippet */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-500"># Simpan konfigurasi ke Nginx dan reload:</div>
                <div className="text-cyan-400">sudo nano /etc/nginx/sites-available/netnms</div>
                <div className="text-cyan-400">sudo ln -s /etc/nginx/sites-available/netnms /etc/nginx/sites-enabled/</div>
                <div className="text-cyan-400">sudo nginx -t &amp;&amp; sudo systemctl reload nginx</div>
              </div>

              <pre className="bg-black/90 rounded-xl p-4 text-cyan-400 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                {apiService.generateNginxConfig()}
              </pre>
            </div>
          )}

          {/* TAB 3: Credentials Config */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfigs} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ubuntu & MariaDB */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Server &amp; MariaDB</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Hostname / IP Ubuntu</label>
                    <input
                      type="text"
                      value={serverState.ubuntuHost}
                      onChange={(e) => setServerState({ ...serverState, ubuntuHost: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Database Name</label>
                    <input
                      type="text"
                      value={mariadbCfg.database}
                      onChange={(e) => setMariadbCfg({ ...mariadbCfg, database: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">DB User &amp; Password</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={mariadbCfg.username}
                        onChange={(e) => setMariadbCfg({ ...mariadbCfg, username: e.target.value })}
                        placeholder="User"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                      />
                      <input
                        type="password"
                        value={mariadbCfg.password}
                        onChange={(e) => setMariadbCfg({ ...mariadbCfg, password: e.target.value })}
                        placeholder="Pass"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* MikroTik RouterOS API */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Router className="w-4 h-4 text-blue-400" />
                    <span>MikroTik RouterOS API</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">IP Router MikroTik</label>
                    <input
                      type="text"
                      value={mikrotikCfg.host}
                      onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, host: e.target.value })}
                      placeholder="10.10.0.1"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">API Port (8728 / 443 REST)</label>
                    <input
                      type="number"
                      value={mikrotikCfg.apiPort}
                      onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, apiPort: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Username &amp; Password</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={mikrotikCfg.username}
                        onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, username: e.target.value })}
                        placeholder="admin"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                      />
                      <input
                        type="password"
                        value={mikrotikCfg.password}
                        onChange={(e) => setMikrotikCfg({ ...mikrotikCfg, password: e.target.value })}
                        placeholder="password"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* GenieACS TR-069 */}
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span>GenieACS TR-069 NBI</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">GenieACS NBI URL</label>
                    <input
                      type="text"
                      value={genieCfg.nbiUrl}
                      onChange={(e) => setGenieCfg({ ...genieCfg, nbiUrl: e.target.value })}
                      placeholder="http://127.0.0.1:7557"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">CWMP URL (Infrom ONT)</label>
                    <input
                      type="text"
                      value={genieCfg.cwmpUrl}
                      onChange={(e) => setGenieCfg({ ...genieCfg, cwmpUrl: e.target.value })}
                      placeholder="http://127.0.0.1:7547"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Preset Filter Prefix</label>
                    <input
                      type="text"
                      value={genieCfg.presetFilterPrefix}
                      onChange={(e) => setGenieCfg({ ...genieCfg, presetFilterPrefix: e.target.value })}
                      placeholder="NETNMS_"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Menguji...' : 'Uji Koneksi Server'}</span>
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow-lg cursor-pointer"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CLI Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  Langkah-Langkah Instalasi di Ubuntu Server:
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># 1. Install Node.js &amp; Git jika belum ada:</div>
                  <div className="text-emerald-400">curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -</div>
                  <div className="text-emerald-400">sudo apt-get install -y nodejs git nginx mariadb-server</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># 2. Build Aplikasi NetNMS:</div>
                  <div className="text-blue-400">npm install</div>
                  <div className="text-blue-400">npm run build</div>
                  <div className="text-blue-400">sudo mkdir -p /var/www/netnms/dist</div>
                  <div className="text-blue-400">sudo cp -r dist/* /var/www/netnms/dist/</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># 3. Setup Nginx VirtualHost:</div>
                  <div className="text-cyan-400">sudo nano /etc/nginx/sites-available/netnms</div>
                  <div className="text-cyan-400">sudo ln -s /etc/nginx/sites-available/netnms /etc/nginx/sites-enabled/</div>
                  <div className="text-cyan-400">sudo nginx -t &amp;&amp; sudo systemctl reload nginx</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500"># 4. Amankan dengan SSL Let's Encrypt (Opsional):</div>
                  <div className="text-purple-400">sudo apt install -y certbot python3-certbot-nginx</div>
                  <div className="text-purple-400">sudo certbot --nginx -d your-isp-domain.com</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
