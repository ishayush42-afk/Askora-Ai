import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Globe,
  CloudSun,
  ExternalLink,
  Square,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatMessage, WeatherData } from '../types';
import { speakTextWithGemini, APP_LOGO } from '../services/api';
import { AppCard } from './AppCard';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, imageBase64?: string) => void;
  onStopGeneration?: () => void;
  isLoading: boolean;
  onOpenVoiceCall: () => void;
  onOpenWeather: () => void;
  weatherData: WeatherData | null;
  enableWebSearch: boolean;
  onToggleWebSearch: () => void;
  themeMode?: 'dark' | 'light';
  voiceGender?: 'male' | 'female';
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  onStopGeneration,
  isLoading,
  onOpenVoiceCall,
  onOpenWeather,
  weatherData,
  enableWebSearch,
  onToggleWebSearch,
  themeMode = 'dark',
  voiceGender = 'female',
}) => {
  const isLight = themeMode === 'light';
  const [inputText, setInputText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const dictationRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isLoading) return;

    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition requires Chrome, Edge, or a supported browser.');
      return;
    }

    if (isDictating) {
      dictationRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ne-NP';

    recognition.onstart = () => setIsDictating(true);
    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${speech}` : speech));
      setIsDictating(false);
    };
    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);

    dictationRef.current = recognition;
    recognition.start();
  };

  const handlePlayAudio = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingMessageId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setPlayingMessageId(msgId);
    try {
      const audio = await speakTextWithGemini(text, voiceGender);
      if (audio) {
        currentAudioRef.current = audio;
        audio.onended = () => setPlayingMessageId(null);
        audio.onerror = () => setPlayingMessageId(null);
        await audio.play();
      } else {
        setTimeout(() => setPlayingMessageId(null), Math.min(text.length * 60, 10000));
      }
    } catch {
      setPlayingMessageId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackMap((prev) => ({ ...prev, [id]: type }));
    if (type === 'up') {
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
    }
  };

  const renderContent = (content: string) => {
    // 1. Separate :::app-card blocks and ```code blocks
    const tokenRegex = /(:::app-card\s*[\s\S]*?:::|```[a-zA-Z]*\n[\s\S]*?```)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          value: content.substring(lastIndex, match.index),
        });
      }

      const rawBlock = match[0];
      if (rawBlock.startsWith(':::app-card')) {
        const jsonStr = rawBlock.replace(/:::app-card\s*/, '').replace(/:::\s*$/, '').trim();
        try {
          const cardData = JSON.parse(jsonStr);
          parts.push({
            type: 'app-card',
            value: cardData,
          });
        } catch {
          parts.push({ type: 'text', value: rawBlock });
        }
      } else {
        const codeMatch = rawBlock.match(/```([a-zA-Z]*)\n([\s\S]*?)```/);
        parts.push({
          type: 'code',
          language: codeMatch?.[1] || 'code',
          value: codeMatch?.[2] || rawBlock,
        });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.substring(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', value: content });
    }

    const formatLineWithLinks = (line: string) => {
      // 1. Markdown Links [Title](URL)
      let formatted = line.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        `<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-purple-400 hover:text-purple-300 underline decoration-purple-500/50 hover:decoration-purple-400 transition cursor-pointer">$1 <svg class="w-3 h-3 inline opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>`
      );

      // 2. Bold text **bold**
      formatted = formatted.replace(
        /\*\*(.*?)\*\*/g,
        isLight
          ? '<strong class="text-black font-bold">$1</strong>'
          : '<strong class="text-white font-semibold">$1</strong>'
      );

      return formatted;
    };

    return (
      <div className={`space-y-2 text-sm sm:text-[15px] leading-relaxed break-words ${isLight ? 'text-black' : 'text-white'}`}>
        {parts.map((p, idx) => {
          if (p.type === 'app-card') {
            return <AppCard key={idx} data={p.value} isLight={isLight} />;
          }

          if (p.type === 'code') {
            return (
              <div
                key={idx}
                className={`my-3 rounded-xl overflow-hidden border text-xs sm:text-sm font-mono shadow-md ${
                  isLight
                    ? 'bg-[#18181b] border-gray-300 text-purple-200'
                    : 'bg-[#07050d] border-white/[0.08] text-purple-100/90'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.08] text-gray-400">
                  <span className="uppercase text-[11px] font-semibold text-purple-300">
                    {p.language || 'Code'}
                  </span>
                  <button
                    onClick={() => handleCopy(`code-${idx}`, p.value)}
                    className="flex items-center gap-1 text-[11px] hover:text-white transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="p-3.5 overflow-x-auto text-purple-100/90 whitespace-pre">
                  <code>{p.value}</code>
                </pre>
              </div>
            );
          }

          const lines = (p.value as string).split('\n');
          return (
            <div key={idx} className="space-y-1.5">
              {lines.map((line, lIdx) => {
                if (!line.trim()) return <div key={lIdx} className="h-1" />;

                const formattedLine = formatLineWithLinks(line);

                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div
                      key={lIdx}
                      className="flex items-start gap-2 pl-2"
                      dangerouslySetInnerHTML={{
                        __html: `<span class="${isLight ? 'text-purple-600 font-bold' : 'text-purple-400 font-bold'}">•</span> <span>${formattedLine.substring(
                          2
                        )}</span>`,
                      }}
                    />
                  );
                }

                return (
                  <p
                    key={lIdx}
                    dangerouslySetInnerHTML={{ __html: formattedLine }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isLight ? 'bg-white text-black' : 'bg-[#212121] text-white'}`}>
      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 max-w-4xl w-full mx-auto space-y-6">
        {messages.length === 0 ? (
          /* COMPLETELY CLEAN PROFESSIONAL HOME PAGE (No clutter or demo text) */
          <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <img
                src={APP_LOGO}
                alt="Askora AI Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl mx-auto shadow-2xl border border-white/10"
              />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-black' : 'text-white'}`}>
              Askora AI
            </h1>
            <p className={`text-xs sm:text-sm max-w-sm mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Ready to answer world questions, solve photos & problems, live voice call, or check any weather.
            </p>
          </div>
        ) : (
          /* Message List */
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isPlaying = playingMessageId === msg.id;
              const isCopied = copiedId === msg.id;
              const feedback = feedbackMap[msg.id];

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 sm:gap-4 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="shrink-0 pt-1">
                      <div className="w-8 h-8 rounded-xl bg-[#2f2f2f] border border-white/[0.08] overflow-hidden shadow flex items-center justify-center">
                        <img
                          src={APP_LOGO}
                          alt="Askora"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`relative rounded-2xl px-4 py-3.5 shadow-md ${
                        isUser
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                          : isLight
                          ? 'bg-gray-100 border border-gray-200 text-black rounded-tl-none'
                          : 'bg-[#2f2f2f] border border-white/[0.08] text-white rounded-tl-none'
                      }`}
                    >
                      {/* Attached user photo if present */}
                      {msg.imageUrl && (
                        <div className="mb-3 overflow-hidden rounded-xl border border-white/20 max-w-sm">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded attachment"
                            className="w-full max-h-72 object-cover rounded-xl"
                          />
                        </div>
                      )}

                      {/* Attached Real Weather Card in chat if present */}
                      {msg.weatherAttachment && (
                        <div
                          className={`mb-3 p-3.5 rounded-xl border flex flex-col gap-2 ${
                            isLight
                              ? 'bg-white border-gray-200 text-black shadow-sm'
                              : 'bg-black/40 border-white/[0.1] text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{msg.weatherAttachment.icon}</span>
                              <div>
                                <p
                                  className={`font-bold text-sm ${
                                    isLight ? 'text-black' : 'text-white'
                                  }`}
                                >
                                  {msg.weatherAttachment.city}, {msg.weatherAttachment.country}
                                </p>
                                <p
                                  className={`text-xs ${
                                    isLight ? 'text-gray-600' : 'text-gray-300'
                                  }`}
                                >
                                  {msg.weatherAttachment.conditionNepali} • {msg.weatherAttachment.condition}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xl font-extrabold ${
                                  isLight ? 'text-black' : 'text-white'
                                }`}
                              >
                                {msg.weatherAttachment.temperature}°C
                              </span>
                              <p
                                className={`text-[10px] ${
                                  isLight ? 'text-gray-500' : 'text-gray-400'
                                }`}
                              >
                                Feels {msg.weatherAttachment.feelsLike}°C
                              </p>
                            </div>
                          </div>

                          <div
                            className={`grid grid-cols-4 gap-1.5 pt-2 border-t text-[11px] ${
                              isLight
                                ? 'border-gray-200 text-gray-700'
                                : 'border-white/10 text-gray-300'
                            }`}
                          >
                            <div>💧 {msg.weatherAttachment.humidity}%</div>
                            <div>💨 {msg.weatherAttachment.windSpeed} km/h</div>
                            <div>🌧️ {msg.weatherAttachment.precipitation} mm</div>
                            <div className="text-emerald-500 font-mono text-right font-semibold">
                              🕒 {msg.weatherAttachment.localTime || ''}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content rendering */}
                      {renderContent(msg.content)}

                      {/* Blinking streaming cursor */}
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
                      )}

                      {/* Web Search Sources / Grounding Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div
                          className={`mt-3 pt-2.5 border-t space-y-1.5 ${
                            isLight ? 'border-gray-200' : 'border-white/[0.08]'
                          }`}
                        >
                          <p
                            className={`text-[11px] font-semibold flex items-center gap-1 ${
                              isLight ? 'text-gray-600' : 'text-gray-400'
                            }`}
                          >
                            <Globe className="w-3 h-3 text-blue-500" />
                            <span>Sources & Citations:</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.slice(0, 4).map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                                  isLight
                                    ? 'bg-gray-200/80 border-gray-300 text-blue-700 hover:bg-gray-300 hover:text-black'
                                    : 'bg-black/40 border-white/10 hover:border-blue-400/50 text-blue-300 hover:text-white'
                                }`}
                              >
                                <span className="truncate max-w-[150px]">{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Footer */}
                      <div
                        className={`flex items-center justify-between gap-3 mt-2.5 pt-2 border-t text-[11px] ${
                          isLight ? 'border-gray-200 text-gray-500' : 'border-white/[0.06] text-gray-400'
                        }`}
                      >
                        <span>{msg.timestamp}</span>

                        {!isUser && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePlayAudio(msg.id, msg.content)}
                              className={`p-1 rounded-md transition ${
                                isPlaying ? 'bg-purple-600 text-white' : 'hover:text-white'
                              }`}
                              title={isPlaying ? 'Pause audio' : 'Listen to voice'}
                            >
                              {isPlaying ? (
                                <VolumeX className="w-3.5 h-3.5" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-1 rounded-md hover:text-white transition"
                              title="Copy text"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => handleFeedback(msg.id, 'up')}
                              className={`p-1 rounded-md hover:text-white transition ${
                                feedback === 'up' ? 'text-pink-400 font-bold' : ''
                              }`}
                              title="Good response"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down')}
                              className={`p-1 rounded-md hover:text-white transition ${
                                feedback === 'down' ? 'text-amber-400' : ''
                              }`}
                              title="Bad response"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && !messages.some((m) => m.isStreaming) && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-[#2f2f2f] border border-white/[0.08] overflow-hidden shadow flex items-center justify-center shrink-0">
                  <img
                    src={APP_LOGO}
                    alt="Askora"
                    className="w-full h-full object-contain animate-pulse"
                  />
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
                  <span className="text-xs text-gray-400 ml-1">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Bar */}
      <div
        className={`border-t backdrop-blur-xl p-3 sm:p-4 ${
          isLight ? 'border-gray-200 bg-white/95' : 'border-white/[0.08] bg-[#212121]/95'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Image preview badge if an image was selected */}
          {selectedImage && (
            <div
              className={`relative inline-flex items-center gap-2 p-1.5 pr-3 rounded-xl border text-xs ${
                isLight
                  ? 'bg-purple-100 border-purple-300 text-purple-900'
                  : 'bg-purple-950/60 border-purple-500/40 text-purple-200'
              }`}
            >
              <img
                src={selectedImage}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg"
              />
              <span className="font-medium">Photo attached (फोटो समाधान)</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white transition ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Filter Bar */}
          <div
            className={`flex items-center justify-between text-xs px-1 ${
              isLight ? 'text-gray-600' : 'text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleWebSearch}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                  enableWebSearch
                    ? isLight
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : isLight
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:text-black hover:bg-gray-200'
                    : 'bg-white/[0.03] border-white/[0.08] hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3 text-blue-500" />
                <span>Web Grounding: {enableWebSearch ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onOpenWeather}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                  isLight
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:text-black hover:bg-gray-200'
                    : 'bg-white/[0.03] border-white/[0.08] hover:text-white'
                }`}
              >
                <CloudSun className="w-3 h-3 text-amber-500" />
                <span>Real Weather</span>
              </button>
            </div>

            <span className="hidden sm:inline text-[11px]">
              Enter to send, Shift + Enter for new line
            </span>
          </div>

          {/* Hidden file input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 rounded-2xl p-2 sm:p-2.5 transition-all shadow-md border ${
              isLight
                ? 'bg-gray-100 border-gray-300 focus-within:border-purple-600 focus-within:bg-white text-black'
                : 'bg-[#2f2f2f] border-white/[0.1] focus-within:border-purple-500/50 text-white'
            }`}
          >
            {/* Photo upload solver button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                isLight
                  ? 'bg-white text-purple-700 hover:text-black hover:bg-gray-200 shadow-sm'
                  : 'bg-white/[0.04] text-purple-300 hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Upload photo / math problem (फोटो पठाएर समाधान गर्नुहोस्)"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Dictation mic */}
            <button
              type="button"
              onClick={toggleDictation}
              className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                isDictating
                  ? 'bg-red-500 text-white animate-pulse'
                  : isLight
                  ? 'bg-white text-gray-700 hover:text-black hover:bg-gray-200 shadow-sm'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]'
              }`}
              title={isDictating ? 'Stop listening' : 'Dictate with microphone'}
            >
              {isDictating ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isDictating
                  ? 'Listening... बोल्नुहोस्...'
                  : selectedImage
                  ? 'Ask anything about this photo (यो फोटोको बारेमा सोध्नुहोस्)...'
                  : 'Ask Askora anything in English or Nepali...'
              }
              rows={1}
              className={`flex-1 bg-transparent border-0 outline-none resize-none py-1.5 px-1 text-sm sm:text-base max-h-36 ${
                isLight ? 'text-black placeholder-gray-500' : 'text-white placeholder-gray-400'
              }`}
            />

            {/* Send or Stop button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                  isLight ? 'bg-gray-300 text-black hover:bg-gray-400' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim() && !selectedImage}
                className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-30 transition shadow-md shadow-purple-950/60 cursor-pointer shrink-0"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
