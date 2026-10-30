import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatBox } from './components/ChatBox';
import { Sidebar, ChatSession } from './components/Sidebar';
import { VoiceCallModal } from './components/VoiceCallModal';
import { WeatherWidget } from './components/WeatherWidget';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { BanModal } from './components/BanModal';
import { ChatMessage, WeatherData, GroundingSource, UserAccount } from './types';
import { fetchLiveWeather, streamChatMessage } from './services/api';

const STORAGE_KEY_SESSIONS = 'askora_sessions_v2';
const STORAGE_KEY_MESSAGES = 'askora_messages_v2';
const STORAGE_KEY_USER = 'askora_current_user';
const STORAGE_KEY_THEME = 'askora_theme';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-default');
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({});
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [enableWebSearch, setEnableWebSearch] = useState(false);

  // Authentication & Admin State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);
  const [bannedCustomerId, setBannedCustomerId] = useState<string | null>(null);

  // Theme & Voice
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');

  // Modals & Panels
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const abortStreamRef = useRef<(() => void) | null>(null);

  // Load from local storage and fetch Kathmandu real weather
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'dark' | 'light' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
        document.documentElement.classList.toggle('theme-light', savedTheme === 'light');
      }

      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        const parsedUser: UserAccount = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        if (parsedUser.isBanned) {
          setIsBannedModalOpen(true);
        }
      }

      const savedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);

      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      } else {
        const initialSession: ChatSession = {
          id: 'session-default',
          title: 'Askora Intelligence',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setSessions([initialSession]);
      }

      if (savedMessages) {
        setAllMessages(JSON.parse(savedMessages));
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    fetchLiveWeather('Kathmandu')
      .then((data) => setWeatherData(data))
      .catch((err) => console.warn('Weather fetch warning:', err));
  }, []);

  // Save changes to storage
  useEffect(() => {
    try {
      if (sessions.length > 0) {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      }
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(allMessages));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [sessions, allMessages]);

  // Persist Current User
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.warn('User storage save error:', e);
    }
  }, [currentUser]);

  // Handle Theme Toggle
  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY_THEME, next);
      document.documentElement.classList.toggle('theme-light', next === 'light');
      return next;
    });
  };

  // Live account ban status checking (realtime 2s polling and window/focus triggers)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    const checkBanStatus = async () => {
      try {
        const res = await fetch(`/api/auth/status?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isBanned) {
            setBannedCustomerId(data.customerId || data.userId || currentUser.id);
            setIsBannedModalOpen(true);
            setIsVoiceCallOpen(false);
            setCurrentUser((prev) => (prev ? { ...prev, isBanned: true } : null));
          } else {
            setIsBannedModalOpen(false);
          }
        } else if (res.status === 404) {
          // Account was removed by admin
          handleLogout();
        }
      } catch (err) {
        // silently ignore network blips
      }
    };

    checkBanStatus();
    const interval = setInterval(checkBanStatus, 2000);

    const onFocus = () => checkBanStatus();
    const onVisibility = () => {
      if (!document.hidden) checkBanStatus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setBannedCustomerId(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    setIsBannedModalOpen(false);
    setIsAdminOpen(false);
    setIsVoiceCallOpen(false);
  };

  const currentMessages = allMessages[activeSessionId] || [];

  const handleSendMessage = async (text: string, imageBase64?: string) => {
    if ((!text.trim() && !imageBase64) || isLoading) return;

    // Check if user is currently banned
    if (currentUser?.isBanned) {
      setBannedCustomerId(currentUser.id);
      setIsBannedModalOpen(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      imageUrl: imageBase64,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...currentMessages, userMsg];
    setAllMessages((prev) => ({ ...prev, [activeSessionId]: newMessages }));

    if (currentMessages.length === 0) {
      const title = text.length > 30 ? text.substring(0, 30) + '...' : (text || 'Photo Analysis');
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title } : s))
      );
    }

    setIsLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setAllMessages((prev) => ({
      ...prev,
      [activeSessionId]: [...newMessages, initialAssistantMsg],
    }));

    let accumulatedText = '';
    let attachedWeather: WeatherData | undefined = undefined;
    let attachedSources: GroundingSource[] = [];

    const historyPayload = newMessages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    try {
      const abortFn = await streamChatMessage({
        messages: historyPayload,
        enableWebSearch,
        image: imageBase64,
        userId: currentUser?.id,
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          setAllMessages((prev) => {
            const list = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: list.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: accumulatedText, isStreaming: true }
                  : m
              ),
            };
          });
        },
        onWeather: (weather: WeatherData) => {
          attachedWeather = weather;
          setWeatherData(weather);
          setAllMessages((prev) => {
            const list = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: list.map((m) =>
                m.id === assistantMsgId ? { ...m, weatherAttachment: weather } : m
              ),
            };
          });
        },
        onSources: (sources: GroundingSource[]) => {
          attachedSources = sources;
          setAllMessages((prev) => {
            const list = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: list.map((m) =>
                m.id === assistantMsgId ? { ...m, sources } : m
              ),
            };
          });
        },
        onError: (errText: string) => {
          setIsLoading(false);
          if (errText === 'ACCOUNT_BANNED' || errText.includes('banned') || errText.includes('Banned')) {
            if (currentUser) setBannedCustomerId(currentUser.id);
            setIsBannedModalOpen(true);
            setCurrentUser((prev) => (prev ? { ...prev, isBanned: true } : null));
            return;
          }

          setAllMessages((prev) => {
            const list = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: list.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: accumulatedText || `Error: ${errText}`,
                      isStreaming: false,
                    }
                  : m
              ),
            };
          });
        },
        onDone: () => {
          setIsLoading(false);
          setAllMessages((prev) => {
            const list = prev[activeSessionId] || [];
            return {
              ...prev,
              [activeSessionId]: list.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: accumulatedText || 'Done.',
                      isStreaming: false,
                      weatherAttachment: attachedWeather,
                      sources: attachedSources.length > 0 ? attachedSources : undefined,
                    }
                  : m
              ),
            };
          });
        },
      });

      abortStreamRef.current = abortFn;
    } catch (e: any) {
      setIsLoading(false);
      setAllMessages((prev) => {
        const list = prev[activeSessionId] || [];
        return {
          ...prev,
          [activeSessionId]: list.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: 'Connection error. Please try again.',
                  isStreaming: false,
                }
              : m
          ),
        };
      });
    }
  };

  const handleStopGeneration = () => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsLoading(false);
    setAllMessages((prev) => {
      const list = prev[activeSessionId] || [];
      return {
        ...prev,
        [activeSessionId]: list.map((m) => ({ ...m, isStreaming: false })),
      };
    });
  };

  const handleVoiceCallClose = (
    callHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
    setIsVoiceCallOpen(false);

    if (callHistory.length > 0) {
      const convertedMessages: ChatMessage[] = callHistory.map((item, idx) => ({
        id: `voice-${Date.now()}-${idx}`,
        role: item.role,
        content: item.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

      setAllMessages((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), ...convertedMessages],
      }));
    }
  };

  const handleAskAboutWeather = (weather: WeatherData) => {
    setIsWeatherModalOpen(false);
    const query = `What is the current meteorological analysis and recommendation for ${weather.city} where temperature is ${weather.temperature}°C with ${weather.condition}?`;
    handleSendMessage(query);
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setAllMessages((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        handleNewSession();
      }
    }
  };

  const isLight = themeMode === 'light';

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden transition-colors ${
        isLight ? 'bg-white text-black' : 'bg-[#212121] text-white'
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenVoiceCall={() => setIsVoiceCallOpen(true)}
        onOpenWeather={() => setIsWeatherModalOpen(true)}
        weatherData={weatherData}
        themeMode={themeMode}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Header
          onOpenVoiceCall={() => setIsVoiceCallOpen(true)}
          onOpenWeather={() => setIsWeatherModalOpen(true)}
          weatherData={weatherData}
          onNewChat={handleNewSession}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          enableWebSearch={enableWebSearch}
          onToggleWebSearch={() => setEnableWebSearch((prev) => !prev)}
          voiceGender={voiceGender}
          onToggleVoiceGender={() =>
            setVoiceGender((prev) => (prev === 'female' ? 'male' : 'female'))
          }
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />

        <ChatBox
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isLoading={isLoading}
          onOpenVoiceCall={() => setIsVoiceCallOpen(true)}
          onOpenWeather={() => setIsWeatherModalOpen(true)}
          weatherData={weatherData}
          enableWebSearch={enableWebSearch}
          onToggleWebSearch={() => setEnableWebSearch((prev) => !prev)}
          themeMode={themeMode}
          voiceGender={voiceGender}
        />

        {/* Live Voice Call Modal */}
        <VoiceCallModal
          isOpen={isVoiceCallOpen}
          onClose={handleVoiceCallClose}
          weatherData={weatherData}
          voiceGender={voiceGender}
        />

        {/* Real-time Weather Radar Modal */}
        {isWeatherModalOpen && (
          <WeatherWidget
            weather={weatherData}
            onWeatherUpdate={(newW) => setWeatherData(newW)}
            onAskAboutWeather={handleAskAboutWeather}
            onClose={() => setIsWeatherModalOpen(false)}
            isModal={true}
          />
        )}

        {/* Auth Modal (Login / Register) */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onBanned={(customerId) => {
            setBannedCustomerId(customerId);
            setIsBannedModalOpen(true);
            setIsAuthOpen(false);
          }}
          onSuccess={(user) => {
            setCurrentUser(user);
            if (user.isBanned) {
              setBannedCustomerId(user.id);
              setIsBannedModalOpen(true);
            }
            if (user.role === 'admin') {
              setIsAdminOpen(true);
            }
          }}
        />

        {/* Master Admin Dashboard Modal */}
        <AdminDashboardModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onLogoutAdmin={handleLogout}
        />

        {/* Instant Ban Warning Notification with WhatsApp Support */}
        <BanModal
          isOpen={isBannedModalOpen}
          customerId={bannedCustomerId || currentUser?.id}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
