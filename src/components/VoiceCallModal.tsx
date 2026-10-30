import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Radio,
  Volume2,
  Video,
  VideoOff,
  RefreshCw,
  Camera,
  Sparkles,
} from 'lucide-react';
import { speakTextWithGemini, APP_LOGO } from '../services/api';
import { WeatherData } from '../types';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: (callHistory: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  weatherData: WeatherData | null;
  voiceGender?: 'male' | 'female';
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  weatherData,
  voiceGender = 'female',
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('Listening... Speak freely');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [currentGender, setCurrentGender] = useState<'male' | 'female'>(voiceGender);
  const [conversation, setConversation] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const isCallActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const timerRef = useRef<any>(null);
  const transcriptTimeoutRef = useRef<any>(null);

  useEffect(() => {
    setCurrentGender(voiceGender);
  }, [voiceGender]);

  useEffect(() => {
    if (isOpen) {
      isCallActiveRef.current = true;
      isAiSpeakingRef.current = false;
      setCallDuration(0);
      setConversation([]);
      setIsVideoOn(false);
      setCameraError(null);
      setStatusText('Connecting with Askora Voice & Video...');

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const welcomeGreeting =
        'नमस्ते! म अस्कोरा एआई हुँ। म तपाईंसँग मान्छे जस्तै कुरा गर्न तयार छु। के सोध्न चाहनुहुन्छ?';

      const welcomeTimer = setTimeout(() => {
        setConversation([{ role: 'assistant', content: welcomeGreeting }]);
        playAiVoice(welcomeGreeting);
      }, 400);

      initSpeechRecognition();

      return () => {
        clearTimeout(welcomeTimer);
        cleanupCall();
      };
    }
  }, [isOpen]);

  const cleanupCall = () => {
    isCallActiveRef.current = false;
    isAiSpeakingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopCamera();
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      videoStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Camera unavailable or permission denied.');
      setIsVideoOn(false);
    }
  };

  const stopCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsVideoOn(false);
  };

  const toggleVideo = () => {
    if (isVideoOn) {
      stopCamera();
    } else {
      startCamera(facingMode);
    }
  };

  const flipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isVideoOn) {
      startCamera(nextMode);
    }
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText('Speech recognition requires Chrome, Edge, or supported browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ne-NP';

    recognition.onresult = (event: any) => {
      if (!isCallActiveRef.current || isAiSpeakingRef.current) return;

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      const currentSpeech = (final || interim).trim();
      if (currentSpeech) {
        setIsUserSpeaking(true);
        setLiveTranscript(currentSpeech);
        setStatusText('Listening to you...');

        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
        }

        transcriptTimeoutRef.current = setTimeout(() => {
          if (currentSpeech && isCallActiveRef.current && !isAiSpeakingRef.current) {
            handleUserSpoke(currentSpeech);
          }
        }, 1100);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && isCallActiveRef.current) {
        setStatusText('Listening... बोल्नुहोस्');
      }
    };

    recognition.onend = () => {
      if (isCallActiveRef.current && !isMuted && !isAiSpeakingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {}
  };

  const handleUserSpoke = async (spokenText: string) => {
    if (!spokenText.trim() || !isCallActiveRef.current) return;

    setIsUserSpeaking(false);
    setLiveTranscript('');
    setStatusText('Askora is thinking...');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const updatedHistory = [...conversation, { role: 'user' as const, content: spokenText }];
    setConversation(updatedHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory }),
      });
      const data = await res.json();
      const reply = data.content || 'हजुर, म सुन्दै छु।';

      if (!isCallActiveRef.current) return;

      setConversation((prev) => [...prev, { role: 'assistant', content: reply }]);
      await playAiVoice(reply);
    } catch (err) {
      setStatusText('Please speak again...');
      restartListening();
    }
  };

  const playAiVoice = async (text: string) => {
    if (!isCallActiveRef.current) return;

    isAiSpeakingRef.current = true;
    setIsAiSpeaking(true);
    setStatusText('Askora is speaking...');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const onAudioEnded = () => {
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
      setTimeout(() => {
        restartListening();
      }, 300);
    };

    try {
      // Use chosen gender ('male' for Puck boy voice, 'female' for Kore girl voice)
      const audio = await speakTextWithGemini(text, currentGender);
      if (audio) {
        currentAudioRef.current = audio;
        audio.onended = onAudioEnded;
        audio.onerror = onAudioEnded;
        await audio.play();
      } else {
        const speakTime = Math.min(Math.max(text.length * 65, 2000), 10000);
        setTimeout(onAudioEnded, speakTime);
      }
    } catch {
      onAudioEnded();
    }
  };

  const restartListening = () => {
    if (!isCallActiveRef.current || isMuted || isAiSpeakingRef.current) return;
    setStatusText('Listening... तपाईं बोल्न सक्नुहुन्छ');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setStatusText('Microphone Muted');
    } else {
      restartListening();
    }
  };

  const handleEndCall = () => {
    cleanupCall();
    onClose(conversation);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#171717] border border-white/10 p-5 sm:p-7 flex flex-col items-center shadow-2xl">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between z-10 mb-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{isVideoOn ? 'VIDEO CALL LIVE' : 'VOICE CALL LIVE'}</span>
          </div>

          <div className="px-3 py-1 rounded-full bg-white/[0.06] text-xs font-mono text-gray-300">
            {formatTime(callDuration)}
          </div>

          {/* Real Human Voice Gender Switcher */}
          <div className="flex items-center bg-[#212121] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setCurrentGender('female')}
              className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                currentGender === 'female'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Real Female Studio Voice (केटीको आवाज)"
            >
              👩 केटी (Girl)
            </button>
            <button
              onClick={() => setCurrentGender('male')}
              className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                currentGender === 'male'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Real Male Studio Voice (केटाको आवाज)"
            >
              👨 केटा (Boy)
            </button>
          </div>
        </div>

        {/* Central Display: LIVE VIDEO FEED or AI PULSING ORB */}
        {isVideoOn ? (
          <div className="relative w-full my-3 flex flex-col items-center">
            <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl">
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                }`}
              />

              {/* Live indicator badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>YOU (LIVE CAMERA)</span>
              </div>

              {/* Flip camera button */}
              <button
                onClick={flipCamera}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white transition cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Floating Askora Presence Avatar on corner */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
                <div
                  className={`w-9 h-9 rounded-xl overflow-hidden p-1 transition-all ${
                    isAiSpeaking
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,163,127,0.8)] scale-110'
                      : 'bg-[#212121]'
                  }`}
                >
                  <img src={APP_LOGO} alt="Askora" className="w-full h-full object-contain" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white">Askora AI</p>
                  <p className="text-[9px] text-emerald-400">
                    {isAiSpeaking ? 'Speaking...' : 'Listening...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Voice Only: Central Animated Orb */
          <div className="relative my-6 flex items-center justify-center">
            {isAiSpeaking && (
              <>
                <div className="absolute w-52 h-52 rounded-full border border-emerald-500/40 animate-ping" />
                <div className="absolute w-60 h-60 rounded-full border border-teal-500/20 animate-pulse" />
              </>
            )}

            {isUserSpeaking && (
              <div className="absolute w-52 h-52 rounded-full border border-blue-400/50 animate-ping" />
            )}

            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-300 p-3 ${
                isAiSpeaking
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-[0_0_50px_rgba(16,163,127,0.7)] scale-105'
                  : isUserSpeaking
                  ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-[0_0_50px_rgba(59,130,246,0.6)] scale-105'
                  : 'bg-[#212121] border border-white/10'
              }`}
            >
              <img
                src={APP_LOGO}
                alt="Askora AI"
                className="w-24 h-24 object-contain rounded-2xl drop-shadow-xl"
              />
            </div>
          </div>
        )}

        {cameraError && (
          <p className="text-xs text-amber-400 mt-1 font-medium">{cameraError}</p>
        )}

        {/* Live Call Status text */}
        <p
          className={`text-sm font-medium tracking-wide my-2 transition-colors ${
            isAiSpeaking
              ? 'text-emerald-300 font-semibold'
              : isUserSpeaking
              ? 'text-blue-300 font-semibold'
              : 'text-gray-400'
          }`}
        >
          {statusText}
        </p>

        {/* Subtitle / Transcript */}
        <div className="w-full min-h-[60px] max-h-24 overflow-y-auto px-4 py-2.5 rounded-2xl bg-[#212121] border border-white/[0.06] my-2 text-xs sm:text-sm text-center flex items-center justify-center">
          {liveTranscript ? (
            <p className="text-emerald-300 font-medium italic">"{liveTranscript}"</p>
          ) : conversation.length > 0 ? (
            <p className="text-gray-300 line-clamp-2">
              {conversation[conversation.length - 1].content}
            </p>
          ) : (
            <p className="text-gray-400 italic">
              Speak naturally in Nepali or English. High quality Human Boy & Girl voices supported.
            </p>
          )}
        </div>

        {/* Bottom Actions Bar: Mic + Video Camera + Prominent END CALL Button */}
        <div className="w-full flex items-center justify-center gap-4 sm:gap-5 mt-3 pt-4 border-t border-white/[0.08]">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-full transition cursor-pointer ${
              isMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/[0.08] text-gray-200 hover:bg-white/[0.14]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-full transition cursor-pointer flex items-center gap-2 ${
              isVideoOn
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                : 'bg-white/[0.08] text-gray-200 hover:bg-white/[0.14]'
            }`}
            title={isVideoOn ? 'Turn off video camera' : 'Turn on video camera'}
          >
            {isVideoOn ? <Video className="w-5 h-5 text-emerald-400" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Prominent END CALL Button */}
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide shadow-lg shadow-red-700/40 active:scale-95 transition cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span>END CALL (कल बन्द)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
