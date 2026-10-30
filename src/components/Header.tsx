import React, { useState } from 'react';
import {
  CloudSun,
  Globe,
  Plus,
  Menu,
  Maximize2,
  Minimize2,
  Headphones,
  User,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';
import { WeatherData, UserAccount } from '../types';
import { APP_LOGO } from '../services/api';

interface HeaderProps {
  onOpenVoiceCall: () => void;
  onOpenWeather: () => void;
  weatherData: WeatherData | null;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  enableWebSearch: boolean;
  onToggleWebSearch: () => void;
  voiceGender: 'male' | 'female';
  onToggleVoiceGender: () => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVoiceCall,
  onOpenWeather,
  weatherData,
  onNewChat,
  onToggleSidebar,
  enableWebSearch,
  onToggleWebSearch,
  voiceGender,
  onToggleVoiceGender,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  themeMode,
  onToggleTheme,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isLight = themeMode === 'light';

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b px-3 sm:px-5 py-2.5 transition-colors ${
        isLight
          ? 'bg-white/95 border-gray-200 text-gray-900'
          : 'bg-[#212121]/95 border-white/[0.08] text-white'
      } backdrop-blur-md`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Hamburger + ChatGPT Model Badge with Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg transition cursor-pointer md:hidden ${
              isLight
                ? 'text-gray-600 hover:text-black hover:bg-gray-100'
                : 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]'
            }`}
            title="Chat history"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer group ${
              isLight ? 'hover:bg-gray-100' : 'hover:bg-[#2f2f2f]'
            }`}
            onClick={onNewChat}
          >
            <img
              src={APP_LOGO}
              alt="Askora AI"
              className="w-7 h-7 object-contain rounded-lg shadow-sm"
            />
            <div className="flex items-center gap-1.5">
              <span
                className={`font-semibold text-sm sm:text-base ${
                  isLight ? 'text-gray-900' : 'text-gray-100'
                }`}
              >
                Askora AI
              </span>
              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-0.5">
                <span>3.8</span>
                <span className="text-emerald-500 text-[10px]">●</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Light/Dark Theme Switcher (Theme dark ma font white, theme white ma text black) */}
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                : 'bg-[#2f2f2f] text-gray-200 border-white/[0.08] hover:bg-[#383838]'
            }`}
            title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-gray-800" /> : <Sun className="w-3.5 h-3.5 text-amber-300" />}
          </button>

          {/* Voice Gender Switcher (केटा / केटीको स्वर) */}
          <button
            onClick={onToggleVoiceGender}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                : 'bg-[#2f2f2f] text-gray-200 border-white/[0.08] hover:bg-[#383838]'
            }`}
            title="Toggle Voice (केटा / केटीको आवाज)"
          >
            <span className="text-xs">{voiceGender === 'female' ? '👩' : '👨'}</span>
            <span className="hidden sm:inline font-medium">
              {voiceGender === 'female' ? 'Female' : 'Male'}
            </span>
          </button>

          {/* Weather Pill */}
          <button
            onClick={onOpenWeather}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                : 'bg-[#2f2f2f] text-gray-200 border-white/[0.08] hover:bg-[#383838]'
            }`}
            title="Accurate Real Weather"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium hidden md:inline">
              {weatherData ? `${weatherData.city} ${weatherData.temperature}°C` : 'Weather'}
            </span>
          </button>

          {/* Web Search */}
          <button
            onClick={onToggleWebSearch}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              enableWebSearch
                ? 'bg-blue-600/20 text-blue-500 border-blue-500/40'
                : isLight
                ? 'bg-gray-100 text-gray-600 border-gray-300 hover:text-black'
                : 'bg-[#2f2f2f] text-gray-400 border-white/[0.08] hover:text-gray-200'
            }`}
            title="Google Web Grounding"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Search</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer hidden sm:flex ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                : 'bg-[#2f2f2f] text-gray-300 border-white/[0.08] hover:bg-[#383838]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* New Chat */}
          <button
            onClick={onNewChat}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                : 'bg-[#2f2f2f] text-gray-300 border-white/[0.08] hover:bg-[#383838]'
            }`}
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* User Account / Admin Badge */}
          {currentUser ? (
            currentUser.role === 'admin' ? (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 text-white font-semibold text-xs tracking-tight shadow hover:bg-purple-500 transition cursor-pointer"
                title="Open Admin Dashboard"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            ) : (
              <div
                onClick={onOpenAuth}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isLight
                    ? 'bg-gray-100 text-gray-900 border-gray-300'
                    : 'bg-[#2f2f2f] text-white border-white/10'
                }`}
                title={`Logged in as ${currentUser.username} (${currentUser.id})`}
              >
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate max-w-[75px]">{currentUser.username}</span>
              </div>
            )
          ) : (
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                isLight
                  ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                  : 'bg-white text-gray-900 border-white hover:bg-gray-100'
              }`}
              title="Log in or Register"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Voice Call Mode Button */}
          <button
            onClick={onOpenVoiceCall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-tight shadow-md transition cursor-pointer"
            title="Start Voice Assistant Mode"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voice Call</span>
          </button>
        </div>
      </div>
    </header>
  );
};
