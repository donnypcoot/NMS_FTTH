import React, { useState } from 'react';
import { UserAccount, UserPermissions, UserRole } from '../../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import { DatabaseSqlModal } from '../Database/DatabaseSqlModal';
import {
  UserCheck,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Wrench,
  Receipt,
  Search,
  Check,
  Database,
  FileCode,
} from 'lucide-react';

interface UserManagerProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onUpdateUsers: (users: UserAccount[]) => void;
  onSelectCurrentUser: (user: UserAccount) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  currentUser,
  onUpdateUsers,
  onSelectCurrentUser,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [formData, setFormData] = useState<Partial<UserAccount>>({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'TEKNISI',
    isActive: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.TEKNISI,
  });

  const [notice, setNotice] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      name: '',
      username: '',
      password: 'admin',
      email: '',
      phone: '',
      role: 'TEKNISI',
      isActive: true,
      lastLogin: 'Belum pernah login',
      permissions: DEFAULT_ROLE_PERMISSIONS.TEKNISI,
    });
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      ...user,
      password: user.password || 'admin',
    });
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({
      ...formData,
      role,
      permissions: { ...DEFAULT_ROLE_PERMISSIONS[role] },
    });
  };

  const handlePermissionToggle = (key: keyof UserPermissions) => {
    if (!formData.permissions) return;
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key],
      },
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return;

    const userToSave: UserAccount = {
      id: editingUser ? editingUser.id : formData.id || `USR-${Date.now().toString().slice(-3)}`,
      name: formData.name,
      username: formData.username.toLowerCase().replace(/\s+/g, '_'),
      password: formData.password?.trim() || (editingUser?.password ? editingUser.password : 'admin'),
      email: formData.email || `${formData.username}@isp.net`,
      phone: formData.phone || '',
      role: formData.role || 'TEKNISI',
      isActive: formData.isActive ?? true,
      lastLogin: editingUser ? editingUser.lastLogin : 'Baru dibuat',
      permissions: formData.permissions || DEFAULT_ROLE_PERMISSIONS[formData.role || 'TEKNISI'],
    };

    let updated: UserAccount[];
    if (editingUser) {
      updated = users.map((u) => (u.id === editingUser.id ? userToSave : u));
      setNotice(`User ${userToSave.name} berhasil diperbarui.`);
    } else {
      updated = [...users, userToSave];
      setNotice(`User baru ${userToSave.name} berhasil ditambahkan.`);
    }

    onUpdateUsers(updated);
    apiService.saveUsers(updated);

    // If updated current user, update session
    if (currentUser.id === userToSave.id) {
      onSelectCurrentUser(userToSave);
    }

    setIsModalOpen(false);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    if (confirm(`Yakin ingin menghapus user ${name}?`)) {
      const updated = users.filter((u) => u.id !== id);
      onUpdateUsers(updated);
      apiService.saveUsers(updated);
      setNotice(`User ${name} berhasil dihapus.`);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>Super Admin</span>
          </span>
        );
      case 'TEKNISI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
            <Wrench className="w-3 h-3 text-blue-400" />
            <span>Teknisi Lapangan</span>
          </span>
        );
      case 'BILLING_CS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <Receipt className="w-3 h-3 text-emerald-400" />
            <span>Kasir &amp; Billing CS</span>
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Eye className="w-3 h-3 text-slate-400" />
            <span>Viewer (Read-Only)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {notice && (
        <div className="bg-blue-600/90 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-white hover:text-blue-200">✕</button>
        </div>
      )}

      {/* Role Switcher Sandbox Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Role-Based Access Control (RBAC)</span>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono px-2 py-0.5 rounded-full">
                Sesi Aktif: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Setiap user memiliki hak akses spesifik terhadap Map Editor, Data Pelanggan, MikroTik, dan GenieACS.
            </p>
          </div>
        </div>

        {/* Quick Switcher dropdown to preview different roles */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-300">Ganti Sesi Role:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = users.find((item) => item.id === e.target.value);
              if (u) {
                onSelectCurrentUser(u);
                apiService.setCurrentUser(u);
                setNotice(`Sesi dialihkan ke ${u.name} (Role: ${u.role})`);
                setTimeout(() => setNotice(null), 2500);
              }
            }}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-400 text-xs">Super Admin</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            Akses tak terbatas: Full Map Editor, Billing &amp; Pelanggan, Eksekusi MikroTik, GenieACS TR-069, serta manajemen akun user.
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Izin: 6/6 Modul Aktif</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-400 text-xs">Teknisi Lapangan</span>
            <Wrench className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            Fokus operasional lapangan: Pasang ODP di Map, tarik kabel, pantau redaman optik ONT, reboot TR-069 &amp; konfigurasi Wi-Fi.
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Tanpa Akses Keuangan / Billing</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 text-xs">Kasir &amp; Billing CS</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            Fokus administrasi: Pendaftaran pelanggan, invoice tagihan, kirim pesan WhatsApp, dan eksekusi isolir pelanggan menunggak.
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Tanpa Akses RouterOS &amp; Topologi Map</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-400 text-xs">Viewer (Read-Only)</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-300 leading-relaxed">
            Hanya dapat melihat status monitoring, grafik bandwidth, dan daftar perangkat tanpa izin membuat perubahan apapun.
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Izin: Read-Only</div>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari user berdasarkan nama, username, atau email..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            <option value="ALL">Semua Role</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="TEKNISI">Teknisi</option>
            <option value="BILLING_CS">Billing &amp; CS</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            title="Buka atau unduh file skema MySQL (database.sql) untuk MariaDB Ubuntu"
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>Skema MySQL (.sql)</span>
          </button>

          {currentUser.permissions.canManageUsers && (
            <button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Akun User</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile User Cards List (Visible on Mobile/Small Screens) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Tidak ada user yang cocok dengan filter.
          </div>
        ) : (
          filtered.map((u) => {
            const isCurrent = u.id === currentUser.id;

            return (
              <div
                key={u.id}
                className={`bg-slate-900 border rounded-xl p-3.5 space-y-3 transition-colors ${
                  isCurrent ? 'border-indigo-600/70 bg-indigo-950/15' : 'border-slate-800'
                }`}
              >
                {/* Header: User avatar, Name & Role */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.2 rounded font-mono">
                            (Anda)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        @{u.username} • {u.id}
                      </div>
                    </div>
                  </div>
                  <div>{getRoleBadge(u.role)}</div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400">Email &amp; HP</div>
                    <div className="text-slate-200 text-xs mt-0.5 truncate">{u.email}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{u.phone || '-'}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400">Status &amp; Login</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span className="text-slate-200 text-xs font-medium">{u.isActive ? 'Aktif' : 'Non-aktif'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{u.lastLogin}</div>
                  </div>

                  {/* Permissions Chips */}
                  <div className="col-span-2 pt-1 border-t border-slate-800/60">
                    <div className="text-[10px] text-slate-400 mb-1">Hak Akses Modul:</div>
                    <div className="flex flex-wrap gap-1">
                      {u.permissions.canEditMap && (
                        <span className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">Map Editor</span>
                      )}
                      {u.permissions.canManageCustomers && (
                        <span className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">Pelanggan</span>
                      )}
                      {u.permissions.canManageMikrotik && (
                        <span className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">MikroTik</span>
                      )}
                      {u.permissions.canManageGenieAcs && (
                        <span className="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-[10px]">GenieACS</span>
                      )}
                      {u.permissions.canManageBilling && (
                        <span className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">Billing</span>
                      )}
                      {u.permissions.canManageUsers && (
                        <span className="bg-slate-800 text-rose-300 px-1.5 py-0.5 rounded text-[10px]">Kelola User</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Thumb-Friendly Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        onSelectCurrentUser(u);
                        apiService.setCurrentUser(u);
                        setNotice(`Sesi dialihkan ke ${u.name} (Role: ${u.role})`);
                        setTimeout(() => setNotice(null), 2500);
                      }}
                      className="flex-1 py-1.5 px-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[36px] cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Ganti ke User Ini</span>
                    </button>
                  )}

                  {currentUser.permissions.canManageUsers && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 min-h-[36px] cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {!isCurrent && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-2 bg-slate-800 hover:bg-rose-950 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Hapus user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Users Table (Visible on Tablets & Desktops) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-4">Role Akses</th>
                <th className="py-3 px-4">Kontak &amp; Email</th>
                <th className="py-3 px-4">Izin Modul</th>
                <th className="py-3 px-4">Status &amp; Aktivitas</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filtered.map((u) => {
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className={`hover:bg-slate-800/40 transition-colors ${isCurrent ? 'bg-slate-800/20' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.2 rounded font-mono">
                                (Anda)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">@{u.username} • {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200">{u.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.phone || '-'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.permissions.canEditMap && (
                          <span className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">Map Editor</span>
                        )}
                        {u.permissions.canManageCustomers && (
                          <span className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">Pelanggan</span>
                        )}
                        {u.permissions.canManageMikrotik && (
                          <span className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">MikroTik</span>
                        )}
                        {u.permissions.canManageGenieAcs && (
                          <span className="bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded text-[10px]">GenieACS</span>
                        )}
                        {u.permissions.canManageBilling && (
                          <span className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">Billing</span>
                        )}
                        {u.permissions.canManageUsers && (
                          <span className="bg-slate-800 text-rose-300 px-1.5 py-0.5 rounded text-[10px]">Kelola User</span>
                        )}
                        {!Object.values(u.permissions).some(Boolean) && (
                          <span className="text-slate-500 text-[10px]">Read-Only</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="text-slate-200 font-medium">{u.isActive ? 'Aktif' : 'Non-aktif'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{u.lastLogin}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {currentUser.permissions.canManageUsers && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit role & hak akses user"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!isCurrent && (
                              <button
                                onClick={() => handleDelete(u.id, u.name)}
                                title="Hapus akun user"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span>{editingUser ? 'Edit User & Role Akses' : 'Tambah Akun Pengguna Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Doni Satria"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="doni.teknisi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Kata Sandi {editingUser ? '(Ubah Password)' : '(Default: admin)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Ketik password baru' : 'admin'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doni@isp.net"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">No. Handphone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="08123456789"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-slate-400 mb-1">Pilih Role Pengguna</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['SUPER_ADMIN', 'TEKNISI', 'BILLING_CS', 'VIEWER'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                        formData.role === r
                          ? 'bg-blue-900/50 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs">{r.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r === 'SUPER_ADMIN'
                          ? 'Akses Penuh Semua Modul'
                          : r === 'TEKNISI'
                          ? 'Map Editor, ODP & GenieACS'
                          : r === 'BILLING_CS'
                          ? 'Pelanggan, Tagihan & Isolir'
                          : 'Monitoring Read-Only'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Checklist */}
              <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Hak Akses Spesifik (Custom Permissions)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canEditMap ?? false}
                      onChange={() => handlePermissionToggle('canEditMap')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Edit Map &amp; Tarik Kabel Fiber</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageCustomers ?? false}
                      onChange={() => handlePermissionToggle('canManageCustomers')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Kelola Data Pelanggan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageMikrotik ?? false}
                      onChange={() => handlePermissionToggle('canManageMikrotik')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Akses Konfigurasi MikroTik</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageGenieAcs ?? false}
                      onChange={() => handlePermissionToggle('canManageGenieAcs')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Akses Reboot &amp; Wi-Fi GenieACS</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageBilling ?? false}
                      onChange={() => handlePermissionToggle('canManageBilling')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Kelola Tagihan &amp; Isolir</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.permissions?.canManageUsers ?? false}
                      onChange={() => handlePermissionToggle('canManageUsers')}
                      className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
                    />
                    <span>Kelola Akun &amp; Hak Akses User</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-lg cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MySQL Schema Modal */}
      <DatabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
};
