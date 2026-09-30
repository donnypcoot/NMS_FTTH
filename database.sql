-- ==============================================================================
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

-- Buat Database
CREATE DATABASE IF NOT EXISTS `netnms_isp`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `netnms_isp`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL ROLES (Hak Akses Pengguna)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_key` VARCHAR(50) NOT NULL UNIQUE COMMENT 'SUPER_ADMIN, TEKNISI, BILLING_CS, VIEWER',
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL PERMISSIONS (Daftar Izin Fitur)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `permission_key` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL COMMENT 'MAP, CUSTOMER, MIKROTIK, GENIEACS, BILLING, USER',
  `description` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL ROLE_PERMISSIONS (Pivot Role -> Izin)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `role_key` VARCHAR(50) NOT NULL,
  `permission_key` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`role_key`, `permission_key`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_key`) REFERENCES `roles` (`role_key`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_key`) REFERENCES `permissions` (`permission_key`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL USERS (Akun Pengguna Sistem)
-- Default Superadmin:
-- Username: admin
-- Password: admin (Disimpan sebagai bcrypt / sha256 hash)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT 'UUID atau USR-001',
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Bcrypt ($2y$10$...) atau SHA256',
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `role_key` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Aktif, 0 = Nonaktif/Suspend',
  `avatar_url` VARCHAR(255) NULL,
  `remember_token` VARCHAR(100) NULL,
  `last_login_at` DATETIME NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_key`) REFERENCES `roles` (`role_key`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL USER_PERMISSION_OVERRIDES (Kustomisasi Izin Khusus per User)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_permission_overrides`;
CREATE TABLE `user_permission_overrides` (
  `user_id` VARCHAR(36) NOT NULL,
  `permission_key` VARCHAR(100) NOT NULL,
  `is_granted` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Beri izin khusus, 0 = Cabut izin',
  PRIMARY KEY (`user_id`, `permission_key`),
  CONSTRAINT `fk_upo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upo_perm` FOREIGN KEY (`permission_key`) REFERENCES `permissions` (`permission_key`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABEL USER_SESSIONS (Sesi Login Aktif)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_sessions`;
CREATE TABLE `user_sessions` (
  `id` VARCHAR(64) PRIMARY KEY COMMENT 'Session ID / JWT JTI',
  `user_id` VARCHAR(36) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `payload` LONGTEXT NULL,
  `last_activity` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABEL AUDIT_LOGS (Catatan Aktivitas Sistem)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NULL,
  `source` ENUM('AUTH', 'MIKROTIK', 'GENIEACS', 'BILLING', 'MAP_EDITOR', 'SYSTEM') NOT NULL,
  `level` ENUM('INFO', 'WARNING', 'CRITICAL', 'SUCCESS') NOT NULL DEFAULT 'INFO',
  `message` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABEL PAKET INTERNET (Billing / MikroTik Profile)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `internet_packages`;
CREATE TABLE `internet_packages` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `speed_download_mbps` INT NOT NULL,
  `speed_upload_mbps` INT NOT NULL,
  `price_monthly` DECIMAL(12,2) NOT NULL,
  `mikrotik_profile` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABEL ODP & ODC (Infrastruktur Fiber Optic GIS)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `odps`;
CREATE TABLE `odps` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `total_ports` INT NOT NULL DEFAULT 8,
  `used_ports` INT NOT NULL DEFAULT 0,
  `splitter_ratio` VARCHAR(20) DEFAULT '1:8',
  `input_power_dbm` DECIMAL(5,2) DEFAULT -14.50,
  `coverage_radius_meters` INT DEFAULT 250,
  `lat` DECIMAL(10,8) NOT NULL,
  `lng` DECIMAL(11,8) NOT NULL,
  `address` TEXT NULL,
  `connected_odc_id` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABEL PELANGGAN (Customers / PPPoE Secrets)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'CUST-001',
  `nik` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `address` TEXT NOT NULL,
  `package_id` VARCHAR(50) NOT NULL,
  `status` ENUM('ACTIVE', 'ISOLIR', 'PENDING', 'EXPIRED') DEFAULT 'ACTIVE',
  `pppoe_username` VARCHAR(80) NOT NULL UNIQUE,
  `pppoe_password` VARCHAR(80) NOT NULL,
  `assigned_ip` VARCHAR(45) NULL,
  `onu_serial_number` VARCHAR(80) NULL,
  `onu_model` VARCHAR(80) NULL,
  `odp_id` VARCHAR(50) NULL,
  `odp_port` INT NULL,
  `lat` DECIMAL(10,8) NULL,
  `lng` DECIMAL(11,8) NULL,
  `monthly_fee` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `billing_day` INT NOT NULL DEFAULT 10,
  `installation_date` DATE NOT NULL,
  `last_payment_date` DATE NULL,
  `total_unpaid_bills` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cust_pkg` FOREIGN KEY (`package_id`) REFERENCES `internet_packages` (`id`),
  CONSTRAINT `fk_cust_odp` FOREIGN KEY (`odp_id`) REFERENCES `odps` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABEL PERANGKAT JARINGAN (Devices / Telemetri Real-time)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('ROUTER', 'OLT', 'ODC', 'ODP', 'ONU', 'SERVER') NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `mac_address` VARCHAR(30) NULL,
  `serial_number` VARCHAR(80) NULL,
  `model` VARCHAR(80) NOT NULL,
  `vendor` VARCHAR(50) NOT NULL,
  `status` ENUM('ONLINE', 'OFFLINE', 'WARNING', 'FAULT') DEFAULT 'ONLINE',
  `uptime` VARCHAR(80) NULL,
  `lat` DECIMAL(10,8) NOT NULL,
  `lng` DECIMAL(11,8) NOT NULL,
  `address` TEXT NULL,
  `optical_rx_power` DECIMAL(5,2) NULL,
  `optical_tx_power` DECIMAL(5,2) NULL,
  `optical_temp` DECIMAL(5,2) NULL,
  `rx_rate_bps` BIGINT DEFAULT 0,
  `tx_rate_bps` BIGINT DEFAULT 0,
  `customer_id` VARCHAR(50) NULL,
  `last_inform` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABEL KABEL FIBER OPTIC (Topology Links)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `fiber_cables`;
CREATE TABLE `fiber_cables` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `from_node_id` VARCHAR(50) NOT NULL,
  `from_node_type` VARCHAR(20) NOT NULL,
  `to_node_id` VARCHAR(50) NOT NULL,
  `to_node_type` VARCHAR(20) NOT NULL,
  `core_count` INT NOT NULL DEFAULT 12,
  `tube_color` VARCHAR(30) DEFAULT 'Blue',
  `length_meters` INT NOT NULL,
  `attenuation_db` DECIMAL(5,2) DEFAULT 0.35,
  `status` ENUM('NORMAL', 'DEGRADED', 'CUT') DEFAULT 'NORMAL',
  `path_geojson` LONGTEXT NOT NULL COMMENT 'JSON Array coordinates [{lat, lng}, ...]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABEL KONFIGURASI SERVER & INTEGRASI (MikroTik, GenieACS)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_key` VARCHAR(80) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- DATA AWAL (SEED DATA): ROLES & PERMISSIONS
-- ==============================================================================

-- Isi Master Roles
INSERT INTO `roles` (`role_key`, `name`, `description`) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Akses penuh ke seluruh modul: Map Editor, Billing, Pelanggan, MikroTik API, GenieACS TR-069, dan Manajemen User.'),
('TEKNISI', 'Teknisi Jaringan & Lapangan', 'Akses Map Editor, Tarik Jalur Fiber, Pemetaan ODP, Cek Redaman Optik ONU GenieACS, dan Ping RouterOS.'),
('BILLING_CS', 'Kasir & Customer Service', 'Akses Data Pelanggan, Tagihan Bulanan, Pembayaran, Isolir Pelanggan, dan Layanan Tiket.'),
('VIEWER', 'Monitoring / Tamu', 'Hanya dapat melihat status monitoring jaringan dan peta tanpa hak mengubah konfigurasi.');

-- Isi Master Permissions
INSERT INTO `permissions` (`permission_key`, `name`, `category`, `description`) VALUES
('canEditMap', 'Edit Map GIS & Fiber', 'MAP', 'Menambah, mengedit, atau menghapus node ODP/ODC dan menarik kabel fiber di Google Maps'),
('canManageCustomers', 'Kelola Data Pelanggan', 'CUSTOMER', 'Menambah, mengedit pelanggan, ganti paket, dan menghubungkan ke ODP'),
('canManageMikrotik', 'Akses API MikroTik', 'MIKROTIK', 'Melihat resource, isolir PPPoE, ubah profile rate limit, reboot router'),
('canManageGenieAcs', 'Akses GenieACS TR-069', 'GENIEACS', 'Cek redaman Rx/Tx optic, ubah SSID WiFi, push provision CPE, reboot ONT'),
('canManageBilling', 'Kelola Tagihan & Kasir', 'BILLING', 'Mencatat pembayaran bulanan, aktivasi isolir, dan cetak invoice pelanggan'),
('canManageUsers', 'Kelola Role & Pengguna', 'USER', 'Membuat user baru, reset password, atur role dan hak akses pengguna sistem');

-- Hubungkan Role -> Permissions
-- 1. SUPER_ADMIN: Semua izin
INSERT INTO `role_permissions` (`role_key`, `permission_key`) VALUES
('SUPER_ADMIN', 'canEditMap'),
('SUPER_ADMIN', 'canManageCustomers'),
('SUPER_ADMIN', 'canManageMikrotik'),
('SUPER_ADMIN', 'canManageGenieAcs'),
('SUPER_ADMIN', 'canManageBilling'),
('SUPER_ADMIN', 'canManageUsers');

-- 2. TEKNISI: Map, Customer (tinjau/pasang), GenieACS (optik)
INSERT INTO `role_permissions` (`role_key`, `permission_key`) VALUES
('TEKNISI', 'canEditMap'),
('TEKNISI', 'canManageCustomers'),
('TEKNISI', 'canManageGenieAcs');

-- 3. BILLING_CS: Customer & Billing
INSERT INTO `role_permissions` (`role_key`, `permission_key`) VALUES
('BILLING_CS', 'canManageCustomers'),
('BILLING_CS', 'canManageBilling');

-- (VIEWER: Tidak memiliki hak kelola, hanya view-only)


-- ==============================================================================
-- DATA AWAL PENGGUNA (DEFAULT USERS)
-- ==============================================================================
-- Default Superadmin:
-- USERNAME: admin
-- PASSWORD: admin
--
-- Password hash di bawah adalah:
-- 1. MD5/SHA256 untuk 'admin': '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
-- 2. Bcrypt standard hash untuk 'admin': '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW'
-- ==============================================================================

INSERT INTO `users` (`id`, `name`, `username`, `password_hash`, `email`, `phone`, `role_key`, `is_active`, `last_login_at`) VALUES
(
  'USR-001',
  'Super Administrator',
  'admin',
  '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', -- Password plaintext: admin
  'admin@isp.net',
  '081200000001',
  'SUPER_ADMIN',
  1,
  NOW()
),
(
  'USR-002',
  'Donny Perkasa',
  'donny.admin',
  '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', -- Password: admin
  'donnypcoot@gmail.com',
  '081234567890',
  'SUPER_ADMIN',
  1,
  NOW()
),
(
  'USR-003',
  'Ahmad Ridwan (Teknisi)',
  'ahmad.teknisi',
  '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', -- Password: admin
  'ahmad.ridwan@isp.net',
  '081398765432',
  'TEKNISI',
  1,
  DATE_SUB(NOW(), INTERVAL 1 HOUR)
),
(
  'USR-004',
  'Rina Marlina (Kasir & CS)',
  'rina.billing',
  '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', -- Password: admin
  'rina.marlina@isp.net',
  '085811223344',
  'BILLING_CS',
  1,
  DATE_SUB(NOW(), INTERVAL 3 HOUR)
),
(
  'USR-005',
  'Surya Pratama (Monitoring)',
  'surya.viewer',
  '$2y$10$Q7eYd/Z6mK5w1XpUu4Vd0eBq2K7n3vO1q8Yx.L3hD.nE.wW8BwUaW', -- Password: admin
  'surya.pratama@isp.net',
  '081765432109',
  'VIEWER',
  1,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- ==============================================================================
-- DATA AWAL PAKET INTERNET
-- ==============================================================================
INSERT INTO `internet_packages` (`id`, `name`, `speed_download_mbps`, `speed_upload_mbps`, `price_monthly`, `mikrotik_profile`, `description`) VALUES
('PKG-20M', 'Home Basic 20 Mbps', 20, 10, 165000.00, 'PROFILE-20M', 'Cocok untuk browsing dan streaming 1080p keluarga kecil.'),
('PKG-50M', 'Family Fast 50 Mbps', 50, 25, 275000.00, 'PROFILE-50M', 'Ideal untuk 4K streaming, game online, dan kerja WFH.'),
('PKG-100M', 'Pro Gamer 100 Mbps', 100, 50, 450000.00, 'PROFILE-100M', 'Kecepatan tinggi latensi rendah dengan prioritas bandwidth.'),
('PKG-200M', 'SOHO Ultra 200 Mbps', 200, 100, 750000.00, 'PROFILE-200M', 'Paket bisnis rumahan & kantor ruko tanpa batas.');

-- ==============================================================================
-- DATA AWAL KONFIGURASI SERVER
-- ==============================================================================
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('mikrotik_host', '192.168.88.1', 'Alamat IP atau Domain Router MikroTik'),
('mikrotik_port', '8728', 'Port API MikroTik (8728 API atau 443 REST API)'),
('mikrotik_user', 'api-netnms', 'Username API MikroTik'),
('genieacs_nbi_url', 'http://127.0.0.1:7557', 'URL Endpoint GenieACS NBI'),
('genieacs_cwmp_url', 'http://127.0.0.1:7547', 'URL Listener GenieACS CWMP'),
('app_mode', 'LIVE', 'Mode aplikasi: LIVE atau DEMO');

-- ==============================================================================
-- LOG AWAL SISTEM
-- ==============================================================================
INSERT INTO `audit_logs` (`user_id`, `source`, `level`, `message`) VALUES
('USR-001', 'SYSTEM', 'SUCCESS', 'Inisialisasi database MariaDB NetNMS ISP berhasil dibuat.'),
('USR-001', 'AUTH', 'SUCCESS', 'Default Super Administrator siap digunakan (user: admin, pass: admin).');

SET FOREIGN_KEY_CHECKS = 1;
