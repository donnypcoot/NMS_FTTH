import React, { useState } from 'react';
import { Customer, InternetPackage, ODP } from '../../types';
import { INITIAL_PACKAGES } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Edit,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Key,
} from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  odps: ODP[];
  packages?: InternetPackage[];
  onUpdateCustomers: (customers: Customer[]) => void;
  onLocateOnMap?: (lat: number, lng: number) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  odps,
  packages = INITIAL_PACKAGES,
  onUpdateCustomers,
  onLocateOnMap,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [odpFilter, setOdpFilter] = useState<string>('ALL');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    nik: '',
    phone: '',
    address: '',
    packageId: 'PKG-20M',
    status: 'ACTIVE',
    pppoeUsername: '',
    pppoePassword: '',
    assignedIp: '',
    onuSerialNumber: '',
    onuModel: 'ZXHN F609 V3',
    odpId: odps[0]?.id || '',
    odpPort: 1,
    billingDay: 10,
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Filtered customer list
  const filtered = customers.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (odpFilter !== 'ALL' && c.odpId !== odpFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.pppoeUsername.toLowerCase().includes(q) ||
        c.onuSerialNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    const newId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    setFormData({
      id: newId,
      name: '',
      nik: '3273' + Math.floor(100000000000 + Math.random() * 900000000000),
      phone: '',
      address: '',
      packageId: 'PKG-20M',
      packageName: 'Home Basic 20 Mbps',
      speedMbps: 20,
      monthlyFee: 165000,
      status: 'ACTIVE',
      pppoeUsername: '',
      pppoePassword: 'pass' + Math.floor(1000 + Math.random() * 9000),
      assignedIp: `10.10.100.${Math.floor(20 + Math.random() * 200)}`,
      onuSerialNumber: 'ZTEGC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      onuModel: 'ZXHN F609 V3',
      odpId: odps[0]?.id || '',
      odpPort: 1,
      billingDay: 10,
      totalUnpaidBills: 0,
      installationDate: new Date().toISOString().split('T')[0],
      location: {
        lat: -6.9118 + (Math.random() - 0.5) * 0.005,
        lng: 107.6225 + (Math.random() - 0.5) * 0.005,
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    const selectedPkg = packages.find((p) => p.id === formData.packageId) || packages[0];

    const customerToSave: Customer = {
      ...(formData as Customer),
      packageName: selectedPkg.name,
      speedMbps: selectedPkg.speedDownloadMbps,
      monthlyFee: selectedPkg.priceMonthly,
      pppoeUsername:
        formData.pppoeUsername ||
        formData.name.toLowerCase().replace(/\s+/g, '_') + '@net',
    };

    let updated: Customer[];
    if (editingCustomer) {
      updated = customers.map((c) => (c.id === editingCustomer.id ? customerToSave : c));
      setNotification(`Data pelanggan ${customerToSave.name} berhasil diperbarui.`);
      apiService.addLog('INFO', 'BILLING', `Pelanggan diubah: ${customerToSave.name} (${customerToSave.id})`);
    } else {
      updated = [...customers, customerToSave];
      setNotification(`Pelanggan baru ${customerToSave.name} berhasil ditambahkan.`);
      apiService.addLog('SUCCESS', 'BILLING', `Pelanggan baru terdaftar: ${customerToSave.name} (${customerToSave.pppoeUsername})`);
    }

    onUpdateCustomers(updated);
    apiService.saveCustomers(updated);
    setIsModalOpen(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus data pelanggan ${name}?`)) {
      const updated = customers.filter((c) => c.id !== id);
      onUpdateCustomers(updated);
      apiService.saveCustomers(updated);
      apiService.addLog('WARNING', 'BILLING', `Pelanggan dihapus: ${name} (${id})`);
      setNotification(`Pelanggan ${name} dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleIsolir = (c: Customer) => {
    const res = apiService.toggleCustomerIsolir(c.id);
    onUpdateCustomers(apiService.getCustomers());
    setNotification(res.message);
    setTimeout(() => setNotification(null), 3000);
  };

  // WhatsApp Billing Reminder Generator
  const sendWhatsAppReminder = (c: Customer) => {
    const formatRp = (num: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const message = encodeURIComponent(
      `Halo Kak *${c.name}*,\n\n` +
      `Kami dari Tim Billing NetNMS ISP menginformasikan tagihan internet berlangganan Anda:\n` +
      `• *ID Pelanggan:* ${c.id}\n` +
      `• *Paket:* ${c.packageName} (${c.speedMbps} Mbps)\n` +
      `• *Jatuh Tempo:* Tanggal ${c.billingDay} bulan ini\n` +
      `• *Total Tagihan:* ${formatRp(c.monthlyFee * Math.max(1, c.totalUnpaidBills))}\n\n` +
      `Mohon lakukan pembayaran via Transfer Bank BCA / Mandiri / QRIS agar koneksi internet tetap lancar dan tidak terisolir otomatis.\n\n` +
      `Konfirmasi bukti bayar kirim ke nomor ini ya. Terima kasih! 🙏`
    );

    // Format phone to 62...
    let cleanPhone = c.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(waUrl, '_blank');
    apiService.addLog('INFO', 'BILLING', `Invoice WhatsApp dikirim ke ${c.name} (${c.phone})`);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="bg-blue-600/90 text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400 text-xs font-medium flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-white hover:text-blue-200">✕</button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Manajemen Data Pelanggan (FTTH &amp; Broadband)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Kelola profil pelanggan, sinkronisasi PPPoE MikroTik, kredensial ONU GenieACS, dan status isolir tagihan.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Pelanggan Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID, Nama, No HP, PPPoE user, atau Serial ONU..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ISOLIR">Isolir / Suspended</option>
            <option value="EXPIRED">Non-aktif / Putus</option>
          </select>

          <select
            value={odpFilter}
            onChange={(e) => setOdpFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            <option value="ALL">Semua ODP</option>
            {odps.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 ml-auto">
          Total: <span className="font-semibold text-white">{filtered.length}</span> pelanggan
        </div>
      </div>

      {/* Mobile Customer Cards List (Visible on Mobile/Small Screens) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Tidak ada pelanggan yang cocok dengan pencarian.
          </div>
        ) : (
          filtered.map((c) => {
            const isIsolir = c.status === 'ISOLIR';
            const isUnpaid = c.totalUnpaidBills > 0;

            return (
              <div
                key={c.id}
                className={`bg-slate-900 border rounded-xl p-3.5 space-y-3 transition-colors ${
                  isIsolir ? 'border-rose-800/60 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                {/* Header: Name, ID & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{c.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono mt-0.5">
                      <span className="bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">{c.id}</span>
                      <span>NIK: {c.nik}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                        : c.status === 'ISOLIR'
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-400'
                          : c.status === 'ISOLIR'
                          ? 'bg-rose-400'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{c.status}</span>
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400">Paket &amp; Tagihan</div>
                    <div className="font-semibold text-slate-200 text-xs mt-0.5">{c.packageName}</div>
                    <div className="text-[10px] text-slate-400">
                      Rp {c.monthlyFee.toLocaleString('id-ID')} / bln
                    </div>
                    {isUnpaid && (
                      <div className="text-[10px] font-semibold text-rose-400">
                        Nunggak {c.totalUnpaidBills} bln
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400">PPPoE &amp; IP</div>
                    <div className="font-mono text-blue-400 text-xs font-semibold mt-0.5 truncate">{c.pppoeUsername}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{c.assignedIp}</div>
                    <div className="text-[10px] text-purple-300 truncate">
                      {c.odpId} (P{c.odpPort})
                    </div>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{c.phone}</span>
                    </div>
                    <div className="truncate max-w-[180px] text-[10px]" title={c.address}>
                      {c.address}
                    </div>
                  </div>
                </div>

                {/* Mobile Thumb-Friendly Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {/* Toggle Isolir Button */}
                  <button
                    onClick={() => handleToggleIsolir(c)}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition min-h-[38px] ${
                      isIsolir
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60'
                    }`}
                  >
                    {isIsolir ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Buka Isolir</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Isolir</span>
                      </>
                    )}
                  </button>

                  {/* WhatsApp Reminder */}
                  <button
                    onClick={() => sendWhatsAppReminder(c)}
                    title="Kirim pesan WhatsApp"
                    className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Locate on Map */}
                  {onLocateOnMap && c.location && (
                    <button
                      onClick={() => onLocateOnMap(c.location.lat, c.location.lng)}
                      title="Lihat di Peta"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(c)}
                    title="Edit Data"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    title="Hapus"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Customer Table (Visible on Tablets & Desktops) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID &amp; Nama Pelanggan</th>
                <th className="py-3 px-4">Kontak &amp; Alamat</th>
                <th className="py-3 px-4">Paket &amp; Tagihan</th>
                <th className="py-3 px-4">MikroTik (PPPoE)</th>
                <th className="py-3 px-4">Distribusi ODP &amp; ONU</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada pelanggan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isIsolir = c.status === 'ISOLIR';
                  const isUnpaid = c.totalUnpaidBills > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* ID & Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm">{c.name}</div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono mt-0.5">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{c.id}</span>
                          <span>NIK: {c.nik}</span>
                        </div>
                      </td>

                      {/* Contact & Address */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-200">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{c.phone}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={c.address}>
                          {c.address}
                        </div>
                      </td>

                      {/* Package & Billing */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{c.packageName}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Rp {c.monthlyFee.toLocaleString('id-ID')} / bln • Tgl {c.billingDay}
                        </div>
                        {isUnpaid && (
                          <div className="text-[10px] font-semibold text-rose-400 mt-0.5">
                            Menunggak {c.totalUnpaidBills} bulan
                          </div>
                        )}
                      </td>

                      {/* MikroTik PPPoE */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-blue-400">{c.pppoeUsername}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Key className="w-2.5 h-2.5 text-slate-500" />
                          <span>{c.pppoePassword}</span>
                          <span className="text-slate-600">•</span>
                          <span>{c.assignedIp}</span>
                        </div>
                      </td>

                      {/* ODP & ONU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-purple-300 font-medium">
                          <span>{c.odpId}</span>
                          <span className="text-slate-400 text-[10px]">(Port {c.odpPort})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          SN: <span className="text-slate-300">{c.onuSerialNumber}</span> ({c.onuModel})
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                              : c.status === 'ISOLIR'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-400'
                                : c.status === 'ISOLIR'
                                ? 'bg-rose-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{c.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Isolir */}
                          <button
                            onClick={() => handleToggleIsolir(c)}
                            title={isIsolir ? 'Buka Isolir / Aktifkan Kembali' : 'Isolir Pelanggan di MikroTik'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isIsolir
                                ? 'bg-emerald-950/50 hover:bg-emerald-900 border-emerald-800 text-emerald-400'
                                : 'bg-rose-950/50 hover:bg-rose-900 border-rose-800 text-rose-400'
                            }`}
                          >
                            {isIsolir ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          </button>

                          {/* WhatsApp Invoice Reminder */}
                          <button
                            onClick={() => sendWhatsAppReminder(c)}
                            title="Kirim Pengingat Tagihan via WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Locate on Map */}
                          {onLocateOnMap && c.location && (
                            <button
                              onClick={() => onLocateOnMap(c.location.lat, c.location.lng)}
                              title="Tampilkan lokasi rumah di Google Maps"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit data pelanggan"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            title="Hapus pelanggan"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingCustomer ? 'Edit Data Pelanggan' : 'Pendaftaran Pelanggan Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Info */}
                <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    1. Data Diri &amp; Alamat
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nomor KTP / NIK</label>
                    <input
                      type="text"
                      value={formData.nik || ''}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      placeholder="16 digit NIK"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nomor WhatsApp / HP</label>
                    <input
                      type="text"
                      required
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="08123456789"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Alamat Pemasangan</label>
                    <textarea
                      rows={2}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Nama jalan, RT/RW, kelurahan..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Service & Billing Info */}
                <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    2. Paket Layanan &amp; Penagihan
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Paket Berlangganan</label>
                    <select
                      value={formData.packageId || 'PKG-20M'}
                      onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — Rp {pkg.priceMonthly.toLocaleString('id-ID')} ({pkg.speedDownloadMbps} Mbps)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Tgl Jatuh Tempo</label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={formData.billingDay || 10}
                        onChange={(e) => setFormData({ ...formData, billingDay: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Status Awal</label>
                      <select
                        value={formData.status || 'ACTIVE'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      >
                        <option value="ACTIVE">Aktif</option>
                        <option value="ISOLIR">Isolir</option>
                        <option value="PENDING">Menunggu Aktivasi</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">PPPoE Username</label>
                    <input
                      type="text"
                      value={formData.pppoeUsername || ''}
                      onChange={(e) => setFormData({ ...formData, pppoeUsername: e.target.value })}
                      placeholder="username@net"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">PPPoE Password</label>
                    <input
                      type="text"
                      value={formData.pppoePassword || ''}
                      onChange={(e) => setFormData({ ...formData, pppoePassword: e.target.value })}
                      placeholder="Password PPPoE"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Infrastructure Details */}
                <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800 md:col-span-2">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                    3. Parameter Perangkat (ODP &amp; GenieACS TR-069)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Hubungkan ke ODP</label>
                      <select
                        value={formData.odpId || ''}
                        onChange={(e) => setFormData({ ...formData, odpId: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      >
                        {odps.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.usedPorts}/{o.totalPorts} Port)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Nomor Port ODP</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={formData.odpPort || 1}
                        onChange={(e) => setFormData({ ...formData, odpPort: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">IP Statis Pelanggan</label>
                      <input
                        type="text"
                        value={formData.assignedIp || ''}
                        onChange={(e) => setFormData({ ...formData, assignedIp: e.target.value })}
                        placeholder="10.10.100.x"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Serial Number (SN) ONT/ONU</label>
                      <input
                        type="text"
                        value={formData.onuSerialNumber || ''}
                        onChange={(e) => setFormData({ ...formData, onuSerialNumber: e.target.value })}
                        placeholder="ZTEGC... atau Huawei SN"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Model ONT</label>
                      <input
                        type="text"
                        value={formData.onuModel || ''}
                        onChange={(e) => setFormData({ ...formData, onuModel: e.target.value })}
                        placeholder="ZTE F609 / Huawei HG8245H5"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
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
                  {editingCustomer ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
