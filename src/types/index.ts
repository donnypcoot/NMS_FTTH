export type DeviceType = 'ROUTER' | 'OLT' | 'ODC' | 'ODP' | 'ONU' | 'SERVER';

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'FAULT';

export interface SnmpConfig {
  enabled: boolean;
  version: 'v1' | 'v2c' | 'v3';
  community?: string; // e.g. public
  port: number; // e.g. 161
  timeoutMs?: number;
  retries?: number;
  // SNMPv3 options
  securityLevel?: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
  username?: string;
  authProtocol?: 'MD5' | 'SHA' | 'SHA256';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES' | 'AES128';
  privPassword?: string;
  customOid?: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  macAddress?: string;
  serialNumber?: string;
  model: string;
  vendor: 'MikroTik' | 'ZTE' | 'Huawei' | 'Fiberhome' | 'VSOL' | 'Cisco' | 'Other';
  status: DeviceStatus;
  uptime: string;
  snmpConfig?: SnmpConfig;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  // Optical & RF Metrics (GenieACS / OLT)
  opticalRxPower?: number; // dBm, e.g. -19.4 dBm
  opticalTxPower?: number; // dBm, e.g. 2.5 dBm
  opticalTemperature?: number; // °C
  opticalVoltage?: number; // V
  // Network metrics (MikroTik / TR-069)
  rxRateBps?: number;
  txRateBps?: number;
  latencyMs?: number;
  packetLoss?: number;
  connectedOdpId?: string;
  odpPort?: number;
  customerId?: string;
  lastInform?: string;
  firmwareVersion?: string;
  wifiSsid?: string;
  wifiClientsCount?: number;
}

export interface OdpPort {
  portNumber: number;
  customerId?: string;
  customerName?: string;
  status: 'USED' | 'EMPTY' | 'DAMAGED';
  opticalLossDbm?: number;
}

export interface ODP {
  id: string;
  name: string; // e.g. ODP-MRD-01/08
  code: string;
  totalPorts: 8 | 16 | 24;
  usedPorts: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  connectedOdcId?: string;
  splitterRatio: '1:8' | '1:16' | '1:4';
  inputPowerDbm: number; // e.g. -14.2 dBm
  coverageRadiusMeters: number; // e.g. 250m
  ports: OdpPort[];
  notes?: string;
  photoUrl?: string;
}

export interface FiberCable {
  id: string;
  name: string;
  fromNodeId: string;
  fromNodeType: DeviceType;
  toNodeId: string;
  toNodeType: DeviceType;
  coreCount: number; // e.g. 12 Core, 24 Core, 1 Core Drop wire
  tubeColor: string; // Blue, Orange, Green, Brown, etc.
  lengthMeters: number;
  attenuationDb: number;
  status: 'NORMAL' | 'DEGRADED' | 'CUT';
  path: { lat: number; lng: number }[];
}

export interface Customer {
  id: string; // e.g. CUST-001
  nik: string;
  name: string;
  phone: string; // WhatsApp e.g. 08123456789
  address: string;
  packageId: string;
  packageName: string;
  speedMbps: number;
  monthlyFee: number;
  billingDay: number; // Due date of the month, e.g. 10
  status: 'ACTIVE' | 'ISOLIR' | 'PENDING' | 'EXPIRED';
  // Technical parameters
  pppoeUsername: string;
  pppoePassword: string;
  assignedIp: string;
  onuSerialNumber: string;
  onuModel: string;
  odpId: string;
  odpPort: number;
  location: {
    lat: number;
    lng: number;
  };
  installationDate: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  totalUnpaidBills: number;
}

export interface InternetPackage {
  id: string;
  name: string;
  speedDownloadMbps: number;
  speedUploadMbps: number;
  priceMonthly: number;
  mikrotikProfile: string;
  description: string;
}

export interface MikrotikConfig {
  host: string;
  apiPort: number; // 8728 or 443 for REST
  restEnabled: boolean;
  username: string;
  password: string;
  ssl: boolean;
  timeoutMs: number;
}

export interface GenieAcsConfig {
  nbiUrl: string; // e.g. http://192.168.1.100:7557
  cwmpUrl: string; // e.g. http://192.168.1.100:7547
  username?: string;
  password?: string;
  presetFilterPrefix?: string;
}

export interface MariaDbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface ServerIntegrationState {
  ubuntuHost: string;
  nginxConfigured: boolean;
  mariadbConfigured: boolean;
  mikrotikConnected: boolean;
  genieacsConnected: boolean;
  isSimulationMode: boolean;
}

export interface NetworkLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  source: 'MIKROTIK' | 'GENIEACS' | 'BILLING' | 'MAP_EDITOR' | 'AUTH' | 'SYSTEM';
  message: string;
}

export type UserRole = 'SUPER_ADMIN' | 'TEKNISI' | 'BILLING_CS' | 'VIEWER';

export interface UserPermissions {
  canEditMap: boolean;
  canManageCustomers: boolean;
  canManageMikrotik: boolean;
  canManageGenieAcs: boolean;
  canManageBilling: boolean;
  canManageUsers: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  lastLogin: string;
  permissions: UserPermissions;
}

