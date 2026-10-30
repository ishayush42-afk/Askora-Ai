import React, { useState } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  X,
} from 'lucide-react';
import { UserAccount } from '../types';
import { APP_LOGO } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  onBanned?: (customerId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onBanned,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bannedCustomerId, setBannedCustomerId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setBannedCustomerId(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (mode === 'register') {
      if (password !== rePassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
      if (password.length < 4) {
        setErrorMessage('Password must be at least 4 characters');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        }),
      });

      let data: any = null;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 403 || data?.isBanned || data?.error?.toLowerCase?.().includes('banned')) {
          const custId = data?.customerId || data?.userId || 'CUST-' + Math.floor(100000 + Math.random() * 900000);
          setBannedCustomerId(custId);
          setErrorMessage(`Your account is banned. Customer ID: ${custId}`);
          if (onBanned) {
            onBanned(custId);
            onClose();
          }
          return;
        }
        throw new Error(data?.error || (res.status === 403 ? 'Your account is banned' : 'Authentication failed'));
      }

      if (data.user) {
        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#171717] border border-white/10 p-6 sm:p-7 shadow-2xl text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Logo & Header */}
        <div className="text-center space-y-2 mb-6">
          <img
            src={APP_LOGO}
            alt="Askora AI"
            className="w-12 h-12 object-contain rounded-xl mx-auto shadow-md"
          />
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome to Askora AI' : 'Create an Account'}
          </h2>
          <p className="text-xs text-gray-400">
            {mode === 'login'
              ? 'Log in to sync your questions or access Admin panel'
              : 'Register your unique Username to get started'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#212121] p-1 rounded-xl mb-5 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setBannedCustomerId(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setBannedCustomerId(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message / Banned Notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <p className="leading-snug font-medium">{errorMessage}</p>
            </div>

            {/* If banned, show WhatsApp button directly */}
            {bannedCustomerId && (
              <a
                href="https://whatsapp.com/channel/0029VbE1ZmEHFxPA8KbrXb1k"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-[11px] flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12.031 2C6.495 2 2 6.495 2 12.031a9.98 9.98 0 0 0 1.558 5.344L2 22l4.809-1.528A9.985 9.985 0 0 0 12.031 22c5.536 0 10.031-4.495 10.031-10.031C22.062 6.495 17.567 2 12.031 2zm0 18.25a8.19 8.19 0 0 1-4.223-1.168l-.304-.18-2.85.906.924-2.777-.197-.315a8.204 8.204 0 0 1-1.28-4.485c0-4.544 3.696-8.24 8.24-8.24 4.544 0 8.24 3.696 8.24 8.24 0 4.544-3.696 8.24-8.24 8.24zm4.516-6.173c-.248-.124-1.464-.722-1.691-.805-.227-.083-.393-.124-.558.124-.165.248-.64 1.24-.784 1.405-.144.165-.29.186-.537.062-.248-.124-1.045-.385-1.99-1.228-.737-.657-1.235-1.469-1.38-1.717-.144-.248-.015-.382.109-.505.112-.111.248-.29.372-.434.124-.145.165-.248.248-.414.083-.165.041-.31-.02-.434-.063-.124-.558-1.343-.765-1.84-.2-.483-.404-.418-.558-.426l-.475-.008c-.165 0-.434.062-.661.31-.227.248-.868.848-.868 2.068 0 1.22 0 2.44 1.178 3.518.145.144 2.128 3.25 5.155 4.558.72.311 1.282.497 1.721.637.724.23 1.383.197 1.903.12.58-.087 1.777-.727 2.025-1.43.248-.703.248-1.306.174-1.43-.075-.124-.27-.197-.518-.321z" />
                </svg>
                <span>WhatsApp Customer Support मा सम्पर्क गर्नुहोस्</span>
              </a>
            )}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
          {/* Username / Email field */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400">
              {mode === 'login' ? 'Username or Admin Email' : 'Choose Username'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'login' ? 'Username or email...' : 'Unique username...'}
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#212121] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password..."
                autoComplete="new-password"
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#212121] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Re-enter password for register */}
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400">Re-enter Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={rePassword}
                  onChange={(e) => setRePassword(e.target.value)}
                  placeholder="Repeat password..."
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#212121] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs tracking-tight transition cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Enter Home Page' : 'Create & Login'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 text-center mt-5">
          Askora AI Secure Identity & Cloud Intelligence
        </p>
      </div>
    </div>
  );
};
