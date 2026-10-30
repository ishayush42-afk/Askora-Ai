import { WeatherData, ChatMessage, GroundingSource } from '../types';

export const APP_LOGO = '/assets/aistudio/IMG_20261030_174429_65306a20.jpg';

export async function fetchLiveWeather(city = 'Kathmandu', lat?: number, lon?: number): Promise<WeatherData> {
  const params = new URLSearchParams();
  if (lat !== undefined && lon !== undefined) {
    params.append('lat', lat.toString());
    params.append('lon', lon.toString());
  } else {
    params.append('city', city);
  }

  const res = await fetch(`/api/weather?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch weather data');
  }
  return await res.json();
}

export async function streamChatMessage({
  messages,
  enableWebSearch = false,
  image,
  userId,
  onChunk,
  onWeather,
  onSources,
  onError,
  onDone,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  enableWebSearch?: boolean;
  image?: string;
  userId?: string;
  onChunk: (chunk: string) => void;
  onWeather?: (weather: WeatherData) => void;
  onSources?: (sources: GroundingSource[]) => void;
  onError: (error: string) => void;
  onDone: () => void;
}): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, enableWebSearch, image, userId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.isBanned || errJson.error === 'ACCOUNT_BANNED' || errJson.error === 'Your account is banned') {
          onError('ACCOUNT_BANNED');
          return;
        }
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported by browser');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'text') {
              onChunk(parsed.text);
            } else if (parsed.type === 'weather' && onWeather) {
              onWeather(parsed.weather);
            } else if (parsed.type === 'sources' && onSources) {
              onSources(parsed.sources);
            } else if (parsed.type === 'error') {
              onError(parsed.error);
            }
          } catch (e) {
            // Ignore parse errors on raw tokens
          }
        }
      }

      onDone();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onDone();
        return;
      }
      onError(err.message || 'Connection error. Please try again.');
    }
  })();

  return () => controller.abort();
}

let lastTtsFailTime = 0;

// Real Male ('Puck' / 'Fenrir') & Female ('Kore' / 'Aoede') Studio Human Voice Engine
export async function speakTextWithGemini(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  voiceNameOverride?: string
): Promise<HTMLAudioElement | null> {
  const selectedGeminiVoice = voiceNameOverride || (voiceGender === 'male' ? 'Puck' : 'Kore');

  // Attempt Studio Human Voice if not currently in brief cooldown
  if (Date.now() - lastTtsFailTime > 6000) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: selectedGeminiVoice,
          gender: voiceGender,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          return audio;
        }
      } else {
        lastTtsFailTime = Date.now();
      }
    } catch {
      lastTtsFailTime = Date.now();
    }
  }

  // Graceful browser Web Speech Synthesis with dedicated Male vs Female pitch/voice selection
  if ('speechSynthesis' in window) {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const cleanSpeakText = text.replace(/[*_#`~[\]]/g, ' ').substring(0, 450);
      const utterance = new SpeechSynthesisUtterance(cleanSpeakText);

      // Pitch & Rate tuning for Male vs Female real voice feel
      if (voiceGender === 'male') {
        utterance.pitch = 0.88; // Deeper resonant male pitch
        utterance.rate = 0.98;
      } else {
        utterance.pitch = 1.15; // Natural clear female pitch
        utterance.rate = 1.02;
      }

      const voices = window.speechSynthesis.getVoices();

      // Find appropriate male or female voice matching language
      const isNepali = /[अ-ह]/.test(cleanSpeakText);

      if (isNepali) {
        const nepaliVoice = voices.find((v) => v.lang.startsWith('ne') || v.lang.startsWith('hi'));
        if (nepaliVoice) utterance.voice = nepaliVoice;
      } else {
        if (voiceGender === 'female') {
          const femaleVoice = voices.find(
            (v) =>
              (v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('victoria')) &&
              v.lang.startsWith('en')
          );
          if (femaleVoice) utterance.voice = femaleVoice;
        } else {
          const maleVoice = voices.find(
            (v) =>
              (v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('david') ||
                v.name.toLowerCase().includes('george') ||
                v.name.toLowerCase().includes('alex')) &&
              v.lang.startsWith('en')
          );
          if (maleVoice) utterance.voice = maleVoice;
        }
      }

      utterance.onend = () => resolve(null);
      utterance.onerror = () => resolve(null);
      window.speechSynthesis.speak(utterance);
      resolve(null);
    });
  }

  return null;
}
