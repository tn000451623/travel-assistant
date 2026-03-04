import React, { useState, useEffect } from 'react';
import { Calculator, MessageSquare, Wallet, Volume2, ArrowRightLeft, Info, Trash2, RefreshCw, MapPin, Compass, Navigation, Home, Globe, AlertTriangle, Tag, Mic, Languages, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';
import ttsData from './tts_data.json';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Constants & Data ---
const FALLBACK_EXCHANGE_RATE = 780; // 1 TWD = 780 VND (Approximate fallback)

const PHRASES = [
  { id: 1, category: '餐飲', zh: '不要香菜', vi: 'Không rau mùi', phonetic: '空 饒 姆以' },
  { id: 2, category: '餐飲', zh: '不要冰塊', vi: 'Không đá', phonetic: '空 答' },
  { id: 3, category: '餐飲', zh: '少糖', vi: 'Ít đường', phonetic: '伊 登' },
  { id: 9, category: '購物', zh: '多少錢', vi: 'Bao nhiêu tiền?', phonetic: '包 紐 點' },
  { id: 4, category: '購物', zh: '太貴了', vi: 'Mắc quá', phonetic: '馬 瓜' },
  { id: 5, category: '購物', zh: '結帳', vi: 'Tính tiền', phonetic: '丁 點' },
  { id: 6, category: '日常', zh: '你好', vi: 'Xin chào', phonetic: '新 昭' },
  { id: 7, category: '日常', zh: '謝謝', vi: 'Cảm ơn', phonetic: '感恩' },
  { id: 8, category: '交通', zh: '我要去這裡', vi: 'Tôi muốn đến đây', phonetic: '多以 姆翁 點 堆' },
  { id: 10, category: '日常', zh: '請問廁所在哪裡呢?', vi: 'Xin hỏi nhà vệ sinh ở đâu?', phonetic: '新 害 娘 衛 仙 噁 豆' },
];

const TIPS = [
  { id: 1, title: '床頭小費', min: 20000, max: 50000, desc: '每天早上放在枕頭上或床頭櫃', icon: '🛏️' },
  { id: 2, title: '行李員', min: 20000, max: 50000, desc: '按件計算，幫忙送到房間時給予', icon: '🧳' },
  { id: 3, title: '按摩 (一般)', min: 50000, max: 100000, desc: '60-90分鐘的平價街邊按摩', icon: '💆' },
  { id: 4, title: '按摩 (高級)', min: 100000, max: 200000, desc: '高檔SPA或飯店附設按摩', icon: '✨' },
  { id: 5, title: '包車司機', min: 100000, max: 200000, desc: '一整天的行程結束後給予', icon: '🚐' },
  { id: 6, title: 'Grab 叫車', min: 10000, max: null, desc: '非強制，通常會將零頭給司機 (或不找零)', icon: '🚕' },
];

const COMMON_PRICES = [
  { id: 1, name: '法國麵包 (Bánh mì)', min: 20000, max: 40000, icon: '🥖' },
  { id: 2, name: '路邊河粉 (Phở)', min: 40000, max: 60000, icon: '🍜' },
  { id: 3, name: '冰煉乳咖啡', min: 20000, max: 40000, icon: '☕' },
  { id: 4, name: '現剖椰子', min: 20000, max: 30000, icon: '🥥' },
  { id: 5, name: 'Grab 短程 (約3km)', min: 30000, max: 50000, icon: '🚕' },
  { id: 6, name: '平價按摩 (60分鐘)', min: 200000, max: 300000, icon: '💆' },
];

// --- Components ---

function Explore() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [placesText, setPlacesText] = useState<string>('');
  const [placesLinks, setPlacesLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const getWeatherDesc = (code: number) => {
    if (code === 0) return { text: '晴天', icon: '☀️' };
    if (code <= 3) return { text: '多雲', icon: '⛅' };
    if (code <= 48) return { text: '起霧', icon: '🌫️' };
    if (code <= 67) return { text: '下雨', icon: '🌧️' };
    if (code <= 77) return { text: '下雪', icon: '❄️' };
    if (code <= 82) return { text: '陣雨', icon: '🌦️' };
    if (code <= 99) return { text: '雷雨', icon: '⛈️' };
    return { text: '未知', icon: '🌡️' };
  };

  const handleExplore = () => {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('您的瀏覽器不支援定位功能');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });

        try {
          // Fetch Weather
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation_probability,weather_code&timezone=auto`);
          const weatherData = await weatherRes.json();
          if (weatherData.current) {
            setWeather({
              temp: weatherData.current.temperature_2m,
              rainProb: weatherData.current.precipitation_probability || 0,
              desc: getWeatherDesc(weatherData.current.weather_code)
            });
          }

          // Fetch Places via Gemini
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "請推薦我目前位置附近 3 到 5 個特色旅遊景點或知名美食名店，並用繁體中文簡短介紹它們的特色。",
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: lat,
                    longitude: lng
                  }
                }
              }
            }
          });

          setPlacesText(response.text || '無法取得推薦景點。');
          
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            const links = chunks
              .filter((c: any) => c.maps && c.maps.uri)
              .map((c: any) => ({ title: c.maps.title, uri: c.maps.uri }));
            setPlacesLinks(links);
          }

        } catch (err) {
          console.error(err);
          setError('獲取資料時發生錯誤，請稍後再試。');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('無法取得您的位置，請確認是否已允許定位權限。');
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      <div className="px-1 mb-2">
        <h2 className="text-lg font-semibold text-emerald-900">探索周邊</h2>
        <p className="text-sm text-gray-500">一鍵獲取當地天氣與附近推薦景點</p>
      </div>

      {!location && !loading && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-100 flex flex-col items-center text-center">
          <div className="bg-emerald-50 p-4 rounded-full mb-4 text-emerald-600">
            <MapPin size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">你在哪裡呢？</h3>
          <p className="text-sm text-gray-500 mb-6">允許定位權限，讓我為你尋找附近的好去處與天氣資訊。</p>
          <button
            onClick={handleExplore}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors active:scale-95 flex items-center gap-2"
          >
            <Navigation size={18} /> 允許定位並探索
          </button>
          {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-100 flex flex-col items-center text-center">
          <RefreshCw size={32} className="animate-spin text-emerald-600 mb-4" />
          <p className="text-sm font-medium text-gray-600">正在為您探索周邊資訊...</p>
        </div>
      )}

      {location && !loading && (
        <div className="space-y-4">
          {/* Weather Card */}
          {weather && (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 shadow-md text-white flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium mb-1 uppercase tracking-wider">目前天氣</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">{weather.temp}°C</span>
                  <span className="text-lg font-medium mb-1">{weather.desc.text}</span>
                </div>
                <p className="text-emerald-50 text-xs mt-2 flex items-center gap-1">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full">降雨機率: {weather.rainProb}%</span>
                </p>
              </div>
              <div className="text-6xl drop-shadow-md">
                {weather.desc.icon}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-48 w-full rounded-2xl overflow-hidden z-0 relative">
              <MapContainer center={[location.lat, location.lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]}>
                  <Popup>您的位置</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Compass size={18} className="text-emerald-600" /> 附近推薦景點
            </h3>
            <div className="text-sm text-gray-700 leading-relaxed markdown-body">
              <ReactMarkdown>{placesText}</ReactMarkdown>
            </div>

            {placesLinks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Google Maps 連結</h4>
                <div className="flex flex-col gap-2">
                  {placesLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span className="truncate pr-2 font-medium">{link.title}</span>
                      <MapPin size={14} className="shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleExplore}
            className="w-full bg-gray-100 text-gray-600 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> 重新整理周邊資訊
          </button>
        </div>
      )}
    </div>
  );
}

interface ConverterProps {
  exchangeRate: number;
  lastUpdated: string;
  isLoadingRate: boolean;
}

function Converter({ exchangeRate, lastUpdated, isLoadingRate }: ConverterProps) {
  const [vnd, setVnd] = useState<string>('');
  const [twd, setTwd] = useState<string>('');

  const handleVndChange = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) {
      setVnd('');
      setTwd('');
      return;
    }
    setVnd(num.toLocaleString('en-US'));
    setTwd(Math.round(num / exchangeRate).toLocaleString('en-US'));
  };

  const handleTwdChange = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) {
      setVnd('');
      setTwd('');
      return;
    }
    setTwd(num.toLocaleString('en-US'));
    setVnd(Math.round(num * exchangeRate).toLocaleString('en-US'));
  };

  const addVnd = (amount: number) => {
    const currentVnd = parseInt(vnd.replace(/\D/g, ''), 10) || 0;
    handleVndChange((currentVnd + amount).toString());
  };

  const handleClear = () => {
    setVnd('');
    setTwd('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-emerald-900">匯率換算</h2>
            <div className="flex items-center text-xs text-gray-400 mt-1 gap-1">
              <RefreshCw size={10} className={isLoadingRate ? "animate-spin" : ""} />
              {isLoadingRate ? '更新中...' : `最後更新: ${lastUpdated}`}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              1 TWD ≈ {Math.round(exchangeRate)} VND
            </span>
            <button 
              onClick={handleClear} 
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors px-2 py-1 bg-gray-50 hover:bg-red-50 rounded-full active:scale-95"
            >
              <Trash2 size={12} /> 清空
            </button>
          </div>
        </div>

        {/* VND Input */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 relative overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">越南盾 (VND)</label>
          <div className="flex items-center">
            <span className="text-2xl font-medium text-gray-400 mr-2">₫</span>
            <input
              type="text"
              inputMode="numeric"
              value={vnd}
              onChange={(e) => handleVndChange(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-4xl font-bold text-gray-900 outline-none placeholder-gray-300"
            />
          </div>
        </div>

        <div className="flex justify-center -my-7 relative z-10">
          <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
              <ArrowRightLeft size={20} className="rotate-90" />
            </div>
          </div>
        </div>

        {/* TWD Input */}
        <div className="bg-gray-50 rounded-2xl p-4 mt-4 relative overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">新台幣 (TWD)</label>
          <div className="flex items-center">
            <span className="text-2xl font-medium text-gray-400 mr-2">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={twd}
              onChange={(e) => handleTwdChange(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-4xl font-bold text-gray-900 outline-none placeholder-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">快速加入 (VND)</h3>
        <div className="grid grid-cols-4 gap-2">
          {[10000, 50000, 100000, 500000].map((amount) => (
            <button
              key={amount}
              onClick={() => addVnd(amount)}
              className="bg-white border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors active:scale-95"
            >
              +{amount / 1000}k
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
          <Info size={12} />
          當地人報價常省略後面的三個零 (如 50k = 50,000)
        </p>
      </div>

      {/* Warning Section */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
        <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1">
          <AlertTriangle size={16} /> 防坑與防詐騙提醒
        </h4>
        <ul className="text-xs text-red-700 space-y-1.5 list-disc pl-4">
          <li><strong>確認鈔票零的數量：</strong> 500k 與 50k 顏色相近，給錢前務必看清楚。</li>
          <li><strong>沒有標價先問價：</strong> 路邊攤若無標價，點餐/拿取前一定要先問「Bao nhiêu tiền? (多少錢)」，或用手機按計算機確認。</li>
          <li><strong>搭車請用 Grab：</strong> 避免路邊隨機攔車，若必須攔車請認明 Vinasun 或 Mai Linh 車隊並要求跳表 (By meter)。</li>
        </ul>
      </div>

      {/* Common Prices Reference */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 px-1 flex items-center gap-1">
          <Tag size={16} className="text-emerald-600" /> 當地合理物價參考
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {COMMON_PRICES.map(item => {
            const twdMin = Math.round(item.min / exchangeRate);
            const twdMax = Math.round(item.max / exchangeRate);
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-gray-50 p-1.5 rounded-lg">{item.icon}</span>
                  <span className="text-sm font-bold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600">{item.min.toLocaleString()} - {item.max.toLocaleString()} ₫</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">約 ${twdMin} - ${twdMax} TWD</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

function LiveTranslator() {
  const [mode, setMode] = useState<'speak' | 'listen'>('speak');
  const [inputText, setInputText] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasViVoice, setHasViVoice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setHasViVoice(false);
      return;
    }

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const vi = voices.some(v => v.lang.includes('vi') || v.lang.includes('VI'));
        setHasViVoice(vi);
      }
    };

    checkVoices();
    window.speechSynthesis.onvoiceschanged = checkVoices;
  }, []);

  const translateText = async (text: string, sl: string, tl: string) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map((item: any) => item[0]).join('');
  };

  const playVietnameseText = async (text: string) => {
    if (!text.trim() || isPlaying || !hasViVoice) return;
    
    if (!('speechSynthesis' in window)) return;

    setIsPlaying(true);
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(voice => voice.lang.includes('vi') || voice.lang.includes('VI'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      await new Promise<void>((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = (err) => reject(err);
        window.speechSynthesis.speak(utterance);
      });
    } catch (e) {
      console.error('Speech synthesis error:', e);
      alert('語音播放失敗');
    } finally {
      setIsPlaying(false);
    }
  };

  const handleTranslateAndSpeak = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setTranslatedText('');
    try {
      const viText = await translateText(inputText, 'zh-TW', 'vi');
      setTranslatedText(viText);
      setIsLoading(false);

      if (hasViVoice) {
        await playVietnameseText(viText);
      }
    } catch (e) {
      console.error(e);
      alert('翻譯失敗');
      setIsLoading(false);
    }
  };

  const translateViToZh = async (viText: string) => {
    setIsLoading(true);
    try {
      const zhText = await translateText(viText, 'vi', 'zh-TW');
      setTranslatedText(zhText);
    } catch (e) {
      console.error(e);
      alert('翻譯失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援語音辨識功能，請使用 Chrome 或 Safari。');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognizedText('');
      setTranslatedText('');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setRecognizedText(transcript);
      
      if (event.results[0].isFinal) {
        translateViToZh(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        // 這是正常現象，代表麥克風沒有收到聲音，不需要報錯
        return;
      }
      console.error('Speech recognition error:', event.error);
      alert('語音辨識發生錯誤: ' + event.error);
    };
    
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Languages size={18} className="text-emerald-600" />
          即時翻譯
        </h3>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => { setMode('speak'); setTranslatedText(''); setRecognizedText(''); setInputText(''); }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'speak' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
          >
            說越文
          </button>
          <button 
            onClick={() => { setMode('listen'); setTranslatedText(''); setRecognizedText(''); setInputText(''); }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'listen' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
          >
            聽越語
          </button>
        </div>
      </div>

      {mode === 'speak' ? (
        <div className="space-y-3">
          {hasViVoice === false && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2 text-yellow-800 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                您的設備尚未安裝「越南語」語音包，目前僅提供翻譯功能。若要啟用發音，請前往系統設定下載越南語音。
              </p>
            </div>
          )}
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="輸入想說的中文..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none h-20"
          />
          <button 
            onClick={handleTranslateAndSpeak}
            disabled={isLoading || isPlaying || !inputText.trim()}
            className="w-full bg-emerald-600 text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : isPlaying ? <Volume2 size={18} className="animate-pulse" /> : hasViVoice === false ? <Languages size={18} /> : <Play size={18} />}
            {isLoading ? '翻譯中...' : isPlaying ? '播放中...' : hasViVoice === false ? '僅翻譯 (未安裝語音包)' : '翻譯並發音'}
          </button>
          {translatedText && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-emerald-600 font-bold mb-1">越南語翻譯：</p>
                <p className="text-sm font-medium text-gray-800">{translatedText}</p>
              </div>
              {hasViVoice !== false && (
                <button 
                  onClick={() => playVietnameseText(translatedText)}
                  disabled={isPlaying}
                  className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors disabled:opacity-50 shrink-0"
                >
                  {isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 flex flex-col items-center">
          <button 
            onClick={startListening}
            disabled={isListening || isLoading}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-200' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            }`}
          >
            <Mic size={32} />
          </button>
          <p className="text-xs text-gray-500 font-medium">
            {isListening ? '正在聆聽越南語...' : '點擊麥克風開始收音'}
          </p>

          {(recognizedText || translatedText) && (
            <div className="w-full space-y-2 mt-2 text-left">
              {recognizedText && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold mb-1">聽到的越南語：</p>
                    <p className="text-sm font-medium text-gray-700">{recognizedText}</p>
                  </div>
                  <button 
                    onClick={() => playVietnameseText(recognizedText)}
                    disabled={isPlaying}
                    className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isPlaying ? <Volume2 size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                  </button>
                </div>
              )}
              {translatedText && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-bold mb-1">中文翻譯：</p>
                  <p className="text-sm font-medium text-gray-800">{translatedText}</p>
                </div>
              )}
              {isLoading && !translatedText && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">翻譯中...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Phrasebook() {
  const [playingId, setPlayingId] = useState<number | null>(null);

  const speak = async (id: number) => {
    if (playingId === id) return; // Prevent double click
    
    setPlayingId(id);
    
    try {
      // Get pre-generated audio from imported JSON
      const audioDataUrl = (ttsData as Record<string, string>)[id.toString()];
      
      if (audioDataUrl && audioDataUrl.trim() !== "") {
        const audio = new Audio(audioDataUrl);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          console.warn('Pre-generated audio failed, falling back to browser TTS');
          fallbackSpeak(id);
        };
        await audio.play();
      } else {
        // Fallback to browser TTS if no pre-generated audio
        fallbackSpeak(id);
      }
    } catch (err: any) {
      console.error('TTS failed:', err);
      fallbackSpeak(id);
    }
  };

  const fallbackSpeak = (id: number) => {
    const phrase = PHRASES.find(p => p.id === id);
    if (!phrase || !('speechSynthesis' in window)) {
      setPlayingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(phrase.vi);
    utterance.lang = 'vi-VN';
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);
    
    // Try to find a Vietnamese voice
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) utterance.voice = viVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      <LiveTranslator />

      <div className="px-1 mb-2">
        <h2 className="text-lg font-semibold text-emerald-900">手指越語</h2>
        <p className="text-sm text-gray-500">點擊卡片發音，或直接指給當地人看</p>
      </div>

      <div className="grid gap-3">
        {PHRASES.map((phrase) => (
          <div
            key={phrase.id}
            onClick={() => speak(phrase.id)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-between group hover:border-emerald-200"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {phrase.category}
                </span>
                <h3 className="text-base font-bold text-gray-900">{phrase.zh}</h3>
              </div>
              <p className="text-xl font-medium text-emerald-600 mb-1">{phrase.vi}</p>
              <p className="text-xs text-gray-400 font-mono">發音：{phrase.phonetic}</p>
            </div>
            <button 
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                playingId === phrase.id 
                  ? 'bg-emerald-500 text-white animate-pulse' 
                  : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
              }`}
            >
              <Volume2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TippingGuide({ exchangeRate }: { exchangeRate: number }) {
  const formatAmount = (min: number, max: number | null) => {
    if (max) {
      const twdMin = Math.round(min / exchangeRate);
      const twdMax = Math.round(max / exchangeRate);
      return (
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-emerald-600">
            {min.toLocaleString()} - {max.toLocaleString()} VND
          </span>
          <span className="text-xs font-medium text-emerald-500/80">
            (約 ${twdMin} - ${twdMax} TWD)
          </span>
        </div>
      );
    } else {
      const twdMin = Math.round(min / exchangeRate);
      return (
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-emerald-600">
            {min.toLocaleString()} VND
          </span>
          <span className="text-xs font-medium text-emerald-500/80">
            (約 ${twdMin} TWD)
          </span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      <div className="px-1 mb-2">
        <h2 className="text-lg font-semibold text-emerald-900">小費行情指南</h2>
        <p className="text-sm text-gray-500">越南有小費文化，以下為常見參考金額</p>
      </div>

      <div className="grid gap-3">
        {TIPS.map((tip) => (
          <div key={tip.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-start">
            <div className="text-3xl bg-gray-50 p-2 rounded-xl h-14 w-14 flex items-center justify-center shrink-0">
              {tip.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 mb-1">{tip.title}</h3>
              <div className="mb-1">
                {formatAmount(tip.min, tip.max)}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mt-1">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mt-6">
        <h4 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-1">
          <Info size={16} /> 溫馨提醒
        </h4>
        <p className="text-xs text-amber-700 leading-relaxed">
          給小費時請直接給予紙鈔，盡量避免給硬幣或破舊的鈔票。若服務特別好，可以視情況多給一些。
        </p>
      </div>
    </div>
  );
}

// --- Main App ---

function VietnamModule() {
  const [activeTab, setActiveTab] = useState<'converter' | 'phrases' | 'tipping' | 'explore'>('converter');
  const [exchangeRate, setExchangeRate] = useState<number>(FALLBACK_EXCHANGE_RATE);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        setIsLoadingRate(true);
        // Using ExchangeRate-API (Free, reliable, no key needed for basic usage)
        const res = await fetch('https://open.er-api.com/v6/latest/TWD');
        const data = await res.json();
        if (data && data.rates && data.rates.VND) {
          setExchangeRate(data.rates.VND);
          const now = new Date();
          setLastUpdated(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate', error);
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchRate();
    // Auto update every 1 hour (3600000 ms)
    const interval = setInterval(fetchRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-emerald-600 text-white pt-12 pb-6 px-6 rounded-b-[2rem] shadow-md z-10 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight mb-1">越南</h1>
        <p className="text-emerald-100 text-sm font-medium">Xin chào! 你的隨身口袋導遊</p>
        
        <div className="flex bg-emerald-700/50 rounded-xl p-1 mt-5 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('converter')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'converter' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:text-white'}`}><Calculator size={14} className="shrink-0"/> 換算</button>
          <button onClick={() => setActiveTab('phrases')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'phrases' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:text-white'}`}><MessageSquare size={14} className="shrink-0"/> 越語</button>
          <button onClick={() => setActiveTab('tipping')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'tipping' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:text-white'}`}><Wallet size={14} className="shrink-0"/> 小費</button>
          <button onClick={() => setActiveTab('explore')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'explore' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:text-white'}`}><Compass size={14} className="shrink-0"/> 周邊</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 pb-28">
        <AnimatePresence mode="wait">
          {activeTab === 'converter' && (
            <motion.div key="converter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Converter exchangeRate={exchangeRate} lastUpdated={lastUpdated} isLoadingRate={isLoadingRate} />
            </motion.div>
          )}
          {activeTab === 'phrases' && (
            <motion.div key="phrases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Phrasebook />
            </motion.div>
          )}
          {activeTab === 'tipping' && (
            <motion.div key="tipping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <TippingGuide exchangeRate={exchangeRate} />
            </motion.div>
          )}
          {activeTab === 'explore' && (
            <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Explore />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function HomeModule({ onNavigate }: { onNavigate: (tab: 'vietnam') => void }) {
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="bg-blue-600 text-white pt-12 pb-6 px-6 rounded-b-[2rem] shadow-md z-10 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight mb-1">旅遊助手</h1>
        <p className="text-blue-100 text-sm font-medium">選擇你的目的地，開始旅程</p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <h2 className="text-lg font-bold text-gray-900 mb-4">熱門目的地</h2>
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => onNavigate('vietnam')}
            className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-5xl">🇻🇳</span>
            <span className="font-bold text-gray-800">越南</span>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3 opacity-50">
            <span className="text-5xl">🇯🇵</span>
            <span className="font-bold text-gray-800">日本</span>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">開發中</span>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3 opacity-50">
            <span className="text-5xl">🇹🇭</span>
            <span className="font-bold text-gray-800">泰國</span>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">開發中</span>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3 opacity-50">
            <span className="text-5xl">🇰🇷</span>
            <span className="font-bold text-gray-800">韓國</span>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">開發中</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mainTab, setMainTab] = useState<'home' | 'vietnam'>('home');

  return (
    <div className="h-[100dvh] w-full bg-[#F8FAFC] flex flex-col font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {mainTab === 'home' && (
            <motion.div key="home" className="absolute inset-0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <HomeModule onNavigate={(tab) => setMainTab(tab)} />
            </motion.div>
          )}
          {mainTab === 'vietnam' && (
            <motion.div key="vietnam" className="absolute inset-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <VietnamModule />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 pb-6 pt-2 absolute bottom-0 w-full rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <div className="flex justify-around items-center px-6 py-1">
          <button
            onClick={() => setMainTab('home')}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all ${
              mainTab === 'home' ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${mainTab === 'home' ? 'bg-blue-50' : ''}`}>
              <Home size={22} strokeWidth={mainTab === 'home' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold">首頁</span>
          </button>

          <button
            onClick={() => setMainTab('vietnam')}
            className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-all ${
              mainTab === 'vietnam' ? 'text-emerald-600 scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 ${mainTab === 'vietnam' ? 'bg-emerald-50' : ''}`}>
              <Globe size={22} strokeWidth={mainTab === 'vietnam' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold">越南</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

