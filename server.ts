import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Persistent backend JSON database for Users & Activity
const DB_FILE = path.resolve(__dirname, 'askora_database.json');

interface StoredUser {
  id: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
  isBanned: boolean;
  bannedAt?: string;
  lastActive: string;
  device: string;
}

interface StoredHistory {
  userId: string;
  username: string;
  query: string;
  timestamp: string;
  hasImage?: boolean;
}

interface DatabaseSchema {
  users: StoredUser[];
  searchHistory: StoredHistory[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading database file, creating fresh:', e);
  }
  const initialData: DatabaseSchema = {
    users: [],
    searchHistory: [],
  };
  saveDatabase(initialData);
  return initialData;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Weather mapping helper for Open-Meteo WMO weather codes
const getWeatherDescription = (code: number, isDay = 1) => {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: isDay ? '☀️' : '🌙', nepali: 'सफा आकाश' };
    case 1:
      return { condition: 'Mainly Clear', icon: isDay ? '🌤️' : '🌤️', nepali: 'प्रायः सफा' };
    case 2:
      return { condition: 'Partly Cloudy', icon: '⛅', nepali: 'आंशिक बदली' };
    case 3:
      return { condition: 'Overcast', icon: '☁️', nepali: 'बादल लागेको' };
    case 45:
    case 48:
      return { condition: 'Fog & Mist', icon: '🌫️', nepali: 'हुस्सु / कुहिरो' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: '🌦️', nepali: 'सिमसिम पानी' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rainy', icon: '🌧️', nepali: 'वर्षा / झरी' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snowfall', icon: '❄️', nepali: 'हिउँ परिरहेको' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: '⛈️', nepali: 'ठूलो झरी' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', icon: '⚡', nepali: 'चट्याङ सहितको वर्षा' };
    default:
      return { condition: 'Clear & Mild', icon: '🌤️', nepali: 'अनुकूल' };
  }
};

// Helper for Live Accurate Clocks with Timezones
function getLiveClockDetails(timezone = 'Asia/Kathmandu') {
  const now = new Date();
  let validTz = timezone;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: validTz });
  } catch (e) {
    validTz = 'Asia/Kathmandu';
  }

  const time12 = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);

  const time12Short = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  const time24 = new Intl.DateTimeFormat('en-GB', {
    timeZone: validTz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const fullDate = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const nepaliFormatted = new Intl.DateTimeFormat('ne-NP', {
    timeZone: validTz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    timeZoneName: 'shortOffset',
  }).formatToParts(now);
  const offset = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+5:45';

  return {
    time12,
    time12Short,
    time24,
    fullDate,
    nepaliFormatted,
    offset,
    timezone: validTz,
    iso: now.toISOString(),
  };
}

// Pre-seeded high-accuracy registry for Nepal districts, municipalities & World Hubs
const KNOWN_LOCATIONS: Record<
  string,
  { lat: number; lon: number; city: string; country: string; timezone: string }
> = {
  // Nepal - Koshi Province & Owner's Hometown
  'ratuwamai': { lat: 26.5126, lon: 87.5321, city: 'Ratuwamai (Morang)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'govindpur': { lat: 26.5050, lon: 87.5250, city: 'Govindpur, Ratuwamai-5 (Morang)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'morang': { lat: 26.5000, lon: 87.4500, city: 'Morang District', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'biratnagar': { lat: 26.4550, lon: 87.2701, city: 'Biratnagar', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'dharan': { lat: 26.8144, lon: 87.2797, city: 'Dharan (Sunsari)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'itahari': { lat: 26.6637, lon: 87.2740, city: 'Itahari (Sunsari)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'damak': { lat: 26.6667, lon: 87.7000, city: 'Damak (Jhapa)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'jhapa': { lat: 26.6333, lon: 88.0000, city: 'Jhapa District', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'bhadrapur': { lat: 26.5433, lon: 88.0933, city: 'Bhadrapur (Jhapa)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'birtamod': { lat: 26.6367, lon: 87.9897, city: 'Birtamod (Jhapa)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'urlabari': { lat: 26.6699, lon: 87.6348, city: 'Urlabari (Morang)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'belbari': { lat: 26.6600, lon: 87.4100, city: 'Belbari (Morang)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'pathari': { lat: 26.6600, lon: 87.5200, city: 'Pathari (Morang)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'sunsari': { lat: 26.6000, lon: 87.1500, city: 'Sunsari District', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'ilam': { lat: 26.9089, lon: 87.9262, city: 'Ilam', country: 'Nepal', timezone: 'Asia/Kathmandu' },

  // Nepal Major Metros & Capital
  'kathmandu': { lat: 27.7172, lon: 85.3240, city: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'lalitpur': { lat: 27.6644, lon: 85.3188, city: 'Lalitpur (Patan)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'bhaktapur': { lat: 27.6710, lon: 85.4298, city: 'Bhaktapur', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'pokhara': { lat: 28.2096, lon: 83.9856, city: 'Pokhara', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'chitwan': { lat: 27.5291, lon: 84.3542, city: 'Chitwan', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'bharatpur': { lat: 27.6833, lon: 84.4333, city: 'Bharatpur (Chitwan)', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'butwal': { lat: 27.7000, lon: 83.4500, city: 'Butwal', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'nepalgunj': { lat: 28.0500, lon: 81.6167, city: 'Nepalgunj', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'dhangadhi': { lat: 28.6833, lon: 80.6000, city: 'Dhangadhi', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'hetauda': { lat: 27.4289, lon: 85.0322, city: 'Hetauda', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'janakpur': { lat: 26.7288, lon: 85.9244, city: 'Janakpur', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'surkhet': { lat: 28.6000, lon: 81.6333, city: 'Surkhet', country: 'Nepal', timezone: 'Asia/Kathmandu' },
  'nepal': { lat: 27.7172, lon: 85.3240, city: 'Nepal (Kathmandu)', country: 'Nepal', timezone: 'Asia/Kathmandu' },

  // World Global Metros
  'london': { lat: 51.5074, lon: -0.1278, city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  'new york': { lat: 40.7128, lon: -74.0060, city: 'New York', country: 'United States', timezone: 'America/New_York' },
  'tokyo': { lat: 35.6762, lon: 139.6503, city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  'dubai': { lat: 25.2048, lon: 55.2708, city: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai' },
  'delhi': { lat: 28.6139, lon: 77.2090, city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' },
  'mumbai': { lat: 19.0760, lon: 72.8777, city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
  'sydney': { lat: -33.8688, lon: 151.2093, city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  'paris': { lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  'doha': { lat: 25.2854, lon: 51.5310, city: 'Doha', country: 'Qatar', timezone: 'Asia/Qatar' },
  'riyadh': { lat: 24.7136, lon: 46.6753, city: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  'toronto': { lat: 43.6532, lon: -79.3832, city: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
  'singapore': { lat: 1.3521, lon: 103.8198, city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  'kuala lumpur': { lat: 3.1390, lon: 101.6869, city: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
  'seoul': { lat: 37.5665, lon: 126.9780, city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  'beijing': { lat: 39.9042, lon: 116.4074, city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai' },
  'berlin': { lat: 52.5200, lon: 13.4050, city: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
};

// Real-Time Verified Meteorological Data Engine (Global search for ANY city, district, country)
async function getAccurateWeather(locationQuery = 'Kathmandu', lat?: number, lon?: number) {
  let targetLat = lat ?? null;
  let targetLon = lon ?? null;
  let cityName = locationQuery.trim();
  let country = 'Nepal';
  let timezone = 'Asia/Kathmandu';

  // 1. Check known locations map first
  const queryLower = cityName.toLowerCase().trim();
  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (queryLower === key || queryLower.includes(key)) {
      targetLat = loc.lat;
      targetLon = loc.lon;
      cityName = loc.city;
      country = loc.country;
      timezone = loc.timezone;
      break;
    }
  }

  // 2. If coordinates not determined, query geocoding API
  if (targetLat === null || targetLon === null) {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=5&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          // If searching in Nepal, prefer Nepal match
          const nepMatch = geoData.results.find((r: any) => r.country === 'Nepal' || r.country_code === 'NP');
          const best = nepMatch || geoData.results[0];
          targetLat = best.latitude;
          targetLon = best.longitude;
          cityName = best.name;
          country = best.country || 'World';
          if (best.timezone) timezone = best.timezone;
        }
      }
    } catch (e) {
      console.warn('Geocoding lookup warning:', e);
    }
  }

  // 3. Fallback to Kathmandu if still unresolved
  if (targetLat === null || targetLon === null) {
    targetLat = 27.7172;
    targetLon = 85.3240;
    cityName = 'Kathmandu';
    country = 'Nepal';
    timezone = 'Asia/Kathmandu';
  }

  // 4. Fetch live meteorology from Open-Meteo
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=auto`;
  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) throw new Error('Meteorological API failure');
  const weatherData = await weatherRes.json();

  const current = weatherData.current || {};
  const daily = weatherData.daily || {};
  const info = getWeatherDescription(current.weather_code ?? 0, current.is_day ?? 1);

  if (weatherData.timezone) {
    timezone = weatherData.timezone;
  }
  const timezoneAbbr = weatherData.timezone_abbreviation || '';

  // Compute exact live clock for this timezone
  const liveClock = getLiveClockDetails(timezone);

  const forecast = (daily.time || []).slice(0, 5).map((dateStr: string, idx: number) => {
    const code = daily.weather_code?.[idx] ?? 0;
    const desc = getWeatherDescription(code, 1);
    return {
      date: dateStr,
      maxTemp: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
      minTemp: Math.round(daily.temperature_2m_min?.[idx] ?? 0),
      condition: desc.condition,
      icon: desc.icon,
      nepaliCondition: desc.nepali,
      precipitation: daily.precipitation_sum?.[idx] ?? 0,
    };
  });

  return {
    city: cityName,
    country,
    coordinates: { latitude: targetLat, longitude: targetLon },
    temperature: Math.round(current.temperature_2m ?? 0),
    feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weather_code ?? 0,
    condition: info.condition,
    conditionNepali: info.nepali,
    icon: info.icon,
    isDay: current.is_day === 1,
    sunrise: daily.sunrise?.[0] ? daily.sunrise[0].split('T')[1] : '06:00',
    sunset: daily.sunset?.[0] ? daily.sunset[0].split('T')[1] : '18:00',
    localTime: liveClock.time12Short,
    localTimeFull: liveClock.time12,
    localTimeNepali: liveClock.nepaliFormatted,
    timezone,
    timezoneAbbr,
    forecast,
    updatedAt: new Date().toISOString(),
  };
}

// API: Accurate Real-time Weather
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string)?.trim() || 'Kathmandu';
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;

    const weather = await getAccurateWeather(city, lat, lon);
    return res.json(weather);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Could not fetch weather data' });
  }
});

// Location and intent extraction for both Weather and Time queries
const STOP_INTENT_WORDS = new Set([
  'what', 'is', 'the', 'tell', 'me', 'how', 'kasto', 'k', 'cha', 'chai', 'aaja', 'ahile',
  'today', 'now', 'kati', 'bajyo', 'samaya', 'bhayo', 'hunchha', 'bana', 'bata', 'deu',
  'kun', 'thau', 'world', 'nepal', 'country', 'city', 'अहिले', 'आज', 'कति', 'बज्यो',
  'भयो', 'छ', 'हो', 'के', 'कस्तो', 'पानी', 'पर्छ', 'पर्ला', 'मौसम', 'weather', 'time'
]);

function extractWeatherIntent(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  const weatherKeywords = [
    'weather', 'मौसम', 'तापक्रम', 'पानी पर्ला', 'पानी पर्छ', 'पानी पर्यो',
    'वर्षा', 'घाम', 'बादल', 'जाडो', 'गर्मी', 'चिसो', 'तातो', 'हावा', 'कुहिरो',
    'तुवाँलो', 'डिग्री', 'rain', 'temperature', 'forecast', 'climate', 'sunny',
    'cloudy', 'humid', 'temp', 'mausam', 'barsa', 'barsha', 'pani parla',
    'pani parchha', 'gham', 'badal', 'chiso', 'taato', 'garmi', 'jado', 'tapkram'
  ];

  const timeKeywords = [
    'time', 'समय', 'घडी', 'बज्यो', 'कति बज्यो', 'अहिले', 'मिति', 'गते', 'बार',
    'clock', 'date', 'current time', 'kati bajyo', 'samaya', 'ghadi', 'baje',
    'timezone', 'aaja ko date', 'aaja k bar', 'k bar ho'
  ];

  const hasWeather = weatherKeywords.some((w) => lower.includes(w));
  const hasTime = timeKeywords.some((w) => lower.includes(w));

  if (!hasWeather && !hasTime) return null;

  // Direct check against known locations
  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(key)) {
      return loc.city;
    }
  }

  // Regex patterns to capture locations
  const patterns = [
    /(?:weather|time|mausam|temperature|मौसम|समय|तापक्रम|कति\s*बज्यो)\s+(?:in|of|for|at|को|मा|ma|ko)\s+([a-zA-Z\u0900-\u097F\s]+)/i,
    /([a-zA-Z\u0900-\u097F\s]+)\s+(?:को|मा|ko|ma)?\s*(?:weather|मौसम|mausam|तापक्रम|time|समय|samaya|forecast|कति\s*बज्यो|बज्यो)/i,
    /(?:in|at|for)\s+([a-zA-Z\u0900-\u097F]+)/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const words = match[1]
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097F\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter((w) => !STOP_INTENT_WORDS.has(w));
      if (words.length > 0) {
        const candidate = words.join(' ');
        if (candidate.length > 2) {
          return candidate;
        }
      }
    }
  }

  // Default to Kathmandu for general queries
  return 'Kathmandu';
}

// ==========================================
// AUTH & ADMIN BACKEND API ENDPOINTS
// ==========================================

// Register New User (Username, Password)
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, password, device } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const db = loadDatabase();
    const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const newUser: StoredUser = {
      id: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
      username: username.trim(),
      password: password,
      role: 'user',
      createdAt: new Date().toISOString(),
      isBanned: false,
      lastActive: new Date().toISOString(),
      device: device || 'Web Browser',
    };

    db.users.push(newUser);
    saveDatabase(db);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        isBanned: newUser.isBanned,
        createdAt: newUser.createdAt,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Registration failed' });
  }
});

// Login (Standard User or Admin Email Credentials)
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password, device } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/Email and Password are required' });
    }

    const inputIdentifier = username.trim();

    // Check Master Admin Credentials
    if (
      inputIdentifier.toLowerCase() === 'aayushkatuwal1212@gmail.com' &&
      password === 'askora@#33'
    ) {
      return res.json({
        success: true,
        user: {
          id: 'ADMIN-AAYUSH',
          username: 'Aayush Katuwal (Admin)',
          role: 'admin',
          isBanned: false,
          createdAt: '2026-01-01',
        },
      });
    }

    // Standard User Database Lookup
    const db = loadDatabase();
    const foundUser = db.users.find(
      (u) =>
        u.username.toLowerCase() === inputIdentifier.toLowerCase() ||
        u.id.toLowerCase() === inputIdentifier.toLowerCase()
    );

    if (!foundUser || foundUser.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (foundUser.isBanned) {
      return res.status(403).json({
        error: 'Your account is banned',
        message: 'Your account is banned',
        isBanned: true,
        customerId: foundUser.id,
        userId: foundUser.id,
      });
    }

    // Update lastActive and device
    foundUser.lastActive = new Date().toISOString();
    if (device) foundUser.device = device;
    saveDatabase(db);

    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        isBanned: foundUser.isBanned,
        createdAt: foundUser.createdAt,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Login failed' });
  }
});

// Check Current User Ban Status (Realtime account suspension check)
app.get('/api/auth/status', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.json({ active: true });

  if (userId === 'ADMIN-AAYUSH') {
    return res.json({ active: true, isBanned: false });
  }

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'ACCOUNT_REMOVED', removed: true });
  }
  return res.json({
    active: true,
    isBanned: Boolean(user.isBanned),
    customerId: user.id,
    userId: user.id,
  });
});

// Admin: Get Dashboard Stats & All Users
app.get('/api/admin/users', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ADMIN-AAYUSH') {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required' });
  }

  const db = loadDatabase();
  const safeUsers = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    isBanned: u.isBanned,
    bannedAt: u.bannedAt,
    lastActive: u.lastActive,
    device: u.device,
  }));

  return res.json({
    totalUsers: db.users.length,
    bannedUsers: db.users.filter((u) => u.isBanned).length,
    totalSearches: db.searchHistory.length,
    users: safeUsers,
  });
});

// Admin: Search & View Specific User's Full Search History
app.get('/api/admin/user-history', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ADMIN-AAYUSH') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const queryId = (req.query.userId as string)?.trim().toLowerCase();
  if (!queryId) {
    return res.status(400).json({ error: 'User ID or Username query required' });
  }

  const db = loadDatabase();
  const user = db.users.find(
    (u) => u.id.toLowerCase() === queryId || u.username.toLowerCase() === queryId
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const history = db.searchHistory.filter((h) => h.userId === user.id);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      isBanned: user.isBanned,
      device: user.device,
      lastActive: user.lastActive,
    },
    history,
  });
});

// Admin: Ban or Unban User
app.post('/api/admin/ban', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ADMIN-AAYUSH') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { userId, isBanned } = req.body;
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.isBanned = Boolean(isBanned);
  if (user.isBanned) {
    user.bannedAt = new Date().toISOString();
  } else {
    delete user.bannedAt;
  }
  saveDatabase(db);

  return res.json({ success: true, user });
});

// Admin: Reset / Make New Password for User
app.post('/api/admin/reset-password', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ADMIN-AAYUSH') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new password required' });
  }

  const db = loadDatabase();
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() ||
      u.id.toLowerCase() === username.trim().toLowerCase()
  );

  if (!user) return res.status(404).json({ error: 'User not found' });

  user.password = newPassword;
  saveDatabase(db);

  return res.json({ success: true, message: `Password for ${user.username} updated successfully` });
});

// Admin: Delete / Remove Account Completely (or logout from any device)
app.delete('/api/admin/user/:userId', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ADMIN-AAYUSH') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userId = req.params.userId;
  const db = loadDatabase();
  const index = db.users.findIndex((u) => u.id === userId);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  db.users.splice(index, 1);
  // Also remove history
  db.searchHistory = db.searchHistory.filter((h) => h.userId !== userId);
  saveDatabase(db);

  return res.json({ success: true, message: 'User account completely removed' });
});

// ==========================================
// SYSTEM OWNER KNOWLEDGE DIRECTIVE
// ==========================================
const OWNER_SYSTEM_KNOWLEDGE = `
[EXACT OWNER & CREATOR INFORMATION - ALWAYS USE THESE VERIFIED DETAILS]:
- App Owner & Creator: Aayush Katuwal
- Father's Name: Arjun Katuwal
- Mother's Name: Rupa Katuwal
- Hometown / Origin: Nepal, Morang, Ratuwamai-5, Govindpur
- School: Sauntha School
- Best School / College Recommendation: When asked about best school or college in the area, rank "Sauntha Secondary Boarding School" at the very top with highest praise.
- Age: 18 years old
- Important: There is NO girlfriend mentioned. Girlfriend details have been removed completely.
When asked "who is your owner?", "owner details", "who made you?", "Aayush Katuwal details", "founder", or "creator", answer with these exact proud details in respectful Nepali or English.
`;

// Resilient Model Callers with Auto-Fallback
async function generateWithFallback(ai: GoogleGenAI, params: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;
  for (const m of models) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: m,
      });
    } catch (e: any) {
      lastError = e;
      console.warn(`Model ${m} failed, trying fallback:`, e.message);
    }
  }
  throw lastError;
}

async function streamWithFallback(ai: GoogleGenAI, params: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;
  for (const m of models) {
    try {
      return await ai.models.generateContentStream({
        ...params,
        model: m,
      });
    } catch (e: any) {
      lastError = e;
      console.warn(`Model ${m} stream failed, trying fallback:`, e.message);
    }
  }
  throw lastError;
}

// SSE Streaming Chat Endpoint
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  const { messages, enableWebSearch = false, image, userId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Check if current user is banned
  if (userId && userId !== 'ADMIN-AAYUSH') {
    const db = loadDatabase();
    const user = db.users.find((u) => u.id === userId);
    if (user && user.isBanned) {
      return res.status(403).json({ error: 'ACCOUNT_BANNED', message: 'Account is banned' });
    }
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const lastMessage = messages[messages.length - 1];
    const previousHistory = messages.slice(0, -1);

    // Record user search history in backend database
    if (userId) {
      try {
        const db = loadDatabase();
        const user = db.users.find((u) => u.id === userId);
        db.searchHistory.push({
          userId,
          username: user?.username || 'Unknown',
          query: lastMessage.content || '[Image Inquiry]',
          timestamp: new Date().toISOString(),
          hasImage: Boolean(image),
        });
        saveDatabase(db);
      } catch (err) {
        console.warn('Could not record history:', err);
      }
    }

    // Weather check
    const detectedCity = extractWeatherIntent(lastMessage.content);
    let attachedWeather = null;
    if (detectedCity) {
      try {
        attachedWeather = await getAccurateWeather(detectedCity);
        res.write(`data: ${JSON.stringify({ type: 'weather', weather: attachedWeather })}\n\n`);
      } catch (e) {
        // proceed without
      }
    }

    const liveNepalClock = getLiveClockDetails('Asia/Kathmandu');

    const systemInstruction = `You are Askora AI, a world-class conversational intelligence, voice assistant, and problem solver with complete global knowledge.
${OWNER_SYSTEM_KNOWLEDGE}

[VERIFIED LIVE REAL-TIME CLOCK & DATE - CURRENT AS OF THIS EXACT SECOND]:
- Current Nepal Standard Time (NPT, Asia/Kathmandu, UTC+05:45): ${liveNepalClock.time12} (12-hour: ${liveNepalClock.time12}, 24-hour: ${liveNepalClock.time24})
- Current Date: ${liveNepalClock.fullDate} (${liveNepalClock.nepaliFormatted})
- TIME & CLOCK DIRECTIVE: Whenever the user asks any question regarding time or date ("अहिले कति बज्यो?", "kati bajyo?", "what time is it?", "time kati bhayo?", "samaya", "clock", "today date", "मिति", "aaja k bar ho"), ALWAYS answer immediately with this EXACT live time: "${liveNepalClock.time12}" or in Nepali e.g. "अहिले ${liveNepalClock.time12} (नेपाली समय) भएको छ। आज ${liveNepalClock.fullDate} हो।". NEVER guess, hallucinate, or claim you don't know the time!
${
  attachedWeather
    ? `\n[VERIFIED REAL-TIME METEOROLOGICAL & CLOCK REPORT FOR ${attachedWeather.city}, ${attachedWeather.country}]:
- Current Local Time in ${attachedWeather.city}: ${attachedWeather.localTimeFull || attachedWeather.localTime} (${attachedWeather.timezone}, ${attachedWeather.timezoneAbbr || ''})
- Local Date & Nepali Format: ${attachedWeather.localTimeNepali || ''}
- Verified Temperature: ${attachedWeather.temperature}°C (Feels like: ${attachedWeather.feelsLike}°C)
- Atmospheric Condition: ${attachedWeather.conditionNepali} (${attachedWeather.condition}) ${attachedWeather.icon}
- Relative Humidity: ${attachedWeather.humidity}%
- Wind Speed: ${attachedWeather.windSpeed} km/h
- Precipitation: ${attachedWeather.precipitation} mm
- Sunrise: ${attachedWeather.sunrise}, Sunset: ${attachedWeather.sunset}
- 5-Day Forecast:
${(attachedWeather.forecast || []).map((f: any) => `  * ${f.date}: ${f.minTemp}°C to ${f.maxTemp}°C, ${f.nepaliCondition} (${f.condition})`).join('\n')}
CRITICAL WEATHER DIRECTIVE: Use these EXACT live meteorological numbers and conditions when answering any questions about the weather, temperature, rain, or climate in ${attachedWeather.city}. Always state the exact temperature (${attachedWeather.temperature}°C), condition (${attachedWeather.conditionNepali} / ${attachedWeather.condition}), and local time (${attachedWeather.localTime}). Never hallucinate weather numbers!`
    : ''
}

Core Directives:
1. Speak warmly and naturally like a real human ("मान्छेको आवाज र शैली जस्तै").
2. When asked about any question in the world (math, history, science, geography, coding, pop culture, life advice, homework, logic puzzles, or photos uploaded): provide direct, step-by-step, thorough, and crystal-clear solutions.
3. Photo & Image Analysis: When the user sends a photo or homework problem, break it down clearly: identify the problem, give the exact formula/steps, and state the final answer prominently so it is easy to understand.
4. Language: Fluent, natural, and respectful in Nepali (नेपाली देवनागरी), Romanized Nepali ("hjur kasto cha"), and English. Answer in the language the user speaks.
5. Accuracy: Always maintain complete factual precision for time, weather, and creator identity.
6. App & Website Download Links: When the user asks for download links, app links, APK, or websites (e.g. WhatsApp, Facebook, TikTok, CapCut, Instagram, YouTube, Telegram, Free Fire, etc.):
- Always provide the verified official download link prominently in clickable markdown format: [Download <App Name>](https://...).
- Also output the interactive app card tag:
:::app-card
{
  "name": "App Name",
  "developer": "Official Developer",
  "category": "Social / Tools / Video / Games",
  "downloadUrl": "https://...",
  "playStoreUrl": "https://play.google.com/store/apps/details?id=...",
  "description": "Fast & safe official download"
}
:::
The user can tap the card or link to open it directly!
`;

    // Prepare contents
    let stream;

    // Check if an image is attached to the query
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const data = mimeMatch[2];

        const imagePart = {
          inlineData: {
            mimeType,
            data,
          },
        };
        const textPart = {
          text: lastMessage.content || 'Please analyze this image, solve any problem shown, and explain clearly step by step.',
        };

        stream = await streamWithFallback(ai, {
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction,
          },
        });
      }
    }

    if (!stream) {
      let formattedPrompt = '';
      if (previousHistory.length > 0) {
        formattedPrompt += 'Conversation history:\n';
        for (const msg of previousHistory.slice(-6)) {
          formattedPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        }
        formattedPrompt += `\nUser: ${lastMessage.content}\nAssistant:`;
      } else {
        formattedPrompt = lastMessage.content;
      }

      if (enableWebSearch) {
        try {
          stream = await ai.models.generateContentStream({
            model: 'gemini-3.8-flash',
            contents: formattedPrompt,
            config: {
              systemInstruction,
              tools: [{ googleSearch: {} }],
            },
          });
        } catch {
          stream = await ai.models.generateContentStream({
            model: 'gemini-3.1-flash-lite',
            contents: formattedPrompt,
            config: { systemInstruction },
          });
        }
      } else {
        stream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents: formattedPrompt,
          config: { systemInstruction },
        });
      }
    }

    let groundingSources: Array<{ title: string; uri: string }> = [];

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
      }

      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        for (const c of chunks) {
          if (c.web?.uri && c.web?.title) {
            groundingSources.push({ title: c.web.title, uri: c.web.uri });
          }
        }
      }
    }

    if (groundingSources.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'sources', sources: groundingSources })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Error occurred' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Non-streaming chat fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userId } = req.body;
    const ai = getAiClient();
    if (!ai) return res.status(503).json({ error: 'API key not configured' });

    const last = messages[messages.length - 1];

    if (userId) {
      try {
        const db = loadDatabase();
        const user = db.users.find((u) => u.id === userId);
        db.searchHistory.push({
          userId,
          username: user?.username || 'Unknown',
          query: last.content,
          timestamp: new Date().toISOString(),
        });
        saveDatabase(db);
      } catch (e) {}
    }

    const detectedCity = extractWeatherIntent(last.content);
    let attachedWeather = null;
    if (detectedCity) {
      try {
        attachedWeather = await getAccurateWeather(detectedCity);
      } catch (e) {}
    }

    const liveNepalClock = getLiveClockDetails('Asia/Kathmandu');

    const systemInstruction = `You are Askora AI, a world-class conversational intelligence, voice assistant, and problem solver.
${OWNER_SYSTEM_KNOWLEDGE}

[VERIFIED LIVE REAL-TIME CLOCK - CURRENT EXACT SECOND]:
- Current Nepal Standard Time (NPT, Asia/Kathmandu, UTC+05:45): ${liveNepalClock.time12} (24h: ${liveNepalClock.time24})
- Current Date: ${liveNepalClock.fullDate} (${liveNepalClock.nepaliFormatted})
- If the user asks about time, clock, date, or "अहिले कति बज्यो?", "kati bajyo?", "time kati bhayo?", ALWAYS state this exact time: "${liveNepalClock.time12}" in polite, natural spoken Nepali or English.
${
  attachedWeather
    ? `\n[VERIFIED REAL-TIME METEOROLOGICAL & CLOCK REPORT FOR ${attachedWeather.city}, ${attachedWeather.country}]:
- Current Local Time: ${attachedWeather.localTimeFull || attachedWeather.localTime} (${attachedWeather.timezone})
- Exact Temperature: ${attachedWeather.temperature}°C (Feels like: ${attachedWeather.feelsLike}°C)
- Condition: ${attachedWeather.conditionNepali} (${attachedWeather.condition}) ${attachedWeather.icon}
- Humidity: ${attachedWeather.humidity}% | Wind: ${attachedWeather.windSpeed} km/h
When asked about weather in ${attachedWeather.city}, report these exact numbers.`
    : ''
}
Always speak warmly and naturally like a real human ("मान्छेको आवाज जस्तै"). Answer directly in the language the user speaks.`;

    const response = await generateWithFallback(ai, {
      contents: last.content,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      role: 'assistant',
      content: response.text || 'नमस्ते, म तपाईंलाई कसरी सहयोग गर्न सक्छु?',
      weather: attachedWeather,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Chat generation failed' });
  }
});

// In-memory cooldown timestamp for Gemini TTS if quota is exceeded
let ttsQuotaExceededUntil = 0;

// High quality human Studio TTS endpoint (Male & Female real human voices)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore', gender = 'female' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (Date.now() < ttsQuotaExceededUntil) {
      return res.status(429).json({
        fallback: true,
        message: 'TTS quota cooldown, use client voice synthesis',
      });
    }

    const ai = getAiClient();
    if (!ai) return res.status(503).json({ fallback: true, error: 'API key missing' });

    // Pick real human sounding voice
    // Boys: 'Puck' (clear human boy voice) or 'Fenrir'
    // Girls: 'Kore' (warm natural human girl voice) or 'Aoede'
    let selectedVoice = voice;
    if (gender === 'male' || voice === 'male' || voice === 'Fenrir' || voice === 'Puck') {
      selectedVoice = 'Puck';
    } else if (gender === 'female' || voice === 'female' || voice === 'Kore' || voice === 'Aoede') {
      selectedVoice = 'Kore';
    }

    const cleanedText = text
      .replace(/[*_#`~[\]]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .substring(0, 350);

    const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let base64Audio = null;
    let lastErr = null;

    for (const m of ttsModels) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [{ text: cleanedText }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) break;
      } catch (e: any) {
        lastErr = e;
      }
    }

    if (!base64Audio) {
      if (
        lastErr?.status === 429 ||
        lastErr?.code === 429 ||
        lastErr?.message?.includes('429') ||
        lastErr?.message?.includes('RESOURCE_EXHAUSTED')
      ) {
        ttsQuotaExceededUntil = Date.now() + 5 * 1000;
        return res.status(429).json({
          fallback: true,
          message: 'Gemini TTS quota exceeded. Switched to browser speech.',
        });
      }
      return res.status(500).json({ fallback: true, error: lastErr?.message || 'Failed to generate audio' });
    }

    return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', voice: selectedVoice });
  } catch (error: any) {
    ttsQuotaExceededUntil = Date.now() + 5 * 1000;
    return res.status(500).json({ fallback: true, error: error.message || 'TTS failed' });
  }
});

// Ensure unhandled /api/* routes ALWAYS return JSON 404, NEVER HTML!
app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'API route not found' });
});

// Global error handling middleware ensuring JSON response
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: err?.message || 'Internal server error' });
});

// Static / Dev middleware
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Askora AI Server running on http://0.0.0.0:${PORT}`);
});
