import React, { useState } from 'react';
import { Device, GenieAcsConfig } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Radio,
  Wifi,
  RotateCw,
  Power,
  Sliders,
  Settings,
  ListTree,
  Send,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Globe,
} from 'lucide-react';

interface GenieAcsManagerProps {
  devices: Device[];
  onUpdateDevices: (devices: Device[]) => void;
}

export const GenieAcsManager: React.FC<GenieAcsManagerProps> = ({
  devices,
  onUpdateDevices,
}) => {
  const [genieCfg, setGenieCfg] = useState<GenieAcsConfig>(apiService.getGenieAcsConfig());
  const ontDevices = devices.filter((d) => d.type === 'ONU');

  const [selectedDevice, setSelectedDevice] = useState<Device>(ontDevices[0] || devices[0]);
  const [activeTab, setActiveTab] = useState<'params' | 'wifi' | 'connection'>('params');
  const [paramSearch, setParamSearch] = useState('');

  // Wi-Fi form state
  const [wifiSsid, setWifiSsid] = useState(selectedDevice?.wifiSsid || 'My_Fiber_Home');
  const [wifiPassword, setWifiPassword] = useState('Password1234!');
  const [wifiChannel, setWifiChannel] = useState('Auto (Channel 6)');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    message?: string;
  }>({
    connected: true,
    latencyMs: 2.1,
    message: 'Terhubung ke GenieACS NBI port 7557',
  });

  // Simulated TR-069 Parameter Tree for the selected ONT
  const parameterTree = [
    { name: 'InternetGatewayDevice.DeviceInfo.Manufacturer', value: selectedDevice?.vendor || 'ZTE' },
    { name: 'InternetGatewayDevice.DeviceInfo.ModelName', value: selectedDevice?.model || 'ZXHN F609' },
    { name: 'InternetGatewayDevice.DeviceInfo.SerialNumber', value: selectedDevice?.serialNumber || 'ZTEGC7A88B12' },
    { name: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion', value: selectedDevice?.firmwareVersion || 'V3.0.0P1T3' },
    { name: 'InternetGatewayDevice.DeviceInfo.UpTime', value: selectedDevice?.uptime || '14d 06h 12m' },
    { name: 'VirtualParameters.OpticalRxPower', value: `${selectedDevice?.opticalRxPower || -19.4} dBm` },
    { name: 'VirtualParameters.OpticalTxPower', value: `${selectedDevice?.opticalTxPower || 2.1} dBm` },
    { name: 'VirtualParameters.OpticalTemperature', value: `${selectedDevice?.opticalTemperature || 38.2} °C` },
    { name: 'VirtualParameters.OpticalVoltage', value: `${selectedDevice?.opticalVoltage || 3.3} V` },
    { name: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username', value: `${selectedDevice?.name.toLowerCase()}@net` },
    { name: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress', value: selectedDevice?.ipAddress || '10.10.100.15' },
    { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', value: selectedDevice?.wifiSsid || 'WiFi_Rumah' },
    { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.RadioEnabled', value: 'true' },
    { name: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalAssociations', value: `${selectedDevice?.wifiClientsCount || 4}` },
  ];

  const filteredParams = parameterTree.filter((p) =>
    p.name.toLowerCase().includes(paramSearch.toLowerCase()) ||
    p.value.toLowerCase().includes(paramSearch.toLowerCase())
  );

  const handleApplyWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(`Mengirim parameter TR-069 setParameterValues ke ${selectedDevice.name}...`);

    await new Promise((r) => setTimeout(r, 1200));

    // Update in devices list
    const updated = devices.map((d) =>
      d.id === selectedDevice.id ? { ...d, wifiSsid } : d
    );
    onUpdateDevices(updated);
    apiService.saveDevices(updated);
    apiService.addLog('SUCCESS', 'GENIEACS', `SSID Wi-Fi ${selectedDevice.name} diubah menjadi "${wifiSsid}" via TR-069`);

    setLoading(false);
    setFeedback(`SSID Wi-Fi ${selectedDevice.name} berhasil diperbarui!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReboot = async () => {
    setLoading(true);
    const res = await apiService.rebootOnt(selectedDevice.id);
    setLoading(false);
    setFeedback(res.message);
    onUpdateDevices(apiService.getDevices());
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    const res = await apiService.refreshDeviceParameters(selectedDevice.id);
    setLoading(false);
    setFeedback(res.message);
    onUpdateDevices(apiService.getDevices());
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.saveGenieAcsConfig(genieCfg);
    setFeedback(`Konfigurasi GenieACS NBI (${genieCfg.nbiUrl}) berhasil disimpan!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const res = await apiService.testGenieAcsConnection(genieCfg);
    setTestingConnection(false);
    setConnectionStatus({
      connected: res.success,
      latencyMs: res.latencyMs,
      message: res.message,
    });
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="bg-blue-600/90 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-white hover:text-blue-200">✕</button>
        </div>
      )}

      {/* GenieACS Server Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">GenieACS TR-069 Auto Configuration Server</h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                  connectionStatus.connected
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{connectionStatus.connected ? `NBI & CWMP ONLINE (${connectionStatus.latencyMs} ms)` : 'OFFLINE'}</span>
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              NBI URL: <span className="text-slate-300 font-semibold">{genieCfg.nbiUrl}</span> • CWMP Port: <span className="text-slate-300">7547</span> • Terdaftar: {ontDevices.length} CPE ONT
            </div>
          </div>
        </div>

        {/* Selected CPE Switcher & Connection Settings Button */}
        <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('connection')}
            className="bg-purple-600/30 hover:bg-purple-600 border border-purple-500/50 text-purple-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka menu pengaturan koneksi server GenieACS"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Koneksi GenieACS</span>
          </button>

          <span className="text-slate-400 ml-1">Pilih ONT:</span>
          <select
            value={selectedDevice?.id}
            onChange={(e) => {
              const dev = ontDevices.find((d) => d.id === e.target.value);
              if (dev) {
                setSelectedDevice(dev);
                setWifiSsid(dev.wifiSsid || 'My_WiFi');
              }
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none flex-1 sm:flex-none"
          >
            {ontDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.serialNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected CPE Summary Card */}
      {selectedDevice && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">{selectedDevice.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedDevice.status === 'ONLINE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : selectedDevice.status === 'WARNING'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {selectedDevice.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                SN: {selectedDevice.serialNumber} • Model: {selectedDevice.vendor} {selectedDevice.model} • FW: {selectedDevice.firmwareVersion}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={handleRefresh}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Refresh Parameters</span>
              </button>

              <button
                disabled={loading}
                onClick={handleReboot}
                className="bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Reboot ONT</span>
              </button>
            </div>
          </div>

          {/* Optical Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">Optical Rx Power</div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  (selectedDevice.opticalRxPower || 0) < -27
                    ? 'text-rose-400'
                    : (selectedDevice.opticalRxPower || 0) < -24
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {selectedDevice.opticalRxPower} dBm
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">Optical Tx Laser</div>
              <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                {selectedDevice.opticalTxPower} dBm
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">Temperatur &amp; Voltase</div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                {selectedDevice.opticalTemperature}°C / {selectedDevice.opticalVoltage}V
              </div>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[11px]">Perangkat Klien Wi-Fi</div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                {selectedDevice.wifiClientsCount} User Terhubung
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 text-xs font-medium space-x-2 pb-1">
        <button
          onClick={() => setActiveTab('params')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'params'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Pohon Parameter TR-069
        </button>
        <button
          onClick={() => setActiveTab('wifi')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'wifi'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Konfigurasi Wi-Fi WLAN
        </button>
        <button
          onClick={() => setActiveTab('connection')}
          className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'connection'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan &amp; Status Server</span>
        </button>
      </div>

      {/* Tab: Server Connection Setup (Baru Ditambahkan) */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                <span>Pengaturan Koneksi GenieACS NBI</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alamat REST API Northbound Interface (NBI) GenieACS untuk kontrol provisioning TR-069.
              </p>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">GenieACS NBI URL (Port 7557)</label>
                <input
                  type="text"
                  required
                  value={genieCfg.nbiUrl}
                  onChange={(e) => setGenieCfg({ ...genieCfg, nbiUrl: e.target.value })}
                  placeholder="http://127.0.0.1:7557 atau http://genieacs.local:7557"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GenieACS CWMP URL (Port 7547)</label>
                <input
                  type="text"
                  required
                  value={genieCfg.cwmpUrl}
                  onChange={(e) => setGenieCfg({ ...genieCfg, cwmpUrl: e.target.value })}
                  placeholder="http://127.0.0.1:7547"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <div className="text-[10px] text-slate-500 mt-0.5">URL ini dikonfigurasikan di halaman WAN CPE/ONT sebagai ACS URL.</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">NBI Username (Opsional)</label>
                  <input
                    type="text"
                    value={genieCfg.username || ''}
                    onChange={(e) => setGenieCfg({ ...genieCfg, username: e.target.value })}
                    placeholder="admin"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">NBI Password (Opsional)</label>
                  <input
                    type="password"
                    value={genieCfg.password || ''}
                    onChange={(e) => setGenieCfg({ ...genieCfg, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Prefix Preset / Provisioning</label>
                <input
                  type="text"
                  value={genieCfg.presetFilterPrefix || 'NETNMS_'}
                  onChange={(e) => setGenieCfg({ ...genieCfg, presetFilterPrefix: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 text-purple-400 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Menguji NBI...' : 'Uji Koneksi Server'}</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-semibold shadow-lg cursor-pointer"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>

          {/* Connection Diagnostic / Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Status Endpoint GenieACS</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  connectionStatus.connected
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {connectionStatus.connected ? 'ONLINE & LISTENING' : 'TERPUTUS'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">NBI API Endpoint:</span>
                <span className="font-mono text-white">{genieCfg.nbiUrl}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">CWMP Inform Port:</span>
                <span className="font-mono text-purple-400">Port 7547 (Active)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Latency Response:</span>
                <span className="font-mono text-emerald-400">{connectionStatus.latencyMs || 2.1} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Jumlah ONT Terdata:</span>
                <span className="font-bold text-white">{ontDevices.length} Perangkat</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Preset Provisioning:</span>
                <span className="font-mono text-slate-300">{genieCfg.presetFilterPrefix || 'NETNMS_'}DEFAULT</span>
              </div>
            </div>

            {/* Diagnostic Command Helper */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-slate-500"># Pastikan daemon GenieACS berjalan di Ubuntu:</div>
              <div className="text-emerald-400">sudo systemctl status genieacs-cwmp</div>
              <div className="text-emerald-400">sudo systemctl status genieacs-nbi</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Parameter Tree */}
      {activeTab === 'params' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={paramSearch}
              onChange={(e) => setParamSearch(e.target.value)}
              placeholder="Cari parameter TR-069 (misal: WLAN, Optical, WANDevice)..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <span className="text-xs text-slate-400">
              {filteredParams.length} parameter ditemukan
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Nama Objek TR-069 (Data Model)</th>
                  <th className="py-2.5 px-3">Nilai Parameter Terbaca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredParams.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-purple-300 break-all">{p.name}</td>
                    <td className="py-2.5 px-3 text-white font-semibold">{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Wi-Fi Configuration */}
      {activeTab === 'wifi' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 max-w-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-400" />
              <span>Pengaturan Wi-Fi ONT via TR-069</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ubah nama SSID dan kata sandi Wi-Fi pada perangkat ONT pelanggan tanpa perlu datang ke lokasi.
            </p>
          </div>

          <form onSubmit={handleApplyWifi} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Nama Wi-Fi (SSID)</label>
              <input
                type="text"
                required
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Nama Wi-Fi"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Password Wi-Fi (WPA2-PSK)</label>
              <input
                type="text"
                required
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Kanal Frekuensi (Channel)</label>
              <select
                value={wifiChannel}
                onChange={(e) => setWifiChannel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
              >
                <option value="Auto (Channel 6)">Auto (Rekomendasi - Channel 6)</option>
                <option value="Channel 1">Channel 1 (2412 MHz)</option>
                <option value="Channel 6">Channel 6 (2437 MHz)</option>
                <option value="Channel 11">Channel 11 (2462 MHz)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Mengirim ke ONT...' : 'Terapkan via TR-069'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
