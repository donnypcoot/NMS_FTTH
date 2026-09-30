import React, { useState } from 'react';
import { Device } from '../../types';
import { apiService } from '../../services/apiService';
import { AddDeviceSnmpModal } from './AddDeviceSnmpModal';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Power,
  RefreshCw,
  Terminal,
  Wifi,
  Server,
  Router as RouterIcon,
  Search,
  Filter,
  Eye,
  Sliders,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react';

interface DeviceMonitorProps {
  devices: Device[];
  onUpdateDevices: (devices: Device[]) => void;
  onLocateOnMap?: (lat: number, lng: number) => void;
}

export const DeviceMonitor: React.FC<DeviceMonitorProps> = ({
  devices,
  onUpdateDevices,
  onLocateOnMap,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Ping test modal
  const [pingModalDevice, setPingModalDevice] = useState<Device | null>(null);
  const [pingRunning, setPingRunning] = useState(false);
  const [pingOutput, setPingOutput] = useState('');

  // SNMP test modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [snmpModalDevice, setSnmpModalDevice] = useState<Device | null>(null);
  const [snmpTesting, setSnmpTesting] = useState(false);
  const [snmpResult, setSnmpResult] = useState<{ message: string; sysDescr?: string; sysUpTime?: string; latencyMs?: number } | null>(null);

  // Action status
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = devices.filter((d) => {
    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ipAddress.toLowerCase().includes(q) ||
        (d.serialNumber && d.serialNumber.toLowerCase().includes(q)) ||
        d.vendor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const warningCount = devices.filter((d) => d.status === 'WARNING').length;
  const offlineCount = devices.filter((d) => d.status === 'OFFLINE').length;

  const handleReboot = async (dev: Device) => {
    setActionLoading(dev.id);
    const res = await apiService.rebootOnt(dev.id);
    setActionLoading(null);
    setToastMessage(res.message);
    onUpdateDevices(apiService.getDevices());
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRefresh = async (dev: Device) => {
    setActionLoading(dev.id);
    const res = await apiService.refreshDeviceParameters(dev.id);
    setActionLoading(null);
    setToastMessage(res.message);
    onUpdateDevices(apiService.getDevices());
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRunPing = async (dev: Device) => {
    setPingModalDevice(dev);
    setPingRunning(true);
    setPingOutput(`Mengirim 4 paket ICMP ping ke ${dev.ipAddress}...\n`);
    const res = await apiService.runPingTest(dev.ipAddress);
    setPingRunning(false);
    setPingOutput(res.output);
  };

  const handleRunSnmp = async (dev: Device) => {
    setSnmpModalDevice(dev);
    setSnmpTesting(true);
    setSnmpResult(null);

    const snmpCfg = dev.snmpConfig || {
      enabled: true,
      version: 'v2c',
      community: 'public',
      port: 161,
      timeoutMs: 3000,
      retries: 3,
    };

    const res = await apiService.testSnmpConnection(dev.ipAddress, snmpCfg);
    setSnmpTesting(false);
    setSnmpResult(res);
  };

  const handleDeleteDevice = (dev: Device) => {
    if (confirm(`Hapus perangkat ${dev.name} (${dev.ipAddress}) dari daftar monitoring?`)) {
      const res = apiService.deleteDevice(dev.id);
      onUpdateDevices(apiService.getDevices());
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-blue-600/90 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white hover:text-blue-200">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Perangkat Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{onlineCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Normal &amp; Terhubung</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Redaman Tinggi / Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{warningCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Rx Power &gt; -27 dBm</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Offline / LOS Putus</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{offlineCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Dropwire putus atau mati listrik</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Infrastruktur Aktif</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {devices.filter((d) => d.type !== 'ONU').length} Node
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Core CCR &amp; OLT Headend</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari perangkat berdasarkan nama, IP, atau SN ONT..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none flex-1 sm:flex-none"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="ROUTER">Core Router</option>
            <option value="OLT">OLT GPON</option>
            <option value="ODC">ODC Splitter</option>
            <option value="ONU">ONT / ONU</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none flex-1 sm:flex-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ONLINE">Online</option>
            <option value="WARNING">Warning</option>
            <option value="OFFLINE">Offline</option>
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/30 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Perangkat (SNMP)</span>
          </button>
        </div>
      </div>

      {/* Mobile Device Cards (Visible on Mobile/Small Screens) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Tidak ada perangkat yang cocok dengan filter.
          </div>
        ) : (
          filtered.map((dev) => {
            const isOnline = dev.status === 'ONLINE';
            const isWarning = dev.status === 'WARNING';
            const isOffline = dev.status === 'OFFLINE';

            return (
              <div
                key={dev.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3"
              >
                {/* Header: Name, Type & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{dev.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded font-mono">
                        {dev.type}
                      </span>
                      <span>{dev.vendor} {dev.model}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isOnline
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                        : isWarning
                        ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                        : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                    />
                    <span>{dev.status}</span>
                  </span>
                </div>

                {/* Specs & Telemetry Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400">IP Host &amp; Uptime</div>
                    <div className="font-mono text-blue-400 text-xs font-semibold mt-0.5">{dev.ipAddress}</div>
                    <div className="text-[10px] text-slate-400">{dev.uptime}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400">Ping &amp; Trafik</div>
                    <div className="font-mono text-emerald-400 text-xs font-semibold mt-0.5">
                      {dev.latencyMs} ms {dev.packetLoss ? `(${dev.packetLoss}% loss)` : ''}
                    </div>
                    {dev.rxRateBps ? (
                      <div className="text-[10px] text-slate-400 font-mono">
                        ↓ {(dev.rxRateBps / 1000000).toFixed(1)}M / ↑ {(dev.txRateBps! / 1000000).toFixed(1)}M
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500">-</div>
                    )}
                  </div>

                  {/* Optical details if ONT */}
                  {dev.type === 'ONU' && (
                    <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Rx Optik TR-069:</span>
                      <span
                        className={`font-mono font-bold ${
                          (dev.opticalRxPower || 0) < -27
                            ? 'text-rose-400'
                            : (dev.opticalRxPower || 0) < -24
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {dev.opticalRxPower} dBm (Tx: {dev.opticalTxPower} dBm)
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Thumb-Friendly Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleRunSnmp(dev)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium flex items-center justify-center gap-1 min-h-[36px] cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SNMP</span>
                  </button>

                  <button
                    onClick={() => handleRunPing(dev)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium flex items-center justify-center gap-1 min-h-[36px] cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ping</span>
                  </button>

                  {dev.type === 'ONU' && (
                    <button
                      disabled={actionLoading === dev.id}
                      onClick={() => handleReboot(dev)}
                      className="p-2 bg-slate-800 hover:bg-amber-950 border border-slate-700 rounded-lg text-amber-400 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer disabled:opacity-50"
                      title="Reboot ONT"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onLocateOnMap && dev.location && (
                    <button
                      onClick={() => onLocateOnMap(dev.location.lat, dev.location.lng)}
                      className="p-2 bg-slate-800 hover:bg-purple-950 border border-slate-700 rounded-lg text-purple-300 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Lihat di Peta"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteDevice(dev)}
                    className="p-2 bg-slate-800 hover:bg-rose-950 border border-slate-700 rounded-lg text-slate-400 hover:text-rose-400 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    title="Hapus Perangkat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Device Table (Visible on Tablets & Desktops) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama &amp; Tipe Perangkat</th>
                <th className="py-3 px-4">Status &amp; Uptime</th>
                <th className="py-3 px-4">IP &amp; Vendor</th>
                <th className="py-3 px-4">Telemetri Optik (GenieACS TR-069)</th>
                <th className="py-3 px-4">Trafik &amp; Latency</th>
                <th className="py-3 px-4 text-right">Kontrol Jarak Jauh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filtered.map((dev) => {
                const isOnline = dev.status === 'ONLINE';
                const isWarning = dev.status === 'WARNING';
                const isOffline = dev.status === 'OFFLINE';

                return (
                  <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg text-white ${
                            dev.type === 'ROUTER'
                              ? 'bg-blue-600'
                              : dev.type === 'OLT'
                              ? 'bg-cyan-600'
                              : dev.type === 'ODC'
                              ? 'bg-indigo-600'
                              : 'bg-slate-800 border border-slate-700'
                          }`}
                        >
                          {dev.type === 'ROUTER' ? (
                            <Server className="w-4 h-4" />
                          ) : dev.type === 'OLT' ? (
                            <RouterIcon className="w-4 h-4" />
                          ) : dev.type === 'ODC' ? (
                            <Sliders className="w-4 h-4" />
                          ) : (
                            <Wifi className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{dev.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-800 px-1 py-0.2 rounded border border-slate-700">{dev.type}</span>
                            {dev.serialNumber && <span>SN: {dev.serialNumber}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status & Uptime */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOnline
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                            : isWarning
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                        />
                        <span>{dev.status}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">{dev.uptime}</div>
                    </td>

                    {/* IP & Vendor */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-blue-400 font-bold">{dev.ipAddress}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {dev.vendor} • {dev.model}
                      </div>
                      {dev.snmpConfig && dev.snmpConfig.enabled ? (
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-800 text-blue-300 text-[9px] font-mono">
                          <Radio className="w-2.5 h-2.5 text-blue-400" />
                          <span>SNMP {dev.snmpConfig.version.toUpperCase()} (Port {dev.snmpConfig.port})</span>
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          SNMP: Standar ICMP
                        </div>
                      )}
                    </td>

                    {/* Optical Power Telemetry */}
                    <td className="py-3 px-4">
                      {dev.type === 'ONU' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">Rx Power:</span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                (dev.opticalRxPower || 0) < -27
                                  ? 'text-rose-400'
                                  : (dev.opticalRxPower || 0) < -24
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {dev.opticalRxPower} dBm
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Tx: {dev.opticalTxPower} dBm</span>
                            <span>•</span>
                            <span>Temp: {dev.opticalTemperature}°C</span>
                          </div>
                        </div>
                      ) : dev.type === 'OLT' ? (
                        <div className="text-[11px] text-slate-300">
                          <div>Tx SFP: <span className="text-cyan-400 font-mono font-semibold">+3.5 dBm</span></div>
                          <div className="text-[10px] text-slate-400">Class B+ / C+ GPON Transceiver</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Traffic & Latency */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400">{dev.latencyMs} ms</span>
                        {dev.packetLoss ? (
                          <span className="text-rose-400 font-mono text-[10px]">({dev.packetLoss}% loss)</span>
                        ) : null}
                      </div>
                      {dev.rxRateBps ? (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ↓ {(dev.rxRateBps / 1000000).toFixed(1)}M / ↑ {(dev.txRateBps! / 1000000).toFixed(1)}M
                        </div>
                      ) : null}
                    </td>

                    {/* Remote Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* SNMP Test Walk */}
                        <button
                          onClick={() => handleRunSnmp(dev)}
                          title={`Query Polling SNMP (${dev.ipAddress})`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        {/* Ping Test */}
                        <button
                          onClick={() => handleRunPing(dev)}
                          title="Uji ICMP Ping"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Reboot TR-069 */}
                        {dev.type === 'ONU' && (
                          <button
                            disabled={actionLoading === dev.id}
                            onClick={() => handleReboot(dev)}
                            title="Reboot ONT via GenieACS TR-069"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950 border border-slate-700 hover:border-amber-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Refresh TR-069 */}
                        {dev.type === 'ONU' && (
                          <button
                            disabled={actionLoading === dev.id}
                            onClick={() => handleRefresh(dev)}
                            title="Refresh Parameter Optik dari ONT"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        )}

                        {/* Locate on Map */}
                        {onLocateOnMap && dev.location && (
                          <button
                            onClick={() => onLocateOnMap(dev.location.lat, dev.location.lng)}
                            title="Lihat posisi di Map Editor"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950 border border-slate-700 hover:border-purple-800 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Device */}
                        <button
                          onClick={() => handleDeleteDevice(dev)}
                          title="Hapus perangkat ini"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ping Diagnostic Modal */}
      {pingModalDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    ICMP Ping Diagnostic - {pingModalDevice.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Target IP: {pingModalDevice.ipAddress}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPingModalDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/90 rounded-xl p-3 border border-slate-800 font-mono text-xs text-emerald-400 h-48 overflow-y-auto whitespace-pre-wrap">
              {pingOutput}
              {pingRunning && (
                <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse" />
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                disabled={pingRunning}
                onClick={() => handleRunPing(pingModalDevice)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {pingRunning ? 'Mengirim Ping...' : 'Ulangi Ping'}
              </button>
              <button
                onClick={() => setPingModalDevice(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNMP Diagnostic Query Modal */}
      {snmpModalDevice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    SNMP Polling Query - {snmpModalDevice.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    Host: {snmpModalDevice.ipAddress} • Port: {snmpModalDevice.snmpConfig?.port || 161} • Versi:{' '}
                    {snmpModalDevice.snmpConfig?.version?.toUpperCase() || 'V2C'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSnmpModalDevice(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/90 rounded-xl p-3.5 border border-slate-800 font-mono text-xs text-slate-300 min-h-[140px] space-y-2">
              {snmpTesting ? (
                <div className="flex items-center justify-center py-8 text-emerald-400 gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Mengirim paket SNMP Get-Request OID sysDescr...</span>
                </div>
              ) : snmpResult ? (
                <div className="space-y-2">
                  <div className="text-emerald-400 font-bold">✓ {snmpResult.message}</div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
                    <div className="text-slate-400">Response Data MIB-II:</div>
                    <div className="text-slate-200">{snmpResult.sysDescr}</div>
                    {snmpResult.sysUpTime && (
                      <div className="text-slate-400 mt-1">
                        DISMAN-EVENT-MIB::sysUpTimeInstance = {snmpResult.sysUpTime} (RTT:{' '}
                        {snmpResult.latencyMs} ms)
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                disabled={snmpTesting}
                onClick={() => handleRunSnmp(snmpModalDevice)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{snmpTesting ? 'Menguji...' : 'Ulangi SNMP Query'}</span>
              </button>
              <button
                onClick={() => setSnmpModalDevice(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device with SNMP Modal */}
      <AddDeviceSnmpModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceAdded={(newDev) => {
          onUpdateDevices(apiService.getDevices());
          setToastMessage(`Perangkat ${newDev.name} berhasil ditambahkan dengan SNMP.`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    </div>
  );
};
