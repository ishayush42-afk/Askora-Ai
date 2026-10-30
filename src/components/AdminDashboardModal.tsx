import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  Key,
  Trash2,
  RefreshCw,
  X,
  History,
  ShieldAlert,
  Smartphone,
  Calendar,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { UserAccount, UserHistoryItem } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutAdmin: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onLogoutAdmin,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, bannedUsers: 0, totalSearches: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Search user history state
  const [inspectUserId, setInspectUserId] = useState('');
  const [inspectedUser, setInspectedUser] = useState<UserAccount | null>(null);
  const [inspectedHistory, setInspectedHistory] = useState<UserHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // New Password state
  const [resetTargetUsername, setResetTargetUsername] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const adminToken = 'Bearer ADMIN-AAYUSH';

  useEffect(() => {
    if (isOpen) {
      loadAllUsers();
    }
  }, [isOpen]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: adminToken },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setStats({
          totalUsers: data.totalUsers || 0,
          bannedUsers: data.bannedUsers || 0,
          totalSearches: data.totalSearches || 0,
        });
      }
    } catch (e) {
      console.warn('Failed to load admin users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectUser = async (targetId: string) => {
    if (!targetId.trim()) return;
    setIsHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(
        `/api/admin/user-history?userId=${encodeURIComponent(targetId.trim())}`,
        {
          headers: { Authorization: adminToken },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'User not found');
      }
      const data = await res.json();
      setInspectedUser(data.user);
      setInspectedHistory(data.history || []);
    } catch (e: any) {
      setHistoryError(e.message || 'User not found');
      setInspectedUser(null);
      setInspectedHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleToggleBan = async (user: UserAccount) => {
    const nextStatus = !user.isBanned;
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: adminToken,
        },
        body: JSON.stringify({ userId: user.id, isBanned: nextStatus }),
      });
      if (res.ok) {
        loadAllUsers();
        if (inspectedUser && inspectedUser.id === user.id) {
          setInspectedUser({ ...inspectedUser, isBanned: nextStatus });
        }
      }
    } catch (e) {
      console.warn('Error updating ban status:', e);
    }
  };

  const handleRemoveAccount = async (userId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userId}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: adminToken },
      });
      if (res.ok) {
        loadAllUsers();
        if (inspectedUser && inspectedUser.id === userId) {
          setInspectedUser(null);
          setInspectedHistory([]);
        }
      }
    } catch (e) {
      console.warn('Delete error:', e);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    if (!resetTargetUsername.trim() || !newPasswordVal) {
      setPasswordError('Please provide both Username and New Password');
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: adminToken,
        },
        body: JSON.stringify({
          username: resetTargetUsername.trim(),
          newPassword: newPasswordVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordSuccess(data.message || 'Password changed successfully!');
      setNewPasswordVal('');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to reset password');
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#171717] border border-white/10 p-5 sm:p-7 text-white shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Askora Master Admin Panel</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  Full Backend Live
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Logged in as Master Administrator (Aayush Katuwal)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogoutAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-300 hover:bg-red-600/30 text-xs font-semibold transition cursor-pointer border border-red-500/30"
              title="Logout from Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#212121] border border-white/[0.08]">
            <p className="text-xs text-gray-400 font-medium">Total Registered Users</p>
            <p className="text-2xl font-black text-white mt-1">{stats.totalUsers}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Real users in database</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#212121] border border-white/[0.08]">
            <p className="text-xs text-gray-400 font-medium">Suspended / Banned Accounts</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{stats.bannedUsers}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Blocked from AI query access</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#212121] border border-white/[0.08]">
            <p className="text-xs text-gray-400 font-medium">Logged Search Inquiries</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{stats.totalSearches}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Tracked user prompt events</p>
          </div>
        </div>

        {/* Section 1: Search Specific User ID / History Tracking */}
        <div className="p-5 rounded-2xl bg-[#212121] border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">
              User ID Search & History Inspector (user le kk search gareko xa herna)
            </h3>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inspectUserId}
                onChange={(e) => setInspectUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInspectUser(inspectUserId)}
                placeholder="Enter User ID (e.g. USR-123456) or Username..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#171717] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>
            <button
              onClick={() => handleInspectUser(inspectUserId)}
              disabled={isHistoryLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isHistoryLoading ? 'Searching...' : 'Inspect History'}
            </button>
          </div>

          {historyError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              {historyError}
            </p>
          )}

          {/* Inspected User History Panel */}
          {inspectedUser && (
            <div className="p-4 rounded-xl bg-[#171717] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="font-bold text-white text-sm">
                    {inspectedUser.username}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-gray-400">
                    ({inspectedUser.id})
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      inspectedUser.isBanned
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {inspectedUser.isBanned ? 'BANNED' : 'ACTIVE'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBan(inspectedUser)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      inspectedUser.isBanned
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {inspectedUser.isBanned ? 'Unban Account' : 'Ban Account'}
                  </button>

                  <button
                    onClick={() => handleRemoveAccount(inspectedUser.id)}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>

              {/* History Items */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <p className="text-[11px] font-semibold text-gray-400">
                  Search & Question History ({inspectedHistory.length} events logged):
                </p>
                {inspectedHistory.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    No inquiries recorded for this user yet.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {inspectedHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#212121] border border-white/[0.04] text-xs flex items-center justify-between gap-3"
                      >
                        <span className="text-gray-200 break-words flex-1">
                          "{item.query}"
                        </span>
                        <div className="text-right text-[10px] text-gray-500 shrink-0">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Reset User Password by Username */}
        <div className="p-5 rounded-2xl bg-[#212121] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Admin Password Override (username halera admin le password naya banauna sakne)
            </h3>
          </div>

          <form onSubmit={handleResetPassword} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={resetTargetUsername}
              onChange={(e) => setResetTargetUsername(e.target.value)}
              placeholder="Target Username..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#171717] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              placeholder="Enter New Password..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#171717] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
            >
              Update Password
            </button>
          </form>

          {passwordSuccess && (
            <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              {passwordSuccess}
            </p>
          )}
          {passwordError && (
            <p className="text-xs text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              {passwordError}
            </p>
          )}
        </div>

        {/* Section 3: All Real Users Table */}
        <div className="p-5 rounded-2xl bg-[#212121] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                All Registered Users Database (No Demo Users)
              </h3>
            </div>
            <button
              onClick={loadAllUsers}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
              title="Refresh users list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter users by Username or ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#171717] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-gray-400 text-[11px]">
                  <th className="py-2 px-2">User ID</th>
                  <th className="py-2 px-2">Username</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Device / Platform</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No registered users found. Users register on login screen.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-2 font-mono text-gray-300">{u.id}</td>
                      <td className="py-2.5 px-2 font-semibold text-white">{u.username}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.isBanned
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {u.isBanned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-400 text-[11px]">
                        {u.device || 'Web Browser'}
                      </td>
                      <td className="py-2.5 px-2 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setInspectUserId(u.id);
                            handleInspectUser(u.id);
                          }}
                          className="px-2 py-1 rounded bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 text-[11px] font-medium transition cursor-pointer"
                        >
                          History
                        </button>
                        <button
                          onClick={() => handleToggleBan(u)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                            u.isBanned
                              ? 'bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50'
                              : 'bg-amber-600/30 text-amber-200 hover:bg-amber-600/50'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          onClick={() => handleRemoveAccount(u.id)}
                          className="px-2 py-1 rounded bg-rose-600/30 text-rose-200 hover:bg-rose-600/50 text-[11px] font-medium transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
