import React from 'react';
import {
  MessageSquare,
  Plus,
  Headphones,
  CloudSun,
  Trash2,
  X,
  Sidebar as SidebarIcon,
} from 'lucide-react';
import { WeatherData, UserAccount } from '../types';
import { APP_LOGO } from '../services/api';
import { User, LogOut } from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenVoiceCall: () => void;
  onOpenWeather: () => void;
  weatherData: WeatherData | null;
  themeMode?: 'dark' | 'light';
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenVoiceCall,
  onOpenWeather,
  weatherData,
  themeMode = 'dark',
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const isLight = themeMode === 'light';
  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 md:hidden animate-in fade-in"
        />
      )}

      {/* ChatGPT style sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r flex flex-col transition-transform duration-300 ease-in-out ${
          isLight
            ? 'bg-gray-50 border-gray-200 text-gray-900'
            : 'bg-[#171717] border-white/[0.08] text-gray-200'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top: Logo + New Chat */}
        <div
          className={`p-3 border-b space-y-2 ${
            isLight ? 'border-gray-200' : 'border-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <img
                src={APP_LOGO}
                alt="Askora AI"
                className="w-6 h-6 rounded-md object-contain"
              />
              <span
                className={`font-semibold text-sm ${
                  isLight ? 'text-gray-900' : 'text-gray-200'
                }`}
              >
                Askora AI
              </span>
            </div>

            <button
              onClick={onClose}
              className={`md:hidden p-1 rounded-lg ${
                isLight ? 'text-gray-500 hover:text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-between border transition cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300 shadow-sm'
                : 'bg-[#212121] hover:bg-[#2b2b2b] text-gray-200 hover:text-white border-white/[0.08]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-400" />
              <span>New chat</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">⌘K</span>
          </button>
        </div>

        {/* Feature quick links */}
        <div
          className={`p-2 border-b space-y-0.5 text-xs ${
            isLight ? 'border-gray-200' : 'border-white/[0.06]'
          }`}
        >
          <button
            onClick={() => {
              onOpenVoiceCall();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition cursor-pointer ${
              isLight
                ? 'hover:bg-gray-200/70 text-gray-700 hover:text-black'
                : 'hover:bg-[#212121] text-gray-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-emerald-500" />
              <span>Voice Assistant</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-medium">
              Live
            </span>
          </button>

          <button
            onClick={() => {
              onOpenWeather();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition cursor-pointer ${
              isLight
                ? 'hover:bg-gray-200/70 text-gray-700 hover:text-black'
                : 'hover:bg-[#212121] text-gray-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CloudSun className="w-4 h-4 text-amber-500" />
              <span>Weather Radar</span>
            </div>
            <span className="text-[10px] text-gray-400">
              {weatherData ? `${weatherData.city} ${weatherData.temperature}°` : 'View'}
            </span>
          </button>
        </div>

        {/* Recent Chat History */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p
            className={`text-[11px] font-medium px-2 py-1 ${
              isLight ? 'text-gray-500' : 'text-gray-500'
            }`}
          >
            Recent chats
          </p>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              <MessageSquare className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
              <p>No chats yet</p>
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  className={`group flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'bg-gray-200 text-black font-semibold'
                        : 'bg-[#212121] text-white font-medium'
                      : isLight
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-black'
                      : 'text-gray-400 hover:bg-[#212121]/70 hover:text-gray-200'
                  }`}
                  onClick={() => {
                    onSelectSession(sess.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    <span className="truncate">{sess.title}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: User account + Pro */}
        <div
          className={`p-3 border-t text-xs flex flex-col gap-2 ${
            isLight
              ? 'border-gray-200 bg-white text-gray-700'
              : 'border-white/[0.08] bg-[#141414] text-gray-400'
          }`}
        >
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.username[0]?.toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <div
                    className={`font-semibold text-xs truncate ${
                      isLight ? 'text-gray-900' : 'text-gray-200'
                    }`}
                  >
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {currentUser.role === 'admin' ? 'Master Admin' : currentUser.id}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className={`p-1.5 rounded-lg transition hover:text-rose-400 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isLight
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Log In / Sign Up</span>
              </button>
            )
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-200/40 dark:border-white/[0.05]">
            <span>Askora AI v3.8</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
              Verified Real
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
