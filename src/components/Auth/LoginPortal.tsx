import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  AlertCircle,
  Database,
  ArrowRight,
  Server,
  FileCode,
  CheckCircle2,
  Copy,
  Download,
} from 'lucide-react';

interface LoginPortalProps {
  onLoginSuccess: (user: UserAccount) => void;
  onOpenSqlModal: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  onOpenSqlModal,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = apiService.login(username, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25 mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            NetNMS <span className="text-blue-400">ISP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistem Manajemen Pelanggan, ODP GIS, MikroTik &amp; GenieACS
          </p>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 mt-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-300">Ubuntu LTS</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">MariaDB RBAC</span>
          </div>
        </div>

        {/* Quick Fill Preset Banner for User Testing */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 mb-5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Akun Default Sistem:
            </span>
            <span className="text-[10px] text-slate-500">Klik untuk isi otomatis</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin')}
              className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                username === 'admin'
                  ? 'bg-blue-950/80 border-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-blue-400 font-bold flex items-center justify-between">
                <span>👑 Superadmin</span>
                <span className="text-[9px] bg-blue-900/60 px-1 rounded text-blue-200">Default</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">admin / admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('ahmad.teknisi', 'admin')}
              className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                username === 'ahmad.teknisi'
                  ? 'bg-blue-950/80 border-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-emerald-400 font-bold">🔧 Teknisi ODP</div>
              <div className="font-mono text-[10px] text-slate-400">ahmad.teknisi / admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('rina.billing', 'admin')}
              className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                username === 'rina.billing'
                  ? 'bg-blue-950/80 border-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-purple-400 font-bold">💳 Billing &amp; CS</div>
              <div className="font-mono text-[10px] text-slate-400">rina.billing / admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('surya.viewer', 'admin')}
              className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                username === 'surya.viewer'
                  ? 'bg-blue-950/80 border-blue-600 text-white font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="text-amber-400 font-bold">👁️ Monitoring</div>
              <div className="font-mono text-[10px] text-slate-400">surya.viewer / admin</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username Pengguna
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username (contoh: admin)"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi (default: admin)"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0"
              />
              <span>Ingat sesi masuk</span>
            </label>
            <span className="text-[11px] text-slate-500">Port 80/443 Nginx</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Database SQL Schema Button */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onOpenSqlModal}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Lihat File Skema MySQL / MariaDB (database.sql)</span>
          </button>
        </div>
      </div>

      {/* Subtext info */}
      <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
        <p>Aplikasi ISP &amp; FTTH Manajemen Terpadu untuk Server Ubuntu</p>
        <p className="text-[11px] text-slate-600">
          Superadmin Default: <strong className="text-slate-400 font-mono">admin</strong> • Password:{' '}
          <strong className="text-slate-400 font-mono">admin</strong>
        </p>
      </div>
    </div>
  );
};
