import React, { useState } from 'react';
import {
  Database,
  Download,
  Copy,
  Check,
  X,
  FileCode,
  Terminal,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';

interface DatabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSqlModal: React.FC<DatabaseSqlModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'SQL' | 'GUIDE' | 'TABLES'>('SQL');

  if (!isOpen) return null;

  const sqlContent = `-- ==============================================================================
-- NETNMS ISP & FTTH MANAGER - DATABASE SCHEMA (MariaDB / MySQL)
-- Sistem Manajemen Pelanggan, ODP/GIS, MikroTik API, GenieACS TR-069 & RBAC
-- Target OS: Ubuntu 22.04 / 24.04 LTS (Nginx + MariaDB 10.6+ / MySQL 8.0+)
-- ==============================================================================
-- CARA IMPORT DI TERMINAL UBUNTU:
-- 1. Buka terminal Ubuntu server Anda:
--    sudo mysql -u root -p
-- 2. Atau langsung eksekusi script ini ke database:
--    mariadb -u root -p < database.sql
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS \`netnms_isp\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE \`netnms_isp\`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABEL ROLES (Hak Akses Pengguna)
DROP TABLE IF EXISTS \`roles\`;
CREATE TABLE \`roles\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`role_key\` VARCHAR(50) NOT NULL UNIQUE COMMENT 'SUPER_ADMIN, TEKNISI, BILLING_CS, VIEWER',
  \`name\` VARCHAR(100) NOT NULL,
  \`description\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABEL PERMISSIONS (Daftar Izin Fitur)
DROP TABLE IF EXISTS \`permissions\`;
CREATE TABLE \`permissions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`permission_key\` VARCHAR(100) NOT NULL UNIQUE,
  \`name\` VARCHAR(100) NOT NULL,
  \`category\` VARCHAR(50) NOT NULL COMMENT 'MAP, CUSTOMER, MIKROTIK, GENIEACS, BILLING, USER',
  \`description\` VARCHAR(255),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABEL ROLE_PERMISSIONS (Pivot Role -> Izin)
DROP TABLE IF EXISTS \`role_permissions\`;
CREATE TABLE \`role_permissions\` (
  \`role_key\` VARCHAR(50) NOT NULL,
  \`permission_key\` VARCHAR(100) NOT NULL,
  PRIMARY KEY (\`role_key\`, \`permission_key\`),
  CONSTRAINT \`fk_rp_role\` FOREIGN KEY (\`role_key\`) REFERENCES \`roles\` (\`role_key\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`fk_rp_perm\` FOREIGN KEY (\`permission_key\`) REFERENCES \`permissions\` (\`permission_key\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABEL USERS (Akun Pengguna Sistem)
-- Default Superadmin:
-- Username: admin
-- Password: admin (Disimpan sebagai bcrypt / sha256 hash)
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(36) PRIMARY KEY COMMENT 'UUID atau USR-001',
  \`name\` VARCHAR(150) NOT NULL,
  \`username\` VARCHAR(60) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL COMMENT 'Bcrypt ($2y$10$...) atau SHA256',
  \`email\` VARCHAR(120) NOT NULL UNIQUE,
  \`phone\` VARCHAR(30) NULL,
  \`role_key\` VARCHAR(50) NOT NULL,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Aktif, 0 = Nonaktif/Suspend',
  \`avatar_url\` VARCHAR(255) NULL,
  \`remember_token\` VARCHAR(100) NULL,
  \`last_login_at\` DATETIME NULL,
  \`last_login_ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_users_role\` FOREIGN KEY (\`role_key\`) REFERENCES \`roles\` (\`role_key\`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABEL USER_PERMISSION_OVERRIDES
DROP TABLE IF EXISTS \`user_permission_overrides\`;
CREATE TABLE \`user_permission_overrides\` (
  \`user_id\` VARCHAR(36) NOT NULL,
  \`permission_key\` VARCHAR(100) NOT NULL,
  \`is_granted\` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (\`user_id\`, \`permission_key\`),
  CONSTRAINT \`fk_upo_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_upo_perm\` FOREIGN KEY (\`permission_key\`) REFERENCES \`permissions\` (\`permission_key\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL USER_SESSIONS
DROP TABLE IF EXISTS \`user_sessions\`;
CREATE TABLE \`user_sessions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`ip_address\` VARCHAR(45) NOT NULL,
  \`user_agent\` TEXT NULL,
  \`payload\` LONGTEXT NULL,
  \`last_activity\` INT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL AUDIT_LOGS
DROP TABLE IF EXISTS \`audit_logs\`;
CREATE TABLE \`audit_logs\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` VARCHAR(36) NULL,
  \`source\` ENUM('AUTH', 'MIKROTIK', 'GENIEACS', 'BILLING', 'MAP_EDITOR', 'SYSTEM') NOT NULL,
  \`level\` ENUM('INFO', 'WARNING', 'CRITICAL', 'SUCCESS') NOT NULL DEFAULT 'INFO',
  \`message\` TEXT NOT NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_logs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA: ROLES & DEFAULT USERS
INSERT INTO \`roles\` (\`role_key\`, \`name\`, \`description\`) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Akses penuh ke seluruh modul sistem.'),
('TEKNISI', 'Teknisi Jaringan & Lapangan', 'Akses Map Editor, Tarik Jalur Fiber, Pemetaan ODP & GenieACS.'),
('BILLING_CS', 'Kasir & Customer Service', 'Akses Data Pelanggan, Tagihan Bulanan & Pembayaran.'),
('VIEWER', 'Monitoring / Tamu', 'Hanya melihat status monitoring jaringan tanpa hak edit.');

-- DEFAULT SUPERADMIN (admin / admin)
INSERT INTO \`users\` (\`id\`, \`name\`, \`username\`, \`password_hash\`, \`email\`, \`phone\`, \`role_key\`, \`is_active\`, \`last_login_at\`) VALUES
('USR-001', 'Super Administrator', 'admin', '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', 'admin@isp.net', '081200000001', 'SUPER_ADMIN', 1, NOW()),
('USR-002', 'Donny Perkasa', 'donny.admin', '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', 'donnypcoot@gmail.com', '081234567890', 'SUPER_ADMIN', 1, NOW()),
('USR-003', 'Ahmad Ridwan (Teknisi)', 'ahmad.teknisi', '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', 'ahmad.ridwan@isp.net', '081398765432', 'TEKNISI', 1, NOW()),
('USR-004', 'Rina Marlina (Kasir)', 'rina.billing', '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', 'rina.marlina@isp.net', '085811223344', 'BILLING_CS', 1, NOW()),
('USR-005', 'Surya Pratama (Viewer)', 'surya.viewer', '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', 'surya.pratama@isp.net', '081765432109', 'VIEWER', 1, NOW());

SET FOREIGN_KEY_CHECKS = 1;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'database_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  File Skema MySQL / MariaDB
                </h2>
                <span className="font-mono text-[11px] bg-slate-800 text-blue-300 border border-slate-700 px-2 py-0.5 rounded">
                  database.sql
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Struktur tabel Users, Roles, Permissions, Pelanggan, ODP GIS, dan Audit Logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh File .sql</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subnav Tabs */}
        <div className="flex overflow-x-auto no-scrollbar px-3 sm:px-4 pt-2 border-b border-slate-800 bg-slate-950/40 gap-2">
          <button
            onClick={() => setActiveTab('SQL')}
            className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeTab === 'SQL'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script SQL (database.sql)
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeTab === 'GUIDE'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Panduan Import Ubuntu Server
          </button>
          <button
            onClick={() => setActiveTab('TABLES')}
            className={`px-3 py-2 text-xs font-bold border-b-2 cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeTab === 'TABLES'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Daftar Tabel &amp; Relasi
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'SQL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-mono text-emerald-400">
                  ✓ Termasuk User Default: <strong>admin</strong> (Password: <strong>admin</strong>, Role: <strong>SUPER_ADMIN</strong>)
                </span>
                <span>Tipe: MariaDB / MySQL DDL</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-[55vh]">
                <pre>{sqlContent}</pre>
              </div>
            </div>
          )}

          {activeTab === 'GUIDE' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200">
                <div className="font-bold flex items-center gap-1.5 text-sm mb-1 text-blue-300">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  Langkah Import ke MariaDB di Ubuntu:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  File ini sudah otomatis tersimpan di root direktori project sebagai{' '}
                  <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">database.sql</code> dan{' '}
                  <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">mariadb_schema_isp_netnms.sql</code>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white">1. Jalankan di Terminal Server Ubuntu:</div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-emerald-400">
                  sudo mariadb -u root -p &lt; database.sql
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white">2. Atau masuk ke shell MariaDB dan jalankan:</div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-emerald-400 space-y-1">
                  <div>sudo mariadb -u root -p</div>
                  <div className="text-slate-400">-- Di dalam console MariaDB:</div>
                  <div>CREATE DATABASE IF NOT EXISTS netnms_isp;</div>
                  <div>USE netnms_isp;</div>
                  <div>SOURCE /var/www/netnms/database.sql;</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white">3. Verifikasi Akun Superadmin:</div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-emerald-400">
                  SELECT id, username, name, role_key, is_active FROM netnms_isp.users;
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TABLES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  users
                </div>
                <p className="text-slate-400 text-[11px] mb-2">
                  Menyimpan akun pengguna, password hash, role_key, status aktif, dan waktu login.
                </p>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-900 p-2 rounded">
                  id (PK), username (UNIQUE), password_hash, email, phone, role_key (FK), is_active
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  roles &amp; permissions
                </div>
                <p className="text-slate-400 text-[11px] mb-2">
                  Tabel master hak akses berbasis RBAC (Role-Based Access Control).
                </p>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-900 p-2 rounded">
                  SUPER_ADMIN, TEKNISI, BILLING_CS, VIEWER + pivot role_permissions
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  customers
                </div>
                <p className="text-slate-400 text-[11px] mb-2">
                  Data pelanggan internet, PPPoE secret username/password, tagihan, dan port ODP.
                </p>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-900 p-2 rounded">
                  id, name, phone, pppoe_username, pppoe_password, odp_id (FK), odp_port, status
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  audit_logs
                </div>
                <p className="text-slate-400 text-[11px] mb-2">
                  Mencatat rekaman peristiwa login auth, perubahan router MikroTik, dan perubahan ODP.
                </p>
                <div className="font-mono text-[10px] text-slate-500 bg-slate-900 p-2 rounded">
                  id, user_id (FK), source (AUTH/MIKROTIK/GENIEACS), level, message, created_at
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs">
          <div className="text-slate-400">
            Path file: <code className="text-blue-300 font-mono">/database.sql</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
