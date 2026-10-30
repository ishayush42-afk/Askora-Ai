import React, { useState } from 'react';
import { AlertOctagon, Copy, Check, LogOut } from 'lucide-react';

interface BanModalProps {
  isOpen: boolean;
  customerId?: string;
  onLogout: () => void;
}

export const BanModal: React.FC<BanModalProps> = ({ isOpen, customerId, onLogout }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (customerId) {
      navigator.clipboard.writeText(customerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-3xl bg-[#171717] border border-red-500/30 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        {/* Warning Icon Shield */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-inner">
          <AlertOctagon className="w-8 h-8" />
        </div>

        {/* Ban Title & Notice */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Your Account is Banned
          </h2>
          <p className="text-xs text-red-400 font-medium">
            तपाईंको खाता प्रशासनद्वारा निलम्बन (Banned) गरिएको छ।
          </p>
        </div>

        {/* Customer ID Display Card */}
        {customerId && (
          <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 text-left space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
              Customer ID (ग्राहक आईडी):
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold text-red-300 tracking-wider select-all">
                {customerId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-gray-300 transition cursor-pointer"
                title="Copy Customer ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Explanation text */}
        <div className="p-4 rounded-2xl bg-[#212121] border border-white/[0.06] text-xs text-gray-300 space-y-2 text-left">
          <p className="font-semibold text-white">खाता पुन: सक्रिय (Unban) गराउन:</p>
          <p className="text-gray-400 text-[12px] leading-relaxed">
            तपाईंको खाता अनब्यान गराउन तलको WhatsApp Customer Support बटनमा क्लिक गरेर आफ्नो Customer ID पठाउनुहोस्।
          </p>
        </div>

        {/* Official WhatsApp Customer Support Button (Strictly NO raw link text rendered, only WhatsApp SVG logo) */}
        <div className="pt-1 space-y-2.5">
          <a
            href="https://whatsapp.com/channel/0029VbE1ZmEHFxPA8KbrXb1k"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            {/* Official WhatsApp SVG Logo */}
            <svg
              className="w-5 h-5 fill-current shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.031 2C6.495 2 2 6.495 2 12.031a9.98 9.98 0 0 0 1.558 5.344L2 22l4.809-1.528A9.985 9.985 0 0 0 12.031 22c5.536 0 10.031-4.495 10.031-10.031C22.062 6.495 17.567 2 12.031 2zm0 18.25a8.19 8.19 0 0 1-4.223-1.168l-.304-.18-2.85.906.924-2.777-.197-.315a8.204 8.204 0 0 1-1.28-4.485c0-4.544 3.696-8.24 8.24-8.24 4.544 0 8.24 3.696 8.24 8.24 0 4.544-3.696 8.24-8.24 8.24zm4.516-6.173c-.248-.124-1.464-.722-1.691-.805-.227-.083-.393-.124-.558.124-.165.248-.64 1.24-.784 1.405-.144.165-.29.186-.537.062-.248-.124-1.045-.385-1.99-1.228-.737-.657-1.235-1.469-1.38-1.717-.144-.248-.015-.382.109-.505.112-.111.248-.29.372-.434.124-.145.165-.248.248-.414.083-.165.041-.31-.02-.434-.063-.124-.558-1.343-.765-1.84-.2-.483-.404-.418-.558-.426l-.475-.008c-.165 0-.434.062-.661.31-.227.248-.868.848-.868 2.068 0 1.22 0 2.44 1.178 3.518.145.144 2.128 3.25 5.155 4.558.72.311 1.282.497 1.721.637.724.23 1.383.197 1.903.12.58-.087 1.777-.727 2.025-1.43.248-.703.248-1.306.174-1.43-.075-.124-.27-.197-.518-.321z" />
            </svg>
            <span>WhatsApp Customer Support मा सम्पर्क गर्नुहोस्</span>
          </a>

          {/* Log out / Switch User */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>खाताबाट बाहिर निस्कनुहोस् (Log Out)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
