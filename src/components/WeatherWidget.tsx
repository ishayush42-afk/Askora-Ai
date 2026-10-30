import React, { useState } from 'react';
import {
  CloudSun,
  Search,
  Wind,
  Droplets,
  Sunrise,
  Sunset,
  Calendar,
  Sparkles,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import { WeatherData } from '../types';
import { fetchLiveWeather } from '../services/api';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  onWeatherUpdate: (newWeather: WeatherData) => void;
  onAskAboutWeather: (weather: WeatherData) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const CITIES = [
  'Morang',
  'Ratuwamai',
  'Biratnagar',
  'Kathmandu',
  'Pokhara',
  'Dharan',
  'Damak',
  'Chitwan',
  'London',
  'Tokyo',
  'New York',
  'Dubai',
];

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  onWeatherUpdate,
  onAskAboutWeather,
  onClose,
  isModal = false,
}) => {
  const [searchCity, setSearchCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async (cityToFetch?: string) => {
    const target = cityToFetch || searchCity;
    if (!target.trim()) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchLiveWeather(target.trim());
      onWeatherUpdate(data);
      setSearchCity('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Location not found. Please try another city.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="flex flex-col gap-4 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <CloudSun className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Real-Time Weather Radar</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Data
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Verified Open-Meteo Meteorological Feed
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search any city (e.g. Kathmandu, Pokhara, New York)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Quick City Pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-gray-400 mr-1">Locations:</span>
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => handleSearch(c)}
            disabled={isLoading}
            className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
              weather?.city.toLowerCase().includes(c.toLowerCase())
                ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-semibold'
                : 'bg-white/[0.04] border-white/[0.08] text-gray-300 hover:bg-white/[0.08]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Main Weather Metric Box */}
      {weather && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 shadow-inner space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" />
                <h4 className="text-xl font-bold text-white">
                  {weather.city}, {weather.country}
                </h4>
              </div>
              <p className="text-xs text-purple-300 mt-0.5">
                {weather.conditionNepali} • {weather.condition}
              </p>
            </div>
            <div className="text-4xl">{weather.icon}</div>
          </div>

          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-white">
                {weather.temperature}°C
              </span>
              <div className="text-xs text-gray-400">
                <p>Feels like: <strong className="text-white">{weather.feelsLike}°C</strong></p>
                <p>Live satellite feed</p>
              </div>
            </div>

            {weather.localTime && (
              <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Local Time</p>
                <p className="text-sm font-mono font-bold text-emerald-400">
                  {weather.localTime} <span className="text-[10px] text-gray-400">{weather.timezoneAbbr || ''}</span>
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/[0.06] text-xs">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">Humidity</p>
                <p className="font-bold text-white">{weather.humidity}%</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] flex items-center gap-2">
              <Wind className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">Wind</p>
                <p className="font-bold text-white">{weather.windSpeed} km/h</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] flex items-center gap-2">
              <Sunrise className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">Sunrise</p>
                <p className="font-bold text-white">{weather.sunrise}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.04] flex items-center gap-2">
              <Sunset className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">Sunset</p>
                <p className="font-bold text-white">{weather.sunset}</p>
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          {weather.forecast && weather.forecast.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-semibold">5-Day Meteorological Outlook</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {weather.forecast.map((day, idx) => {
                  const dayName = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  });
                  return (
                    <div
                      key={day.date}
                      className="p-2 rounded-xl bg-black/30 border border-white/[0.04] flex flex-col items-center justify-between"
                    >
                      <span className="text-[11px] font-semibold text-gray-300">
                        {idx === 0 ? 'Today' : dayName}
                      </span>
                      <span className="text-xl my-1">{day.icon}</span>
                      <div className="text-[11px]">
                        <span className="font-bold text-white">{day.maxTemp}°</span>
                        <span className="text-gray-400 text-[10px] ml-1">{day.minTemp}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ask in Chat */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onAskAboutWeather(weather)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Askora AI about this Weather</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0f0b21] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white/[0.03] p-5 border border-white/[0.08]">
      {content}
    </div>
  );
};
