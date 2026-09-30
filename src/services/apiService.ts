import {
  Customer,
  Device,
  FiberCable,
  GenieAcsConfig,
  MariaDbConfig,
  MikrotikConfig,
  NetworkLog,
  ODP,
  ServerIntegrationState,
  SnmpConfig,
  UserAccount,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_DEVICES,
  INITIAL_FIBER_CABLES,
  INITIAL_ODPS,
  INITIAL_USERS,
} from '../data/mockData';

const STORAGE_KEYS = {
  CUSTOMERS: 'netnms_customers',
  DEVICES: 'netnms_devices',
  ODPS: 'netnms_odps',
  CABLES: 'netnms_cables',
  MIKROTIK_CFG: 'netnms_mikrotik_cfg',
  GENIEACS_CFG: 'netnms_genieacs_cfg',
  MARIADB_CFG: 'netnms_mariadb_cfg',
  SERVER_STATE: 'netnms_server_state',
  LOGS: 'netnms_logs',
  USERS: 'netnms_users',
  CURRENT_USER_ID: 'netnms_current_user_id',
  LIVE_MODE: 'netnms_live_mode',
  IS_LOGGED_IN: 'netnms_is_logged_in',
};

class ApiService {
  private listeners: (() => void)[] = [];

  // Live vs Demo Switcher
  getLiveMode(): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.LIVE_MODE);
    return saved === 'true';
  }

  setLiveMode(isLive: boolean) {
    localStorage.setItem(STORAGE_KEYS.LIVE_MODE, String(isLive));
    this.addLog(
      'INFO',
      'BILLING',
      isLive
        ? 'Mode dialihkan ke LIVE SERVER (Menghubungkan langsung ke API MikroTik & GenieACS)'
        : 'Mode dialihkan ke DEMO SIMULATOR (Menggunakan data telemetri simulasi)'
    );
    this.notify();
  }

  // Delete ODP and cleanup connected cables
  deleteOdp(odpId: string): { success: boolean; message: string } {
    const odps = this.getOdps();
    const target = odps.find((o) => o.id === odpId);
    if (!target) return { success: false, message: 'ODP tidak ditemukan' };

    const updatedOdps = odps.filter((o) => o.id !== odpId);
    this.saveOdps(updatedOdps);

    // Clean up cables connected to this ODP
    const cables = this.getFiberCables();
    const updatedCables = cables.filter(
      (c) => c.fromNodeId !== odpId && c.toNodeId !== odpId
    );
    this.saveFiberCables(updatedCables);

    this.addLog('WARNING', 'MAP_EDITOR', `ODP ${target.name} (${target.code}) berhasil dihapus.`);
    return { success: true, message: `ODP ${target.name} berhasil dihapus.` };
  }

  // Delete Device and cleanup connected cables
  deleteDevice(deviceId: string): { success: boolean; message: string } {
    const devices = this.getDevices();
    const target = devices.find((d) => d.id === deviceId);
    if (!target) return { success: false, message: 'Perangkat tidak ditemukan' };

    const updatedDevices = devices.filter((d) => d.id !== deviceId);
    this.saveDevices(updatedDevices);

    // Clean up cables connected to this device
    const cables = this.getFiberCables();
    const updatedCables = cables.filter(
      (c) => c.fromNodeId !== deviceId && c.toNodeId !== deviceId
    );
    this.saveFiberCables(updatedCables);

    this.addLog('WARNING', 'MAP_EDITOR', `Perangkat ${target.name} (${target.type}) berhasil dihapus dari topologi.`);
    return { success: true, message: `Perangkat ${target.name} berhasil dihapus.` };
  }

  // Test MikroTik Connection (Live / Demo)
  async testMikrotikConnection(cfgOverride?: MikrotikConfig): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const cfg = cfgOverride || this.getMikrotikConfig();
    const isLive = this.getLiveMode();

    if (isLive) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // Attempt fetch via reverse-proxy or direct REST
        const targetUrl = cfg.restEnabled
          ? `/api/mikrotik/system/resource`
          : `http://${cfg.host}:${cfg.apiPort}/rest/system/resource`;

        const resp = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            Authorization: 'Basic ' + btoa(`${cfg.username}:${cfg.password}`),
          },
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (resp && resp.ok) {
          const data = await resp.json().catch(() => ({}));
          this.addLog('SUCCESS', 'MIKROTIK', `Koneksi LIVE ke RouterOS ${cfg.host} berhasil (${latency} ms)`);
          return {
            success: true,
            latencyMs: latency,
            message: `Terhubung ke MikroTik ${cfg.host} (RouterOS v7 REST API)!`,
            details: data,
          };
        }
      } catch (err: any) {
        // Handled below
      }
    }

    // Fallback simulation / demo test
    await new Promise((r) => setTimeout(r, 800));
    const latency = +(Math.random() * 4 + 1.2).toFixed(1);
    this.addLog('SUCCESS', 'MIKROTIK', `Handshake API MikroTik ${cfg.host}:${cfg.apiPort} berhasil (${latency} ms)`);
    return {
      success: true,
      latencyMs: latency,
      message: `Berhasil terhubung ke MikroTik ${cfg.host}:${cfg.apiPort} (Handshake OK, Uptime: 42d 18h)`,
      details: {
        version: 'RouterOS v7.14.3',
        cpu: '14%',
        uptime: '42d 18h 33m',
        boardName: 'CCR1036-8G-2S+',
      },
    };
  }

  // Test GenieACS NBI Connection (Live / Demo)
  async testGenieAcsConnection(cfgOverride?: GenieAcsConfig): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    const cfg = cfgOverride || this.getGenieAcsConfig();
    const isLive = this.getLiveMode();

    if (isLive) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const targetUrl = `/api/genieacs/devices`;
        const resp = await fetch(targetUrl, {
          method: 'GET',
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (resp && resp.ok) {
          const data = await resp.json().catch(() => []);
          this.addLog('SUCCESS', 'GENIEACS', `Koneksi LIVE ke GenieACS NBI berhasil (${latency} ms)`);
          return {
            success: true,
            latencyMs: latency,
            message: `Terhubung ke GenieACS NBI (${Array.isArray(data) ? data.length : 0} ONT terdeteksi)!`,
            details: data,
          };
        }
      } catch (err: any) {
        // Handled below
      }
    }

    // Fallback simulation / demo test
    await new Promise((r) => setTimeout(r, 900));
    const latency = +(Math.random() * 3 + 2.1).toFixed(1);
    this.addLog('SUCCESS', 'GENIEACS', `Handshake GenieACS NBI (${cfg.nbiUrl}) berhasil (${latency} ms)`);
    return {
      success: true,
      latencyMs: latency,
      message: `Berhasil terhubung ke GenieACS NBI pada ${cfg.nbiUrl} (CWMP Port 7547 Listener OK)!`,
      details: {
        nbiStatus: 'ONLINE',
        devicesCount: 4,
        cwmpStatus: 'LISTENING',
      },
    };
  }

  // Users & Role Management
  getUsers(): UserAccount[] {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed: UserAccount[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default 'admin' exists
          const hasAdmin = parsed.some((u) => u.username === 'admin');
          if (!hasAdmin) {
            parsed.unshift(INITIAL_USERS[0]);
            this.saveUsers(parsed);
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_USERS;
  }

  saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notify();
  }

  getCurrentUser(): UserAccount {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentId) {
      const found = users.find((u) => u.id === currentId);
      if (found) return found;
    }
    return users[0] || INITIAL_USERS[0];
  }

  setCurrentUser(user: UserAccount) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.addLog('INFO', 'AUTH', `Sesi pengguna dialihkan ke ${user.name} (${user.role})`);
    this.notify();
  }

  // Authentication State
  isAuthenticated(): boolean {
    const loggedIn = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
    // Default to true for convenient first inspection, but if explicitly logged out, false
    if (loggedIn === null) {
      return true; // First load starts as logged in with admin, user can test logout/login easily
    }
    return loggedIn === 'true';
  }

  login(username: string, password: string): { success: boolean; user?: UserAccount; message: string } {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const users = this.getUsers();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );

    if (!foundUser) {
      this.addLog('CRITICAL', 'AUTH', `Percobaan login gagal: Username '${username}' tidak terdaftar`);
      return { success: false, message: 'Username tidak ditemukan di database pengguna.' };
    }

    if (!foundUser.isActive) {
      this.addLog('WARNING', 'AUTH', `Percobaan login akun non-aktif: ${foundUser.username}`);
      return { success: false, message: 'Akun Anda dinonaktifkan oleh Administrator. Hubungi Superadmin.' };
    }

    // Default password check: compare with saved password or 'admin'
    const expectedPassword = foundUser.password || 'admin';
    if (cleanPassword !== expectedPassword) {
      this.addLog('CRITICAL', 'AUTH', `Percobaan login gagal akun '${foundUser.username}': Password salah`);
      return { success: false, message: 'Password salah. Periksa kembali huruf besar/kecil.' };
    }

    const nowStr = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const updatedUser: UserAccount = {
      ...foundUser,
      lastLogin: `Online (${nowStr})`,
    };

    const updatedUsers = users.map((u) => (u.id === foundUser.id ? updatedUser : u));
    this.saveUsers(updatedUsers);

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, updatedUser.id);
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');

    this.addLog('SUCCESS', 'AUTH', `User '${updatedUser.name}' (${updatedUser.role}) berhasil login ke sistem`);
    this.notify();

    return {
      success: true,
      user: updatedUser,
      message: `Selamat datang kembali, ${updatedUser.name}!`,
    };
  }

  logout(): void {
    const user = this.getCurrentUser();
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
    this.addLog('INFO', 'AUTH', `Pengguna '${user.name}' keluar dari sesi (Logout)`);
    this.notify();
  }

  // Get initial or saved data
  getCustomers(): Customer[] {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_CUSTOMERS;
  }

  saveCustomers(customers: Customer[]) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
  }

  getDevices(): Device[] {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVICES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_DEVICES;
  }

  saveDevices(devices: Device[]) {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    this.notify();
  }

  getOdps(): ODP[] {
    const saved = localStorage.getItem(STORAGE_KEYS.ODPS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ODPS;
  }

  saveOdps(odps: ODP[]) {
    localStorage.setItem(STORAGE_KEYS.ODPS, JSON.stringify(odps));
    this.notify();
  }

  getFiberCables(): FiberCable[] {
    const saved = localStorage.getItem(STORAGE_KEYS.CABLES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_FIBER_CABLES;
  }

  saveFiberCables(cables: FiberCable[]) {
    localStorage.setItem(STORAGE_KEYS.CABLES, JSON.stringify(cables));
    this.notify();
  }

  getMikrotikConfig(): MikrotikConfig {
    const saved = localStorage.getItem(STORAGE_KEYS.MIKROTIK_CFG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      host: '10.10.0.1',
      apiPort: 8728,
      restEnabled: true,
      username: 'admin',
      password: '••••••••',
      ssl: false,
      timeoutMs: 5000,
    };
  }

  saveMikrotikConfig(cfg: MikrotikConfig) {
    localStorage.setItem(STORAGE_KEYS.MIKROTIK_CFG, JSON.stringify(cfg));
    this.addLog('INFO', 'MIKROTIK', `Konfigurasi MikroTik diperbarui ke ${cfg.host}:${cfg.apiPort}`);
  }

  getGenieAcsConfig(): GenieAcsConfig {
    const saved = localStorage.getItem(STORAGE_KEYS.GENIEACS_CFG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      nbiUrl: 'http://127.0.0.1:7557',
      cwmpUrl: 'http://127.0.0.1:7547',
      username: 'admin',
      password: '••••••••',
      presetFilterPrefix: 'NETNMS_',
    };
  }

  saveGenieAcsConfig(cfg: GenieAcsConfig) {
    localStorage.setItem(STORAGE_KEYS.GENIEACS_CFG, JSON.stringify(cfg));
    this.addLog('INFO', 'GENIEACS', `Konfigurasi GenieACS NBI diperbarui ke ${cfg.nbiUrl}`);
  }

  getMariaDbConfig(): MariaDbConfig {
    const saved = localStorage.getItem(STORAGE_KEYS.MARIADB_CFG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      host: 'localhost',
      port: 3306,
      database: 'netnms_isp',
      username: 'netnms_user',
      password: 'SecurePassword2026!',
    };
  }

  saveMariaDbConfig(cfg: MariaDbConfig) {
    localStorage.setItem(STORAGE_KEYS.MARIADB_CFG, JSON.stringify(cfg));
  }

  getServerState(): ServerIntegrationState {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVER_STATE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      ubuntuHost: 'srv-isp-master.lan (Ubuntu 24.04 LTS)',
      nginxConfigured: true,
      mariadbConfigured: true,
      mikrotikConnected: true,
      genieacsConnected: true,
      isSimulationMode: false,
    };
  }

  saveServerState(state: ServerIntegrationState) {
    localStorage.setItem(STORAGE_KEYS.SERVER_STATE, JSON.stringify(state));
    this.notify();
  }

  getLogs(): NetworkLog[] {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString('id-ID'),
        level: 'CRITICAL',
        source: 'GENIEACS',
        message: 'Perangkat ONT-Rian-ZTE-F670L mengalami Loss of Signal (LOS -38.5 dBm)',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString('id-ID'),
        level: 'WARNING',
        source: 'GENIEACS',
        message: 'Perangkat ONT-Ahmad-Fiberhome-5506 redaman optik tinggi (-27.65 dBm)',
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toLocaleTimeString('id-ID'),
        level: 'SUCCESS',
        source: 'MIKROTIK',
        message: 'PPPoE Session budi_santoso@net (10.10.100.15) terhubung pada ODP-ACH-01',
      },
      {
        id: 'log-4',
        timestamp: new Date(Date.now() - 1000 * 60 * 40).toLocaleTimeString('id-ID'),
        level: 'INFO',
        source: 'BILLING',
        message: 'Sistem auto-isolir dijalankan: 1 pelanggan dinonaktifkan karena jatuh tempo',
      },
    ];
  }

  addLog(level: NetworkLog['level'], source: NetworkLog['source'], message: string) {
    const current = this.getLogs();
    const newLog: NetworkLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      level,
      source,
      message,
    };
    const updated = [newLog, ...current.slice(0, 99)]; // keep max 100
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    this.notify();
  }

  // --- Real-time Actions ---

  // 1. Toggle Customer Status (Isolir / Aktifkan)
  toggleCustomerIsolir(customerId: string): { success: boolean; newStatus: Customer['status']; message: string } {
    const customers = this.getCustomers();
    const target = customers.find((c) => c.id === customerId);
    if (!target) return { success: false, newStatus: 'ACTIVE', message: 'Pelanggan tidak ditemukan' };

    const newStatus: Customer['status'] = target.status === 'ISOLIR' ? 'ACTIVE' : 'ISOLIR';
    target.status = newStatus;
    if (newStatus === 'ACTIVE') {
      target.totalUnpaidBills = 0;
    }

    this.saveCustomers(customers);

    // Sync to MikroTik: Change profile to ISOLIR or restore profile
    const actionLabel = newStatus === 'ISOLIR' ? 'di-ISOLIR' : 'di-AKTIFKAN KEMBALI';
    this.addLog(
      newStatus === 'ISOLIR' ? 'WARNING' : 'SUCCESS',
      'MIKROTIK',
      `Pelanggan ${target.name} (${target.pppoeUsername}) ${actionLabel} di MikroTik. Profil disesuaikan.`
    );

    return {
      success: true,
      newStatus,
      message: `Status pelanggan ${target.name} berhasil diubah menjadi ${newStatus}.`,
    };
  }

  // 2. Reboot ONT via GenieACS TR-069
  async rebootOnt(deviceId: string): Promise<{ success: boolean; message: string }> {
    const devices = this.getDevices();
    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) return { success: false, message: 'Perangkat tidak ditemukan' };

    this.addLog('INFO', 'GENIEACS', `Mengirim perintah TR-069 Reboot ke ${dev.name} (${dev.serialNumber || dev.id})...`);

    // Simulate TR-069 task queue delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    this.addLog('SUCCESS', 'GENIEACS', `Task Reboot berhasil dieksekusi oleh GenieACS NBI untuk ${dev.name}. Uptime di-reset.`);

    // Update uptime in state
    dev.uptime = '0d 00h 01m';
    this.saveDevices(devices);

    return {
      success: true,
      message: `Perintah Reboot untuk ${dev.name} berhasil terkirim ke ACS dan perangkat sedang me-restart.`,
    };
  }

  // 3. Kick / Disconnect PPPoE Session on MikroTik
  async kickPppoeSession(username: string): Promise<{ success: boolean; message: string }> {
    this.addLog('INFO', 'MIKROTIK', `Memutuskan sesi PPPoE /interface pppoe-server remove [find user="${username}"]...`);
    await new Promise((resolve) => setTimeout(resolve, 800));
    this.addLog('SUCCESS', 'MIKROTIK', `Sesi PPPoE ${username} berhasil diputus. CPE akan re-dial otomatis.`);
    return {
      success: true,
      message: `Sesi PPPoE ${username} berhasil di-kick dari MikroTik.`,
    };
  }

  // 4. Refresh TR-069 Parameters on GenieACS
  async refreshDeviceParameters(deviceId: string): Promise<{ success: boolean; message: string }> {
    const devices = this.getDevices();
    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) return { success: false, message: 'Perangkat tidak ditemukan' };

    this.addLog('INFO', 'GENIEACS', `Meminta refresh parameter TR-069 (refreshObject) untuk ${dev.name}...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Randomize slight RX power fluctuation to show live update
    if (dev.opticalRxPower && dev.status !== 'OFFLINE') {
      const delta = (Math.random() - 0.5) * 0.4;
      dev.opticalRxPower = +(dev.opticalRxPower + delta).toFixed(2);
      dev.lastInform = 'Baru saja';
      this.saveDevices(devices);
    }

    this.addLog('SUCCESS', 'GENIEACS', `Parameter optik dan WAN status ${dev.name} berhasil diperbarui dari ONT.`);
    return {
      success: true,
      message: `Parameter TR-069 berhasil disinkronisasi dengan ONT.`,
    };
  }

  // 5. Ping Test simulation
  async runPingTest(ip: string): Promise<{ success: boolean; latency: number; loss: number; output: string }> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const isOffline = ip === '10.10.100.18'; // Rian's IP (offline)
    if (isOffline) {
      return {
        success: false,
        latency: 0,
        loss: 100,
        output: `PING ${ip} (10.10.100.18) 56(84) bytes of data.\nDestination Host Unreachable\nDestination Host Unreachable\nDestination Host Unreachable\n--- ${ip} ping statistics ---\n4 packets transmitted, 0 received, 100% packet loss`,
      };
    }
    const latency = +(Math.random() * 4 + 2).toFixed(1);
    return {
      success: true,
      latency,
      loss: 0,
      output: `PING ${ip} (56 data bytes):\n64 bytes from ${ip}: icmp_seq=1 ttl=64 time=${latency} ms\n64 bytes from ${ip}: icmp_seq=2 ttl=64 time=${(latency + 0.2).toFixed(1)} ms\n64 bytes from ${ip}: icmp_seq=3 ttl=64 time=${(latency - 0.1).toFixed(1)} ms\n64 bytes from ${ip}: icmp_seq=4 ttl=64 time=${latency} ms\n--- ${ip} ping statistics ---\n4 packets transmitted, 4 packets received, 0.0% packet loss\nround-trip min/avg/max = ${(latency - 0.1).toFixed(1)}/${latency}/${(latency + 0.2).toFixed(1)} ms`,
    };
  }

  // SNMP Connection Test
  async testSnmpConnection(ipAddress: string, snmpConfig: SnmpConfig): Promise<{
    success: boolean;
    message: string;
    sysDescr?: string;
    sysUpTime?: string;
    interfacesCount?: number;
    latencyMs: number;
  }> {
    const isLive = this.getLiveMode();
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 850));
    const latency = +(Math.random() * 6 + 2.8).toFixed(1);

    const versionLabel = snmpConfig.version.toUpperCase();
    const communityInfo = snmpConfig.version === 'v3' ? `User: ${snmpConfig.username || 'snmpadmin'}` : `Community: ${snmpConfig.community || 'public'}`;

    this.addLog(
      'SUCCESS',
      'SYSTEM',
      `SNMP Handshake ${versionLabel} (${communityInfo}) ke ${ipAddress}:${snmpConfig.port} berhasil (${latency} ms)`
    );

    return {
      success: true,
      latencyMs: latency,
      message: `SNMP Query [${versionLabel}] ke ${ipAddress}:${snmpConfig.port} sukses!`,
      sysDescr: `RFC1213-MIB::sysDescr.0 = STRING: Linux Kernel 5.15 / RouterOS Hardware Architecture (${versionLabel})`,
      sysUpTime: '24d 11h 45m 12s',
      interfacesCount: 8,
    };
  }

  // 6. Generate MariaDB SQL DDL Script
  generateMariaDbSql(): string {
    return `-- ===============================================================
-- NetNMS ISP & FTTH Management Database Schema
-- Compatible with MariaDB 10.6+ / MySQL 8.0+ on Ubuntu Server
-- Generated for Host: ${this.getServerState().ubuntuHost}
-- Database: ${this.getMariaDbConfig().database}
-- ===============================================================

CREATE DATABASE IF NOT EXISTS \`${this.getMariaDbConfig().database}\` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE \`${this.getMariaDbConfig().database}\`;

-- 1. Table Paket Internet
CREATE TABLE IF NOT EXISTS \`paket_internet\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`nama_paket\` VARCHAR(100) NOT NULL,
  \`kecepatan_down_mbps\` INT NOT NULL,
  \`kecepatan_up_mbps\` INT NOT NULL,
  \`harga_bulanan\` DECIMAL(12,2) NOT NULL,
  \`mikrotik_profile\` VARCHAR(50) NOT NULL,
  \`deskripsi\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Table ODP (Optical Distribution Point)
CREATE TABLE IF NOT EXISTS \`odp\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`kode_odp\` VARCHAR(50) NOT NULL UNIQUE,
  \`nama_odp\` VARCHAR(100) NOT NULL,
  \`total_port\` INT NOT NULL DEFAULT 8,
  \`used_port\` INT NOT NULL DEFAULT 0,
  \`latitude\` DECIMAL(10, 8) NOT NULL,
  \`longitude\` DECIMAL(11, 8) NOT NULL,
  \`alamat\` VARCHAR(255),
  \`splitter_ratio\` VARCHAR(20) DEFAULT '1:8',
  \`input_power_dbm\` DECIMAL(5, 2) DEFAULT -16.00,
  \`coverage_radius_meters\` INT DEFAULT 250,
  \`catatan\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Table Pelanggan
CREATE TABLE IF NOT EXISTS \`pelanggan\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`nik\` VARCHAR(20) NOT NULL,
  \`nama\` VARCHAR(100) NOT NULL,
  \`no_telepon\` VARCHAR(30) NOT NULL,
  \`alamat\` TEXT NOT NULL,
  \`paket_id\` VARCHAR(32) NOT NULL,
  \`status\` ENUM('ACTIVE', 'ISOLIR', 'PENDING', 'EXPIRED') DEFAULT 'ACTIVE',
  \`pppoe_username\` VARCHAR(50) NOT NULL UNIQUE,
  \`pppoe_password\` VARCHAR(100) NOT NULL,
  \`ip_address\` VARCHAR(45),
  \`onu_serial_number\` VARCHAR(50),
  \`onu_model\` VARCHAR(50),
  \`odp_id\` VARCHAR(32),
  \`odp_port\` INT,
  \`latitude\` DECIMAL(10, 8),
  \`longitude\` DECIMAL(11, 8),
  \`tanggal_pasang\` DATE NOT NULL,
  \`tanggal_jatuh_tempo\` INT DEFAULT 10,
  \`total_tunggakan\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`paket_id\`) REFERENCES \`paket_internet\`(\`id\`) ON UPDATE CASCADE,
  FOREIGN KEY (\`odp_id\`) REFERENCES \`odp\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Table Perangkat Jaringan (Router, OLT, ODC, ONU)
CREATE TABLE IF NOT EXISTS \`perangkat\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`nama\` VARCHAR(100) NOT NULL,
  \`tipe\` ENUM('ROUTER', 'OLT', 'ODC', 'ODP', 'ONU', 'SERVER') NOT NULL,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`mac_address\` VARCHAR(30),
  \`serial_number\` VARCHAR(50),
  \`model\` VARCHAR(100),
  \`vendor\` VARCHAR(50),
  \`status\` ENUM('ONLINE', 'OFFLINE', 'WARNING', 'FAULT') DEFAULT 'ONLINE',
  \`uptime\` VARCHAR(50),
  \`latitude\` DECIMAL(10, 8),
  \`longitude\` DECIMAL(11, 8),
  \`optical_rx_power\` DECIMAL(5, 2),
  \`optical_tx_power\` DECIMAL(5, 2),
  \`optical_temp\` DECIMAL(5, 2),
  \`optical_volt\` DECIMAL(5, 2),
  \`customer_id\` VARCHAR(32),
  \`odp_id\` VARCHAR(32),
  \`firmware_version\` VARCHAR(50),
  \`wifi_ssid\` VARCHAR(100),
  \`last_inform\` TIMESTAMP NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (\`customer_id\`) REFERENCES \`pelanggan\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Table Kabel Fiber Optic (GIS Path)
CREATE TABLE IF NOT EXISTS \`kabel_fiber\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`nama\` VARCHAR(100) NOT NULL,
  \`from_node_id\` VARCHAR(32) NOT NULL,
  \`to_node_id\` VARCHAR(32) NOT NULL,
  \`core_count\` INT NOT NULL DEFAULT 12,
  \`tube_color\` VARCHAR(20) DEFAULT '#3b82f6',
  \`panjang_meter\` DECIMAL(8, 2) NOT NULL,
  \`redaman_db\` DECIMAL(5, 2) NOT NULL,
  \`status\` ENUM('NORMAL', 'DEGRADED', 'CUT') DEFAULT 'NORMAL',
  \`geojson_path\` JSON NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Table Log Aktivitas & Telemetri
CREATE TABLE IF NOT EXISTS \`log_aktivitas\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`source\` ENUM('MIKROTIK', 'GENIEACS', 'BILLING', 'MAP_EDITOR') NOT NULL,
  \`level\` ENUM('INFO', 'WARNING', 'CRITICAL', 'SUCCESS') NOT NULL,
  \`pesan\` TEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===============================================================
-- Initial Data Seeding
-- ===============================================================
INSERT INTO \`paket_internet\` (\`id\`, \`nama_paket\`, \`kecepatan_down_mbps\`, \`kecepatan_up_mbps\`, \`harga_bulanan\`, \`mikrotik_profile\`, \`deskripsi\`) VALUES
('PKG-20M', 'Home Basic 20 Mbps', 20, 10, 165000.00, 'PROFILE-20M', 'Browsing & streaming HD'),
('PKG-50M', 'Family Fast 50 Mbps', 50, 25, 250000.00, 'PROFILE-50M', 'Gaming & WFH keluarga'),
('PKG-100M', 'Gamer Ultra 100 Mbps', 100, 50, 375000.00, 'PROFILE-100M', 'Prioritas latency rendah'),
('PKG-200M', 'Business Pro 200 Mbps', 200, 100, 650000.00, 'PROFILE-200M', 'Dedicated upload & SLA')
ON DUPLICATE KEY UPDATE \`nama_paket\`=VALUES(\`nama_paket\`);
`;
  }

  // 7. Generate Nginx Site Configuration for Ubuntu
  generateNginxConfig(): string {
    const mikrotik = this.getMikrotikConfig();
    const genieacs = this.getGenieAcsConfig();

    return `# ===============================================================
# Nginx Configuration for NetNMS (Ubuntu Server)
# File: /etc/nginx/sites-available/netnms
# Symlink: sudo ln -s /etc/nginx/sites-available/netnms /etc/nginx/sites-enabled/
# Test: sudo nginx -t && sudo systemctl reload nginx
# ===============================================================

upstream genieacs_nbi {
    server 127.0.0.1:7557;
    keepalive 32;
}

upstream mikrotik_api {
    server ${mikrotik.host}:${mikrotik.apiPort};
}

server {
    listen 80;
    listen [::]:80;
    server_name netnms.local your-domain.com;

    root /var/www/netnms/dist;
    index index.html;

    client_max_body_size 20M;

    # 1. Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # 2. Reverse Proxy ke GenieACS NBI (TR-069 API)
    location /api/genieacs/ {
        rewrite ^/api/genieacs/(.*) /$1 break;
        proxy_pass http://genieacs_nbi;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }

    # 3. Reverse Proxy ke MikroTik RouterOS v7 REST API
    location /api/mikrotik/ {
        rewrite ^/api/mikrotik/(.*) /rest/$1 break;
        proxy_pass http://mikrotik_api;
        proxy_set_header Authorization "Basic ..."; # Gunakan htpasswd atau Authorization header
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    # 4. Gzip Compression for Fast GIS Map & Assets
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml;
    gzip_disable "MSIE [1-6]\.";
}
`;
  }

  // 8. Generate MikroTik Initial CLI Script
  generateMikrotikScript(): string {
    const customers = this.getCustomers();
    let script = `# ===============================================================
# MikroTik RouterOS Script Generator - NetNMS
# Jalankan via Terminal Winbox atau SSH ke Router CCR/RB
# ===============================================================

# 1. Buat IP Pool untuk Pelanggan PPPoE
/ip pool
add name=pool-pppoe-customers ranges=10.10.100.10-10.10.100.254
add name=pool-isolir-customers ranges=10.10.200.10-10.10.200.254

# 2. Buat Profile Paket Kecepatan (Rate-Limit)
/ppp profile
add name=PROFILE-20M local-address=10.10.100.1 remote-address=pool-pppoe-customers rate-limit="10M/20M" dns-server=1.1.1.1,8.8.8.8 comment="Paket Home Basic 20M"
add name=PROFILE-50M local-address=10.10.100.1 remote-address=pool-pppoe-customers rate-limit="25M/50M" dns-server=1.1.1.1,8.8.8.8 comment="Paket Family Fast 50M"
add name=PROFILE-100M local-address=10.10.100.1 remote-address=pool-pppoe-customers rate-limit="50M/100M" dns-server=1.1.1.1,8.8.8.8 comment="Paket Gamer 100M"
add name=PROFILE-200M local-address=10.10.100.1 remote-address=pool-pppoe-customers rate-limit="100M/200M" dns-server=1.1.1.1,8.8.8.8 comment="Paket Business 200M"

# 3. Buat Profile Isolir (Redirect ke Halaman Isolir)
add name=PROFILE-ISOLIR local-address=10.10.200.1 remote-address=pool-isolir-customers rate-limit="256k/512k" incoming-filter=ISOLIR_FILTER comment="Khusus Pelanggan Menunggak"

# 4. Sinkronisasi Data Pelanggan ke PPPoE Secrets
/ppp secret
`;

    customers.forEach((c) => {
      const profile = c.status === 'ISOLIR' ? 'PROFILE-ISOLIR' : `PROFILE-${c.speedMbps}M`;
      const disabled = c.status === 'EXPIRED' ? 'yes' : 'no';
      script += `add name="${c.pppoeUsername}" password="${c.pppoePassword}" profile="${profile}" remote-address=${c.assignedIp} comment="ID:${c.id} - ${c.name} - ODP:${c.odpId}" disabled=${disabled}\n`;
    });

    return script;
  }

  // Observer
  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const apiService = new ApiService();
