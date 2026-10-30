import React from 'react';
import { Download, ExternalLink, Smartphone, Check } from 'lucide-react';

export interface AppCardData {
  name: string;
  developer?: string;
  category?: string;
  logo?: string;
  downloadUrl?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  description?: string;
}

// Built-in verified SVG logos for popular requested apps
export const getAppLogo = (appName: string, customLogo?: string): { type: 'svg' | 'img'; content: any } => {
  if (customLogo && customLogo.startsWith('http')) {
    return { type: 'img', content: customLogo };
  }

  const lower = appName.toLowerCase();

  // WhatsApp
  if (lower.includes('whatsapp')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 2C6.495 2 2 6.495 2 12.031a9.98 9.98 0 0 0 1.558 5.344L2 22l4.809-1.528A9.985 9.985 0 0 0 12.031 22c5.536 0 10.031-4.495 10.031-10.031C22.062 6.495 17.567 2 12.031 2zm0 18.25a8.19 8.19 0 0 1-4.223-1.168l-.304-.18-2.85.906.924-2.777-.197-.315a8.204 8.204 0 0 1-1.28-4.485c0-4.544 3.696-8.24 8.24-8.24 4.544 0 8.24 3.696 8.24 8.24 0 4.544-3.696 8.24-8.24 8.24zm4.516-6.173c-.248-.124-1.464-.722-1.691-.805-.227-.083-.393-.124-.558.124-.165.248-.64 1.24-.784 1.405-.144.165-.29.186-.537.062-.248-.124-1.045-.385-1.99-1.228-.737-.657-1.235-1.469-1.38-1.717-.144-.248-.015-.382.109-.505.112-.111.248-.29.372-.434.124-.145.165-.248.248-.414.083-.165.041-.31-.02-.434-.063-.124-.558-1.343-.765-1.84-.2-.483-.404-.418-.558-.426l-.475-.008c-.165 0-.434.062-.661.31-.227.248-.868.848-.868 2.068 0 1.22 0 2.44 1.178 3.518.145.144 2.128 3.25 5.155 4.558.72.311 1.282.497 1.721.637.724.23 1.383.197 1.903.12.58-.087 1.777-.727 2.025-1.43.248-.703.248-1.306.174-1.43-.075-.124-.27-.197-.518-.321z" />
          </svg>
        </div>
      ),
    };
  }

  // Facebook
  if (lower.includes('facebook') || lower.includes('fb')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>
      ),
    };
  }

  // TikTok
  if (lower.includes('tiktok')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white shadow-lg shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        </div>
      ),
    };
  }

  // Instagram
  if (lower.includes('instagram') || lower.includes('insta')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-pink-500/20 shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </div>
      ),
    };
  }

  // YouTube
  if (lower.includes('youtube') || lower.includes('yt')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-[#FF0000] flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
      ),
    };
  }

  // Telegram
  if (lower.includes('telegram')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-[#229ED9] flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
          </svg>
        </div>
      ),
    };
  }

  // CapCut
  if (lower.includes('capcut')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 flex items-center justify-center text-white shadow-lg shrink-0">
          <div className="w-7 h-7 border-2 border-white rounded-lg flex items-center justify-center font-black text-xs tracking-tighter">
            CC
          </div>
        </div>
      ),
    };
  }

  // Free Fire or PUBG / Gaming
  if (lower.includes('free fire') || lower.includes('pubg') || lower.includes('game')) {
    return {
      type: 'svg',
      content: (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
          <span className="text-xl">🔥</span>
        </div>
      ),
    };
  }

  // Default app icon
  return {
    type: 'svg',
    content: (
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
        <Smartphone className="w-6 h-6" />
      </div>
    ),
  };
};

export const AppCard: React.FC<{ data: AppCardData; isLight?: boolean }> = ({ data, isLight = false }) => {
  const logoObj = getAppLogo(data.name, data.logo);

  const directUrl =
    data.downloadUrl ||
    data.playStoreUrl ||
    data.appStoreUrl ||
    `https://play.google.com/store/search?q=${encodeURIComponent(data.name)}&c=apps`;

  return (
    <div
      className={`my-3 p-4 rounded-2xl border transition-all shadow-md max-w-md w-full ${
        isLight
          ? 'bg-white border-gray-200 text-gray-900 shadow-gray-200/50'
          : 'bg-[#1e1e1e] border-white/10 text-white shadow-black/40'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {logoObj.type === 'img' ? (
          <img
            src={logoObj.content}
            alt={data.name}
            className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-sm shrink-0"
          />
        ) : (
          logoObj.content
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold truncate tracking-tight">{data.name}</h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified
            </span>
          </div>

          {data.developer && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{data.developer}</p>
          )}

          {data.category && (
            <p className="text-[11px] text-purple-400 font-medium mt-0.5">{data.category}</p>
          )}
        </div>
      </div>

      {data.description && (
        <p className="text-xs text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">
          {data.description}
        </p>
      )}

      {/* Action Buttons: Direct Download + Play Store */}
      <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-white/[0.08]">
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download (डाउनलोड गर्नुहोस्)</span>
          <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
        </a>

        {data.playStoreUrl && (
          <a
            href={data.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
          >
            <span>Play Store</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        )}
      </div>
    </div>
  );
};
