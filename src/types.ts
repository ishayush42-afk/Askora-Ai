export interface WeatherForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  nepaliCondition: string;
  icon: string;
  precipitation: number;
}

export interface WeatherData {
  city: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  condition: string;
  conditionNepali: string;
  icon: string;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  localTime?: string;
  localTimeFull?: string;
  localTimeNepali?: string;
  timezone?: string;
  timezoneAbbr?: string;
  forecast: WeatherForecastDay[];
  updatedAt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageUrl?: string;
  weatherAttachment?: WeatherData;
  sources?: GroundingSource[];
  isStreaming?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  isBanned: boolean;
  lastActive?: string;
  device?: string;
}

export interface UserHistoryItem {
  query: string;
  timestamp: string;
  hasImage?: boolean;
}
