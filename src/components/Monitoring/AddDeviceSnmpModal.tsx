import React, { useState } from 'react';
import { Device, DeviceType, DeviceStatus, SnmpConfig } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Server,
  Radio,
  Network,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Play,
  Check,
  Terminal,
} from 'lucide-react';

interface AddDeviceSnmpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded: (newDevice: Device) => void;
}

export const AddDeviceSnmpModal: React.FC<AddDeviceSnmpModalProps> = ({
  isOpen,
  onClose,
  onDeviceAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SNMP'>('GENERAL');

  // Device general fields
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('ROUTER');
  const [ipAddress, setIpAddress] = useState('');
  const [vendor, setVendor] = useState<Device['vendor']>('MikroTik');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<DeviceStatus>('ONLINE');

  // SNMP Configuration fields
  const [snmpEnabled, setSnmpEnabled] = useState(true);
  const [snmpVersion, setSnmpVersion] = useState<'v1' | 'v2c' | 'v3'>('v2c');
  const [community, setCommunity] = useState('public');
  const [port, setPort] = useState(161);
  const [timeoutMs, setTimeoutMs] = useState(3000);
  const [retries, setRetries] = useState(3);
  const [customOid, setCustomOid] = useState('.1.3.6.1.2.1.1.1.0');

  // SNMPv3 fields
  const [secLevel, setSecLevel] = useState<'noAuthNoPriv' | 'authNoPriv' | 'authPriv'>('authPriv');
  const [snmpUser, setSnmpUser] = useState('snmpadmin');
  const [authProto, setAuthProto] = useState<'MD5' | 'SHA' | 'SHA256'>('SHA256');
  const [authPass, setAuthPass] = useState('AuthPass#123');
  const [privProto, setPrivProto] = useState<'DES' | 'AES' | 'AES128'>('AES');
  const [privPass, setPrivPass] = useState('PrivPass#123');

  // SNMP Test state
  const [testingSnmp, setTestingSnmp] = useState(false);
  const [snmpTestResult, setSnmpTestResult] = useState<{
    success: boolean;
    message: string;
    sysDescr?: string;
    sysUpTime?: string;
    latencyMs?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestSnmp = async () => {
    if (!ipAddress.trim()) {
      setSnmpTestResult({
        success: false,
        message: 'Masukkan IP Address perangkat terlebih dahulu sebelum menguji koneksi SNMP.',
      });
      return;
    }

    setTestingSnmp(true);
    setSnmpTestResult(null);

    const snmpCfg: SnmpConfig = {
      enabled: snmpEnabled,
      version: snmpVersion,
      community: snmpVersion !== 'v3' ? community : undefined,
      port,
      timeoutMs,
      retries,
      securityLevel: snmpVersion === 'v3' ? secLevel : undefined,
      username: snmpVersion === 'v3' ? snmpUser : undefined,
      authProtocol: snmpVersion === 'v3' ? authProto : undefined,
      authPassword: snmpVersion === 'v3' ? authPass : undefined,
      privProtocol: snmpVersion === 'v3' ? privProto : undefined,
      privPassword: snmpVersion === 'v3' ? privPass : undefined,
      customOid,
    };

    const res = await apiService.testSnmpConnection(ipAddress, snmpCfg);
    setTestingSnmp(false);
    setSnmpTestResult(res);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ipAddress.trim()) return;

    const snmpCfg: SnmpConfig | undefined = snmpEnabled
      ? {
          enabled: true,
          version: snmpVersion,
          community: snmpVersion !== 'v3' ? community : undefined,
          port,
          timeoutMs,
          retries,
          securityLevel: snmpVersion === 'v3' ? secLevel : undefined,
          username: snmpVersion === 'v3' ? snmpUser : undefined,
          authProtocol: snmpVersion === 'v3' ? authProto : undefined,
          authPassword: snmpVersion === 'v3' ? authPass : undefined,
          privProtocol: snmpVersion === 'v3' ? privProto : undefined,
          privPassword: snmpVersion === 'v3' ? privPass : undefined,
          customOid,
        }
      : undefined;

    const newDevice: Device = {
      id: `DEV-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      type,
      ipAddress: ipAddress.trim(),
      vendor,
      model: model.trim() || `${vendor} Generic ${type}`,
      serialNumber: serialNumber.trim() || undefined,
      macAddress: macAddress.trim() || undefined,
      status,
      uptime: '0d 01h 00m',
      snmpConfig: snmpCfg,
      location: {
        lat: -6.9175 + (Math.random() - 0.5) * 0.02,
        lng: 107.6191 + (Math.random() - 0.5) * 0.02,
        address: address.trim() || 'Ruang Server / POP Distribusi',
      },
      rxRateBps: 15400000,
      txRateBps: 8200000,
      latencyMs: 3.5,
    };

    const currentDevices = apiService.getDevices();
    const updated = [newDevice, ...currentDevices];
    apiService.saveDevices(updated);
    onDeviceAdded(newDevice);

    apiService.addLog(
      'SUCCESS',
      'SYSTEM',
      `Perangkat baru ${newDevice.name} (${newDevice.type}) dengan koneksi SNMP ${snmpVersion} berhasil didaftarkan.`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tambah Perangkat Jaringan</span>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-mono">
                  SNMP v1/v2c/v3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Daftarkan router, OLT, switch, atau server dengan koneksi pemantauan SNMP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center px-5 pt-3 border-b border-slate-800 bg-slate-950/40 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition ${
              activeTab === 'GENERAL'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Informasi Perangkat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SNMP')}
            className={`pb-2 text-xs font-bold border-b-2 cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'SNMP'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>2. Konfigurasi Koneksi SNMP</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'GENERAL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Nama Perangkat *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: CORE-ROUTER-CCR2004 atau OLT-GPON-ZTE"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tipe Perangkat *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DeviceType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ROUTER">ROUTER (Core / Border / BGP)</option>
                    <option value="OLT">OLT (Optical Line Terminal)</option>
                    <option value="ODC">ODC (Optical Distribution Cabinet)</option>
                    <option value="ODP">ODP (Optical Distribution Point)</option>
                    <option value="ONU">ONT / ONU (Customer Premises)</option>
                    <option value="SERVER">SERVER (Linux / RADIUS / NMS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    IP Address Host / Target *
                  </label>
                  <input
                    type="text"
                    required
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="10.10.0.1 atau 192.168.1.10"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Vendor / Pabrikan
                  </label>
                  <select
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="MikroTik">MikroTik</option>
                    <option value="ZTE">ZTE</option>
                    <option value="Huawei">Huawei</option>
                    <option value="Fiberhome">Fiberhome</option>
                    <option value="VSOL">VSOL</option>
                    <option value="Cisco">Cisco Systems</option>
                    <option value="Other">Lainnya (Generic Linux/Switch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Model Hardware
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Contoh: CCR2004-16G-2S+ / ZXA10 C320"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Status Operasional Awal
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DeviceStatus)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="ONLINE">ONLINE (Normal)</option>
                    <option value="WARNING">WARNING (Waspada)</option>
                    <option value="OFFLINE">OFFLINE (Pemeliharaan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Serial Number (SN)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="ZTEG12345678"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    placeholder="E4:8D:8C:1A:2B:3C"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Alamat / Lokasi Pemasangan (POP / Tiang)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Rack 02, POP Sentral Cimahi, Jl. Gandawijaya"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-300">Konfigurasi SNMP</div>
                  <div className="text-[11px] text-slate-400">
                    Aktifkan polling SNMP untuk membaca status CPU, Interface trafik, dan Uptime otomatis.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('SNMP')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Atur Parameter SNMP &rarr;
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SNMP' && (
            <div className="space-y-4">
              {/* Enable SNMP toggle */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Aktifkan Koneksi Pemantauan SNMP</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Memantau telemetri perangkat via Simple Network Management Protocol.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snmpEnabled}
                    onChange={(e) => setSnmpEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {snmpEnabled && (
                <>
                  {/* SNMP Version Selection */}
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">
                      Versi Protokol SNMP
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['v1', 'v2c', 'v3'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSnmpVersion(v)}
                          className={`p-2 rounded-lg border text-center font-bold text-xs cursor-pointer transition ${
                            snmpVersion === v
                              ? 'bg-blue-900/50 border-blue-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          SNMP {v.toUpperCase()}
                          <div className="text-[10px] font-normal text-slate-400">
                            {v === 'v1' && 'Legacy standard'}
                            {v === 'v2c' && 'Standar ISP (Community)'}
                            {v === 'v3' && 'Enkripsi & Auth User'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Standard SNMP v1/v2c fields */}
                  {snmpVersion !== 'v3' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-slate-400 mb-1">Community String</label>
                        <input
                          type="text"
                          required
                          value={community}
                          onChange={(e) => setCommunity(e.target.value)}
                          placeholder="public"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="text-[10px] text-slate-500 mt-0.5">Default MikroTik/ZTE: public</div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Port SNMP (UDP)</label>
                        <input
                          type="number"
                          required
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          placeholder="161"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="text-[10px] text-slate-500 mt-0.5">Standar port SNMP: 161</div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Timeout (ms)</label>
                        <input
                          type="number"
                          value={timeoutMs}
                          onChange={(e) => setTimeoutMs(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Jumlah Percobaan (Retries)</label>
                        <input
                          type="number"
                          value={retries}
                          onChange={(e) => setRetries(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    /* SNMPv3 Security fields */
                    <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Security Level</label>
                          <select
                            value={secLevel}
                            onChange={(e) => setSecLevel(e.target.value as any)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                          >
                            <option value="authPriv">authPriv (Otentikasi + Enkripsi Privasi)</option>
                            <option value="authNoPriv">authNoPriv (Otentikasi Saja)</option>
                            <option value="noAuthNoPriv">noAuthNoPriv (Tanpa Otentikasi)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">SNMPv3 Username</label>
                          <input
                            type="text"
                            required
                            value={snmpUser}
                            onChange={(e) => setSnmpUser(e.target.value)}
                            placeholder="snmpadmin"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      {secLevel !== 'noAuthNoPriv' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1">Auth Protocol</label>
                            <select
                              value={authProto}
                              onChange={(e) => setAuthProto(e.target.value as any)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            >
                              <option value="SHA256">SHA-256 (Direkomendasikan)</option>
                              <option value="SHA">SHA-1</option>
                              <option value="MD5">MD5</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1">Auth Password</label>
                            <input
                              type="password"
                              value={authPass}
                              onChange={(e) => setAuthPass(e.target.value)}
                              placeholder="Password auth"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {secLevel === 'authPriv' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1">Privacy Protocol (Cipher)</label>
                            <select
                              value={privProto}
                              onChange={(e) => setPrivProto(e.target.value as any)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            >
                              <option value="AES">AES-128 (Direkomendasikan)</option>
                              <option value="AES128">AES-192/256</option>
                              <option value="DES">DES (Legacy)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1">Privacy Password</label>
                            <input
                              type="password"
                              value={privPass}
                              onChange={(e) => setPrivPass(e.target.value)}
                              placeholder="Password enkripsi privasi"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom OID */}
                  <div>
                    <label className="block text-slate-400 mb-1">Custom OID Target</label>
                    <input
                      type="text"
                      value={customOid}
                      onChange={(e) => setCustomOid(e.target.value)}
                      placeholder=".1.3.6.1.2.1.1.1.0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                    />
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      .1.3.6.1.2.1.1.1.0 (sysDescr) • .1.3.6.1.2.1.1.3.0 (sysUpTime) • .1.3.6.1.2.1.2.2.1 (ifTable)
                    </div>
                  </div>

                  {/* SNMP Test Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={testingSnmp}
                      onClick={handleTestSnmp}
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                    >
                      {testingSnmp ? (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>Test Handshake SNMP ({ipAddress || 'Host'} : {port})</span>
                    </button>

                    {snmpTestResult && (
                      <div
                        className={`mt-2.5 p-3 rounded-xl border text-xs ${
                          snmpTestResult.success
                            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                            : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          {snmpTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span>{snmpTestResult.message}</span>
                        </div>
                        {snmpTestResult.sysDescr && (
                          <div className="font-mono text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800 mt-1">
                            <div>{snmpTestResult.sysDescr}</div>
                            {snmpTestResult.sysUpTime && (
                              <div className="text-slate-400 mt-0.5">
                                sysUpTime: {snmpTestResult.sysUpTime} (Latency: {snmpTestResult.latencyMs} ms)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Perangkat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
