import React, { useState, useEffect } from 'react';
import { Calculator, MessageSquare, Wallet, ArrowRightLeft, Info, Trash2, RefreshCw, MapPin, Compass, Navigation, Home, Globe, AlertTriangle, Tag, Mic, Volume2, MicOff, Send, User, Bot, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Fix Leaflet default icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Constants & Data ---
const FALLBACK_EXCHANGE_RATE = 780; // 1 TWD = 780 VND (Approximate fallback)

const PHRASES_TH = [
  { id: 1, category: '餐飲', zh: '不要辣', target: 'Mai pet', phonetic: '賣 呸' },
  { id: 2, category: '餐飲', zh: '請給我水', target: 'Kor nam plao', phonetic: '口 囊 拋' },
  { id: 3, category: '餐飲', zh: '很好吃', target: 'Aroi mak', phonetic: '阿 蕊 罵' },
  { id: 4, category: '購物', zh: '多少錢', target: 'Tao rai?', phonetic: '套 萊' },
  { id: 5, category: '購物', zh: '太貴了', target: 'Paeng pai', phonetic: '拼 拜' },
  { id: 6, category: '日常', zh: '你好', target: 'Sawasdee', phonetic: '三 哇 滴' },
  { id: 7, category: '日常', zh: '謝謝', target: 'Khob khun', phonetic: '口 坤' },
  { id: 8, category: '交通', zh: '我要去這裡', target: 'Yark pai tee nee', phonetic: '亞 拜 踢 尼' },
  { id: 9, category: '日常', zh: '對不起', target: 'Kor thoad', phonetic: '口 投' },
  { id: 10, category: '日常', zh: '廁所在哪裡？', target: 'Hong nam yoo nai?', phonetic: '紅 囊 幽 奶' },
];

const TIPS_TH = [
  { id: 1, title: '床頭小費', min: 20, max: 50, desc: '每天早上放在枕頭上或床頭櫃', icon: '🛏️' },
  { id: 2, title: '行李員', min: 20, max: 50, desc: '按件計算，幫忙送到房間時給予', icon: '🧳' },
  { id: 3, title: '按摩 (一般)', min: 50, max: 100, desc: '60-90分鐘的平價街邊按摩', icon: '💆' },
  { id: 4, title: '按摩 (高級)', min: 100, max: 200, desc: '高檔SPA或飯店附設按摩', icon: '✨' },
  { id: 5, title: '包車司機', min: 50, max: 100, desc: '一整天的行程結束後給予', icon: '🚐' },
  { id: 6, title: '餐廳服務', min: 20, max: null, desc: '非強制，通常會將零頭給服務生', icon: '🍽️' },
];

const REGIONAL_DATA_TH = {
  central: {
    name: '中部 (曼谷)',
    prices: [
      { id: 1, name: '泰式炒河粉 (Pad Thai)', min: 50, max: 120, icon: '🍜' },
      { id: 2, name: '芒果糯米飯', min: 60, max: 150, icon: '🥭' },
      { id: 3, name: '泰式奶茶', min: 25, max: 60, icon: '🧋' },
      { id: 4, name: '現剖椰子', min: 40, max: 80, icon: '🥥' },
      { id: 5, name: '嘟嘟車 (短程)', min: 60, max: 150, icon: '🛺' },
      { id: 6, name: '平價按摩 (60分鐘)', min: 250, max: 450, icon: '💆' },
    ],
    souvenirs: [
      { id: 101, name: '泰國手標奶茶粉', min: 130, max: 250, icon: '🧋' },
      { id: 102, name: '鼻通 (Poy-Sian)', min: 20, max: 30, icon: '👃' },
      { id: 103, name: '曼谷包 (NaRaYa)', min: 150, max: 800, icon: '👜' },
    ]
  },
  north: {
    name: '北部 (清邁)',
    prices: [
      { id: 1, name: '泰北咖哩麵 (Khao Soi)', min: 40, max: 80, icon: '🍜' },
      { id: 2, name: '夜市小吃', min: 20, max: 100, icon: '🍢' },
      { id: 3, name: '手沖咖啡', min: 40, max: 120, icon: '☕' },
      { id: 4, name: '雙條車 (市區)', min: 30, max: 50, icon: '🛻' },
      { id: 5, name: '租機車 (24h)', min: 200, max: 350, icon: '🛵' },
      { id: 6, name: '清邁按摩 (60分鐘)', min: 200, max: 350, icon: '💆' },
    ],
    souvenirs: [
      { id: 201, name: '大象褲', min: 100, max: 150, icon: '🐘' },
      { id: 202, name: '手工皂/香氛', min: 50, max: 300, icon: '🧼' },
      { id: 203, name: '乾果/堅果', min: 80, max: 250, icon: '🥜' },
    ]
  }
};

const PHRASES_VN = [
  { id: 1, category: '餐飲', zh: '不要香菜', target: 'Không rau mùi', phonetic: '空 饒 姆以' },
  { id: 2, category: '餐飲', zh: '不要冰塊', target: 'Không đá', phonetic: '空 答' },
  { id: 3, category: '餐飲', zh: '少糖', target: 'Ít đường', phonetic: '伊 登' },
  { id: 9, category: '購物', zh: '多少錢', target: 'Bao nhiêu tiền?', phonetic: '包 紐 點' },
  { id: 4, category: '購物', zh: '太貴了', target: 'Mắc quá', phonetic: '馬 瓜' },
  { id: 5, category: '購物', zh: '結帳', target: 'Tính tiền', phonetic: '丁 點' },
  { id: 6, category: '日常', zh: '你好', target: 'Xin chào', phonetic: '新 昭' },
  { id: 7, category: '日常', zh: '謝謝', target: 'Cảm ơn', phonetic: '感恩' },
  { id: 8, category: '交通', zh: '我要去這裡', target: 'Tôi muốn đến đây', phonetic: '多以 姆翁 點 堆' },
  { id: 10, category: '日常', zh: '請問廁所在哪裡呢?', target: 'Xin hỏi nhà vệ sinh ở đâu?', phonetic: '新 害 娘 衛 仙 噁 豆' },
];

const PHRASES_JP = [
  { id: 1, category: '餐飲', zh: '不要芥末', target: 'わさび抜きで', phonetic: '哇沙比 努ki 爹' },
  { id: 2, category: '餐飲', zh: '請給我水', target: 'お水をください', phonetic: '歐咪組 歐 苦答撒一' },
  { id: 3, category: '餐飲', zh: '很好吃', target: 'おいしいです', phonetic: '歐一西 爹蘇' },
  { id: 4, category: '購物', zh: '多少錢', target: 'いくらですか？', phonetic: '一哭拉 爹蘇卡' },
  { id: 5, category: '購物', zh: '免稅嗎？', target: '免税ですか？', phonetic: '面賊 爹蘇卡' },
  { id: 6, category: '日常', zh: '你好', target: 'こんにちは', phonetic: '空尼奇哇' },
  { id: 7, category: '日常', zh: '謝謝', target: 'ありがとうございます', phonetic: '阿里嘎多 勾扎一嘛蘇' },
  { id: 8, category: '交通', zh: '車站怎麼走？', target: '駅はどこですか？', phonetic: '欸ki 哇 豆口 爹蘇卡' },
  { id: 9, category: '日常', zh: '對不起/打擾了', target: 'すみません', phonetic: '蘇咪嘛線' },
  { id: 10, category: '日常', zh: '廁所在哪裡？', target: 'トイレはどこですか？', phonetic: '偷一雷 哇 豆口 爹蘇卡' },
];

const TIPS_VN = [
  { id: 1, title: '床頭小費', min: 20000, max: 50000, desc: '每天早上放在枕頭上或床頭櫃', icon: '🛏️' },
  { id: 2, title: '行李員', min: 20000, max: 50000, desc: '按件計算，幫忙送到房間時給予', icon: '🧳' },
  { id: 3, title: '按摩 (一般)', min: 50000, max: 100000, desc: '60-90分鐘的平價街邊按摩', icon: '💆' },
  { id: 4, title: '按摩 (高級)', min: 100000, max: 200000, desc: '高檔SPA或飯店附設按摩', icon: '✨' },
  { id: 5, title: '包車司機', min: 100000, max: 200000, desc: '一整天的行程結束後給予', icon: '🚐' },
  { id: 6, title: 'Grab 叫車', min: 10000, max: null, desc: '非強制，通常會將零頭給司機 (或不找零)', icon: '🚕' },
];

const TIPS_JP = [
  { id: 1, title: '日本無小費文化', min: 0, max: null, desc: '日本通常不需要給小費，過多的金錢反而可能造成困擾。', icon: '🇯🇵' },
  { id: 2, title: '服務費', min: 0, max: null, desc: '部分高級餐廳或飯店會直接在帳單中加入 10-15% 的服務費。', icon: '🧾' },
  { id: 3, title: '旅館 (心付け)', min: 1000, max: 3000, desc: '極少數傳統高級旅館，若服務極佳可考慮給予，但非必要。', icon: '🏨' },
];

const REGIONAL_DATA_VN = {
  north: {
    name: '北越 (河內)',
    prices: [
      { id: 1, name: '法國麵包 (Bánh mì)', min: 20000, max: 35000, icon: '🥖' },
      { id: 2, name: '路邊河粉 (Phở)', min: 40000, max: 65000, icon: '🍜' },
      { id: 3, name: '雞蛋咖啡 (Cà phê trứng)', min: 35000, max: 50000, icon: '☕' },
      { id: 4, name: '現剖椰子', min: 25000, max: 35000, icon: '🥥' },
      { id: 5, name: 'Grab 短程 (約3km)', min: 30000, max: 50000, icon: '🚕' },
      { id: 6, name: '平價按摩 (60分鐘)', min: 180000, max: 280000, icon: '💆' },
    ],
    souvenirs: [
      { id: 101, name: 'O Mai (蜜餞/鹹酸甜)', min: 50000, max: 150000, icon: '🍑' },
      { id: 102, name: '河內絲綢', min: 200000, max: 1000000, icon: '🧣' },
      { id: 103, name: '綠米片 (Cốm)', min: 30000, max: 60000, icon: '🌾' },
    ]
  },
  south: {
    name: '南越 (胡志明市)',
    prices: [
      { id: 1, name: '法國麵包 (Bánh mì)', min: 25000, max: 45000, icon: '🥖' },
      { id: 2, name: '路邊河粉 (Phở)', min: 50000, max: 80000, icon: '🍜' },
      { id: 3, name: '冰煉乳咖啡', min: 20000, max: 40000, icon: '☕' },
      { id: 4, name: '現剖椰子', min: 20000, max: 30000, icon: '🥥' },
      { id: 5, name: 'Grab 短程 (約3km)', min: 35000, max: 55000, icon: '🚕' },
      { id: 6, name: '平價按摩 (60分鐘)', min: 220000, max: 350000, icon: '💆' },
    ],
    souvenirs: [
      { id: 201, name: '腰果 (帶皮)', min: 150000, max: 250000, icon: '🥜' },
      { id: 202, name: 'Marou 巧克力', min: 50000, max: 120000, icon: '🍫' },
      { id: 203, name: 'G7/中原咖啡豆', min: 80000, max: 300000, icon: '☕' },
    ]
  }
};

const REGIONAL_DATA_JP = {
  kanto: {
    name: '關東 (東京)',
    prices: [
      { id: 1, name: '拉麵', min: 800, max: 1500, icon: '🍜' },
      { id: 2, name: '牛丼', min: 400, max: 700, icon: '🍚' },
      { id: 3, name: '便利商店飯糰', min: 120, max: 200, icon: '🍙' },
      { id: 4, name: '地鐵起步價', min: 170, max: 210, icon: '🚃' },
      { id: 5, name: '星巴克拿鐵', min: 450, max: 600, icon: '☕' },
      { id: 6, name: '居酒屋人均', min: 3000, max: 5000, icon: '🍺' },
    ],
    souvenirs: [
      { id: 101, name: '薯條三兄弟', min: 1000, max: 2000, icon: '🍟' },
      { id: 102, name: '藥妝品 (面膜/眼罩)', min: 500, max: 5000, icon: '💄' },
      { id: 103, name: '動漫周邊', min: 500, max: 10000, icon: '🧸' },
    ]
  },
  kansai: {
    name: '關西 (大阪/京都)',
    prices: [
      { id: 1, name: '章魚燒 (6-8顆)', min: 500, max: 800, icon: '🐙' },
      { id: 2, name: '大阪燒', min: 800, max: 1500, icon: '🍳' },
      { id: 3, name: '抹茶甜點', min: 500, max: 1200, icon: '🍵' },
      { id: 4, name: '公車一日券', min: 600, max: 1100, icon: '🚌' },
      { id: 5, name: '串炸 (每串)', min: 100, max: 300, icon: '🍢' },
      { id: 6, name: '神社御守', min: 500, max: 1000, icon: '⛩️' },
    ],
    souvenirs: [
      { id: 201, name: '八橋 (京都)', min: 600, max: 1500, icon: '🥟' },
      { id: 202, name: '呼吸巧克力', min: 1000, max: 2500, icon: '🍫' },
      { id: 203, name: '宇治抹茶粉', min: 1000, max: 3000, icon: '🍵' },
    ]
  }
};

const PHRASES_KR = [
  { id: 1, category: '餐飲', zh: '不要香菜', target: '고수 빼주세요', phonetic: '勾速 胚組誰優' },
  { id: 2, category: '餐飲', zh: '請給我水', target: '물 좀 주세요', phonetic: '姆 宗 珠誰優' },
  { id: 3, category: '餐飲', zh: '很好吃', target: '맛있어요', phonetic: '馬西搜優' },
  { id: 4, category: '購物', zh: '多少錢', target: '얼마예요?', phonetic: '歐馬耶優' },
  { id: 5, category: '購物', zh: '太貴了', target: '너무 비싸요', phonetic: '農姆 比撒優' },
  { id: 6, category: '日常', zh: '你好', target: '안녕하세요', phonetic: '安寧哈誰優' },
  { id: 7, category: '日常', zh: '謝謝', target: '감사합니다', phonetic: '康撒哈米答' },
  { id: 8, category: '交通', zh: '我要去這裡', target: '여기로 가주세요', phonetic: '優gi柔 嘎珠誰優' },
  { id: 9, category: '日常', zh: '對不起', target: '죄송합니다', phonetic: '崔松哈米答' },
  { id: 10, category: '日常', zh: '廁所在哪裡？', target: '화장실이 어디예요?', phonetic: '花張西里 歐底耶優' },
];

const TIPS_KR = [
  { id: 1, title: '韓國無小費文化', min: 0, max: null, desc: '韓國與日本一樣，通常不需要給小費。', icon: '🇰🇷' },
  { id: 2, title: '服務費', min: 0, max: null, desc: '部分高級餐廳或飯店會直接在帳單中加入 10% 的服務費。', icon: '🧾' },
  { id: 3, title: '計程車', min: 0, max: null, desc: '不需要給小費，若想表示感謝可以說不用找零。', icon: '🚕' },
];

const REGIONAL_DATA_KR = {
  seoul: {
    name: '首爾',
    prices: [
      { id: 1, name: '韓式拌飯', min: 8000, max: 12000, icon: '🍚' },
      { id: 2, name: '辣炒年糕', min: 3500, max: 5000, icon: '🍢' },
      { id: 3, name: '韓式炸雞', min: 18000, max: 25000, icon: '🍗' },
      { id: 4, name: '地鐵起步價', min: 1400, max: 1500, icon: '🚃' },
      { id: 5, name: '美式咖啡', min: 2000, max: 5000, icon: '☕' },
      { id: 6, name: '路邊攤魚板', min: 1000, max: 2000, icon: '🍢' },
    ],
    souvenirs: [
      { id: 101, name: '韓式海苔', min: 5000, max: 15000, icon: '🍱' },
      { id: 102, name: '美妝保養品', min: 10000, max: 100000, icon: '💄' },
      { id: 103, name: '人蔘產品', min: 30000, max: 500000, icon: '🌿' },
    ]
  },
  busan: {
    name: '釜山',
    prices: [
      { id: 1, name: '豬肉湯飯', min: 8000, max: 10000, icon: '🍲' },
      { id: 2, name: '堅果糖餅', min: 1500, max: 2500, icon: '🥞' },
      { id: 3, name: '生魚片 (人均)', min: 30000, max: 60000, icon: '🐟' },
      { id: 4, name: '公車起步價', min: 1200, max: 1550, icon: '🚌' },
      { id: 5, name: '海雲台咖啡', min: 4000, max: 7000, icon: '☕' },
      { id: 6, name: '魚板麵', min: 6000, max: 9000, icon: '🍜' },
    ],
    souvenirs: [
      { id: 201, name: '釜山魚板', min: 10000, max: 30000, icon: '🍢' },
      { id: 202, name: '海鮮乾貨', min: 15000, max: 50000, icon: '🦑' },
      { id: 203, name: '特色明信片', min: 1000, max: 3000, icon: '📮' },
    ]
  }
};

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
  regionalData: any;
  currencySymbol: string;
  currencyName: string;
  country: 'vietnam' | 'japan' | 'thailand' | 'korea';
  themeText: string;
  themeBg: string;
  themeBorder: string;
}

function Converter({ exchangeRate, lastUpdated, isLoadingRate, regionalData, currencySymbol, currencyName, country, themeText, themeBg, themeBorder }: ConverterProps) {
  const [vnd, setVnd] = useState<string>('');
  const [twd, setTwd] = useState<string>('');
  const [region, setRegion] = useState<string>(Object.keys(regionalData)[0]);

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
      <div className={`bg-white rounded-3xl p-6 shadow-sm border ${themeBorder}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className={`text-lg font-semibold ${themeText.replace('600', '900')}`}>匯率換算</h2>
            <div className="flex items-center text-xs text-gray-400 mt-1 gap-1">
              <RefreshCw size={10} className={isLoadingRate ? "animate-spin" : ""} />
              {isLoadingRate ? '更新中...' : `最後更新: ${lastUpdated}`}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-medium ${themeText} ${themeBg} px-2 py-1 rounded-full`}>
              1 TWD ≈ {exchangeRate.toFixed(country === 'vietnam' ? 0 : 2)} {currencyName}
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
        <div className={`bg-gray-50 rounded-2xl p-4 mb-4 relative overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all`}>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            {currencyName === 'VND' ? '越南盾 (VND)' : (currencyName === 'JPY' ? '日圓 (JPY)' : (currencyName === 'THB' ? '泰銖 (THB)' : '韓元 (KRW)'))}
          </label>
          <div className="flex items-center">
            <span className="text-2xl font-medium text-gray-400 mr-2">{currencySymbol}</span>
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
            <div className={`${themeBg} ${themeText} p-2 rounded-full`}>
              <ArrowRightLeft size={20} className="rotate-90" />
            </div>
          </div>
        </div>

        {/* TWD Input */}
        <div className={`bg-gray-50 rounded-2xl p-4 mt-4 relative overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all`}>
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
        <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">快速加入 ({currencyName})</h3>
        <div className="grid grid-cols-4 gap-2">
          {(country === 'vietnam' ? [10000, 50000, 100000, 500000] : (country === 'korea' ? [1000, 5000, 10000, 50000] : [100, 500, 1000, 5000])).map((amount) => (
            <button
              key={amount}
              onClick={() => addVnd(amount)}
              className={`bg-white border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:${themeBg} hover:${themeBorder} hover:${themeText} transition-colors active:scale-95`}
            >
              {country === 'vietnam' ? `+${amount / 1000}k` : (country === 'korea' ? `+${amount / 1000}k` : `+${amount}`)}
            </button>
          ))}
        </div>
        {country === 'vietnam' && (
          <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
            <Info size={12} />
            當地人報價常省略後面的三個零 (如 50k = 50,000)
          </p>
        )}
      </div>

      {/* Warning Section */}
      {country === 'vietnam' && (
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
      )}

      {country === 'japan' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1">
            <Info size={16} /> 日本旅遊小撇步
          </h4>
          <ul className="text-xs text-blue-700 space-y-1.5 list-disc pl-4">
            <li><strong>準備零錢包：</strong> 日本有大量的硬幣 (1, 5, 10, 50, 100, 500)，準備一個好拿取的零錢包非常重要。</li>
            <li><strong>西瓜卡/ICOCA：</strong> 必備交通卡，不僅可搭車，便利商店與許多自動販賣機都能使用。</li>
            <li><strong>垃圾請帶回飯店：</strong> 日本街頭極少垃圾桶，通常在便利商店門口或車站內才有。</li>
          </ul>
        </div>
      )}

      {country === 'thailand' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1">
            <Info size={16} /> 泰國旅遊小撇步
          </h4>
          <ul className="text-xs text-blue-700 space-y-1.5 list-disc pl-4">
            <li><strong>善用叫車 App：</strong> 推薦使用 Grab 或 Bolt，價格透明且可避免與嘟嘟車司機議價。</li>
            <li><strong>進入寺廟穿著：</strong> 參觀寺廟時需穿著過膝長褲/裙，且不可穿背心，部分景點提供租借服務。</li>
            <li><strong>準備 20 銖紙鈔：</strong> 泰國小費文化盛行，準備一些 20 銖紙鈔方便給予床頭或行李小費。</li>
          </ul>
        </div>
      )}

      {country === 'korea' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-1">
            <Info size={16} /> 韓國旅遊小撇步
          </h4>
          <ul className="text-xs text-indigo-700 space-y-1.5 list-disc pl-4">
            <li><strong>T-money 卡：</strong> 必備交通卡，便利商店皆可購買與儲值，也可用於小額支付。</li>
            <li><strong>地圖 App：</strong> Google Maps 在韓國導航不準，推薦下載 Naver Map 或 KakaoMap。</li>
            <li><strong>獨旅點餐：</strong> 韓國部分餐廳（如烤肉、火鍋）有「兩人份起點」的規定，點餐前可先確認。</li>
          </ul>
        </div>
      )}

      {/* Regional Prices & Souvenirs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
            <Tag size={16} className={themeText} /> 當地物價與伴手禮
          </h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {Object.keys(regionalData).map((key) => (
              <button 
                key={key}
                onClick={() => setRegion(key)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${region === key ? 'bg-white ' + themeText + ' shadow-sm' : 'text-gray-500'}`}
              >
                {regionalData[key].name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">合理物價參考</p>
          {regionalData[region].prices.map((item: any) => {
            const twdMin = Math.round(item.min / exchangeRate);
            const twdMax = Math.round(item.max / exchangeRate);
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-gray-50 p-1.5 rounded-lg">{item.icon}</span>
                  <span className="text-sm font-bold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${themeText}`}>{item.min.toLocaleString()} - {item.max.toLocaleString()} {currencySymbol}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">約 ${twdMin} - ${twdMax} TWD</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-2 mt-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">熱門伴手禮推薦</p>
          {regionalData[region].souvenirs.map((item: any) => {
            const twdMin = Math.round(item.min / exchangeRate);
            const twdMax = Math.round(item.max / exchangeRate);
            return (
              <div key={item.id} className={`bg-white border ${themeBorder.replace('100', '50')} rounded-xl p-3 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${themeBg} p-1.5 rounded-lg`}>{item.icon}</span>
                  <span className="text-sm font-bold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${themeText}`}>{item.min.toLocaleString()} - {item.max.toLocaleString()} {currencySymbol}</div>
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

interface LiveTranslatorProps {
  targetLang: string;
  title: string;
  themeText: string;
  themeBg: string;
  themeBorder: string;
}

function LiveTranslator({ targetLang, title, themeText, themeBg, themeBorder }: LiveTranslatorProps) {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'zh-to-local' | 'local-to-zh'>('zh-to-local');

  const translateText = async (text: string, sl: string, tl: string) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map((item: any) => item[0]).join('');
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setTranslatedText('');
    try {
      const sl = mode === 'zh-to-local' ? 'zh-TW' : targetLang;
      const tl = mode === 'zh-to-local' ? targetLang : 'zh-TW';
      const result = await translateText(inputText, sl, tl);
      setTranslatedText(result);
    } catch (e) {
      console.error(e);
      alert('翻譯失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = (forcedMode?: 'zh-to-local' | 'local-to-zh') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的瀏覽器不支持語音辨識');
      return;
    }

    const activeMode = forcedMode || mode;
    const recognition = new SpeechRecognition();
    recognition.lang = activeMode === 'zh-to-local' ? 'zh-TW' : (targetLang === 'vi' ? 'vi-VN' : (targetLang === 'ja' ? 'ja-JP' : (targetLang === 'th' ? 'th-TH' : 'ko-KR')));
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsLoading(true);
      try {
        const sl = activeMode === 'zh-to-local' ? 'zh-TW' : targetLang;
        const tl = activeMode === 'zh-to-local' ? targetLang : 'zh-TW';
        const result = await translateText(transcript, sl, tl);
        setTranslatedText(result);
      } catch (e) {
        console.error(e);
        alert('翻譯失敗');
      } finally {
        setIsLoading(false);
      }
    };

    recognition.start();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={18} className={themeText} />
          對話翻譯
        </h3>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => { 
              setMode('zh-to-local'); 
              setInputText(''); 
              setTranslatedText(''); 
              startListening('zh-to-local');
            }}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${mode === 'zh-to-local' ? 'bg-white ' + themeText + ' shadow-sm' : 'text-gray-500'}`}
          >
            我說中文
          </button>
          <button 
            onClick={() => { 
              setMode('local-to-zh'); 
              setInputText(''); 
              setTranslatedText(''); 
              startListening('local-to-zh');
            }}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${mode === 'local-to-zh' ? 'bg-white ' + themeText + ' shadow-sm' : 'text-gray-500'}`}
          >
            聽當地話
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={mode === 'zh-to-local' ? "輸入或說中文..." : `正在聽${title}...`}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pt-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none h-24"
          />
          <div className="absolute top-2 left-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            {mode === 'zh-to-local' ? '中文' : title}
          </div>
          <button 
            onClick={() => startListening()}
            className={`absolute bottom-3 right-3 p-2.5 rounded-full shadow-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            className={`flex-1 ${themeText.replace('text', 'bg')} text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm`}
          >
            {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
            {isLoading ? '翻譯中...' : '立即翻譯'}
          </button>
          <button 
            onClick={() => { setInputText(''); setTranslatedText(''); }}
            className="px-4 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {translatedText && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 ${themeBg} rounded-xl border ${themeBorder} relative`}
          >
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {mode === 'zh-to-local' ? title : '中文'}
            </div>
            <p className="text-lg font-bold text-gray-800 leading-tight">{translatedText}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface PhrasebookProps {
  phrases: any[];
  targetLang: string;
  translatorTitle: string;
  countryName: string;
  themeText: string;
  themeBg: string;
  themeBorder: string;
}

function Phrasebook({ phrases, targetLang, translatorTitle, countryName, themeText, themeBg, themeBorder }: PhrasebookProps) {
  const [availableVoice, setAvailableVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const langCode = targetLang === 'vi' ? 'vi' : 'ja';
      const voice = voices.find(v => v.lang.startsWith(langCode));
      setAvailableVoice(voice || null);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [targetLang]);

  const speak = (text: string) => {
    if (!availableVoice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = availableVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      <LiveTranslator targetLang={targetLang} title={translatorTitle} themeText={themeText} themeBg={themeBg} themeBorder={themeBorder} />

      <div className="px-1 mb-2">
        <h2 className={`text-lg font-semibold ${themeText.replace('600', '900')}`}>手指{countryName}語</h2>
        <p className="text-sm text-gray-500">直接指給當地人看，或參考發音標註</p>
      </div>

      <div className="grid gap-3">
        {phrases.map((phrase) => (
          <div
            key={phrase.id}
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-transform flex items-center justify-between group hover:${themeBorder}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {phrase.category}
                </span>
                <h3 className="text-base font-bold text-gray-900">{phrase.zh}</h3>
              </div>
              <p className={`text-xl font-medium ${themeText} mb-1`}>{phrase.target}</p>
              <p className="text-xs text-gray-400 font-mono">發音：{phrase.phonetic}</p>
            </div>
            {availableVoice && (
              <button 
                onClick={() => speak(phrase.target)}
                className={`p-3 rounded-full ${themeBg} ${themeText} hover:scale-110 transition-transform active:scale-95`}
                title="播放發音"
              >
                <Volume2 size={20} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TippingGuideProps {
  tips: any[];
  exchangeRate: number;
  currencyName: string;
  themeText: string;
  themeBg: string;
  country: 'vietnam' | 'japan' | 'thailand' | 'korea';
}

function TippingGuide({ tips, exchangeRate, currencyName, themeText, themeBg, country }: TippingGuideProps) {
  const formatAmount = (min: number, max: number | null) => {
    if (min === 0 && !max) {
      return (
        <span className="text-lg font-semibold text-gray-400">
          無需給予
        </span>
      );
    }
    if (max) {
      const twdMin = Math.round(min / exchangeRate);
      const twdMax = Math.round(max / exchangeRate);
      return (
        <div className="flex flex-col">
          <span className={`text-lg font-semibold ${themeText}`}>
            {min.toLocaleString()} - {max.toLocaleString()} {currencyName}
          </span>
          <span className={`text-xs font-medium ${themeText}/80`}>
            (約 ${twdMin} - ${twdMax} TWD)
          </span>
        </div>
      );
    } else {
      const twdMin = Math.round(min / exchangeRate);
      return (
        <div className="flex flex-col">
          <span className={`text-lg font-semibold ${themeText}`}>
            {min.toLocaleString()} {currencyName}
          </span>
          <span className={`text-xs font-medium ${themeText}/80`}>
            (約 ${twdMin} TWD)
          </span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      <div className="px-1 mb-2">
        <h2 className={`text-lg font-semibold ${themeText.replace('600', '900')}`}>小費行情指南</h2>
        <p className="text-sm text-gray-500">了解當地小費文化，避免尷尬</p>
      </div>

      <div className="grid gap-3">
        {tips.map((tip) => (
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
          {country === 'japan' && "尊重當地習俗是最好的禮儀。在日本，優質服務已包含在價格中，通常無需額外給予小費。"}
          {country === 'vietnam' && "尊重當地習俗是最好的禮儀。在越南，適度的小費是對服務人員的實質鼓勵，尤其在按摩或包車服務。"}
          {country === 'thailand' && "尊重當地習俗是最好的禮儀。在泰國，小費文化相當普遍，給予適當的小費（如 20-50 銖）是表達感謝的常見方式。"}
          {country === 'korea' && "尊重當地習俗是最好的禮儀。在韓國，通常不需要給小費，優質服務已包含在價格中。"}
        </p>
      </div>
    </div>
  );
}

// --- Chat Modal Component ---

interface Message {
  role: 'user' | 'bot';
  text: string;
}

function ChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '您好！我是您的旅遊 AI 助手。有任何關於越南、日本、泰國或韓國的旅遊問題都可以問我喔！' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMsg,
        config: {
          systemInstruction: "你是一位專業的旅遊助手，擅長回答關於越南、日本、泰國、韓國的旅遊資訊。請用繁體中文回答，語氣親切且專業。如果問題與旅遊無關，請禮貌地引導回旅遊話題。",
        }
      });

      const botText = response.text || '抱歉，我現在無法回答這個問題。';
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: '抱歉，連線發生錯誤，請稍後再試。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-white w-full max-w-md h-[80vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-2xl">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">即時問答助手</h3>
                  <p className="text-blue-100 text-[10px]">Powered by Gemini AI</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 shadow-sm'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 shadow-sm rounded-tl-none'}`}>
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center bg-white p-4 rounded-2xl shadow-sm rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="輸入您的旅遊問題..."
                  className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-3.5 rounded-2xl transition-all ${!input.trim() || isLoading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95'}`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Main App ---

interface CountryModuleProps {
  country: 'vietnam' | 'japan' | 'thailand' | 'korea';
}

function CountryModule({ country }: CountryModuleProps) {
  const [activeTab, setActiveTab] = useState<'converter' | 'phrases' | 'tipping' | 'explore'>('converter');
  const [exchangeRate, setExchangeRate] = useState<number>(country === 'vietnam' ? FALLBACK_EXCHANGE_RATE : (country === 'japan' ? 4.5 : (country === 'thailand' ? 1.1 : 40)));
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(true);

  const config = {
    vietnam: {
      name: '越南',
      subTitle: 'Xin chào! 你的隨身口袋導遊',
      currencyName: 'VND',
      currencySymbol: '₫',
      phrases: PHRASES_VN,
      tips: TIPS_VN,
      regionalData: REGIONAL_DATA_VN,
      targetLang: 'vi',
      translatorTitle: '中翻越',
      themeColor: 'bg-emerald-600',
      themeColorDark: 'bg-emerald-700/50',
      themeText: 'text-emerald-600',
      themeLight: 'bg-emerald-50',
      themeBorder: 'border-emerald-100',
      rateApi: 'https://open.er-api.com/v6/latest/TWD',
      rateKey: 'VND'
    },
    japan: {
      name: '日本',
      subTitle: 'こんにちは! 你的隨身口袋導遊',
      currencyName: 'JPY',
      currencySymbol: '¥',
      phrases: PHRASES_JP,
      tips: TIPS_JP,
      regionalData: REGIONAL_DATA_JP,
      targetLang: 'ja',
      translatorTitle: '中翻日',
      themeColor: 'bg-red-600',
      themeColorDark: 'bg-red-700/50',
      themeText: 'text-red-600',
      themeLight: 'bg-red-50',
      themeBorder: 'border-red-100',
      rateApi: 'https://open.er-api.com/v6/latest/TWD',
      rateKey: 'JPY'
    },
    thailand: {
      name: '泰國',
      subTitle: 'Sawasdee! 你的隨身口袋導遊',
      currencyName: 'THB',
      currencySymbol: '฿',
      phrases: PHRASES_TH,
      tips: TIPS_TH,
      regionalData: REGIONAL_DATA_TH,
      targetLang: 'th',
      translatorTitle: '中翻泰',
      themeColor: 'bg-blue-600',
      themeColorDark: 'bg-blue-700/50',
      themeText: 'text-blue-600',
      themeLight: 'bg-blue-50',
      themeBorder: 'border-blue-100',
      rateApi: 'https://open.er-api.com/v6/latest/TWD',
      rateKey: 'THB'
    },
    korea: {
      name: '韓國',
      subTitle: '안녕하세요! 你的隨身口袋導遊',
      currencyName: 'KRW',
      currencySymbol: '₩',
      phrases: PHRASES_KR,
      tips: TIPS_KR,
      regionalData: REGIONAL_DATA_KR,
      targetLang: 'ko',
      translatorTitle: '中翻韓',
      themeColor: 'bg-indigo-600',
      themeColorDark: 'bg-indigo-700/50',
      themeText: 'text-indigo-600',
      themeLight: 'bg-indigo-50',
      themeBorder: 'border-indigo-100',
      rateApi: 'https://open.er-api.com/v6/latest/TWD',
      rateKey: 'KRW'
    }
  }[country];

  useEffect(() => {
    const fetchRate = async () => {
      try {
        setIsLoadingRate(true);
        const res = await fetch(config.rateApi);
        const data = await res.json();
        if (data && data.rates && data.rates[config.rateKey]) {
          setExchangeRate(data.rates[config.rateKey]);
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
    const interval = setInterval(fetchRate, 3600000);
    return () => clearInterval(interval);
  }, [country, config.rateApi, config.rateKey]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <header className={`${config.themeColor} text-white pt-4 pb-3 px-6 rounded-b-[2rem] shadow-md z-10 shrink-0`}>
        <h1 className="text-xl font-bold tracking-tight">{config.name}</h1>
        <p className="text-white/80 text-[10px] font-medium">{config.subTitle}</p>
        
        <div className={`flex ${config.themeColorDark} rounded-xl p-1 mt-2 overflow-x-auto hide-scrollbar`}>
          <button onClick={() => setActiveTab('converter')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'converter' ? 'bg-white ' + config.themeText + ' shadow-sm' : 'text-white/80 hover:text-white'}`}><Calculator size={14} className="shrink-0"/> 換算</button>
          <button onClick={() => setActiveTab('phrases')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'phrases' ? 'bg-white ' + config.themeText + ' shadow-sm' : 'text-white/80 hover:text-white'}`}><MessageSquare size={14} className="shrink-0"/> {country === 'vietnam' ? '越語' : (country === 'japan' ? '日語' : (country === 'thailand' ? '泰語' : '韓語'))}</button>
          <button onClick={() => setActiveTab('tipping')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'tipping' ? 'bg-white ' + config.themeText + ' shadow-sm' : 'text-white/80 hover:text-white'}`}><Wallet size={14} className="shrink-0"/> 小費</button>
          <button onClick={() => setActiveTab('explore')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap ${activeTab === 'explore' ? 'bg-white ' + config.themeText + ' shadow-sm' : 'text-white/80 hover:text-white'}`}><Compass size={14} className="shrink-0"/> 周邊</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'converter' && (
            <motion.div key="converter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Converter 
                exchangeRate={exchangeRate} 
                lastUpdated={lastUpdated} 
                isLoadingRate={isLoadingRate} 
                regionalData={config.regionalData}
                currencySymbol={config.currencySymbol}
                currencyName={config.currencyName}
                country={country}
                themeText={config.themeText}
                themeBg={config.themeLight}
                themeBorder={config.themeBorder}
              />
            </motion.div>
          )}
          {activeTab === 'phrases' && (
            <motion.div key="phrases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <Phrasebook 
                phrases={config.phrases}
                targetLang={config.targetLang}
                translatorTitle={config.translatorTitle}
                countryName={config.name}
                themeText={config.themeText}
                themeBg={config.themeLight}
                themeBorder={config.themeBorder}
              />
            </motion.div>
          )}
          {activeTab === 'tipping' && (
            <motion.div key="tipping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <TippingGuide 
                tips={config.tips} 
                exchangeRate={exchangeRate} 
                currencyName={config.currencyName} 
                themeText={config.themeText} 
                themeBg={config.themeLight} 
                country={country}
              />
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

function HomeModule({ onNavigate }: { onNavigate: (tab: 'vietnam' | 'japan' | 'thailand' | 'korea') => void }) {
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="bg-blue-600 text-white pt-6 pb-4 px-6 rounded-b-[2rem] shadow-md z-10 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">旅遊助手</h1>
        <p className="text-blue-100 text-[10px] font-medium">選擇你的目的地，開始旅程</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <h2 className="text-base font-bold text-gray-900 mb-3">熱門目的地</h2>
        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => onNavigate('vietnam')}
            className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-4xl">🇻🇳</span>
            <span className="font-bold text-sm text-gray-800">越南</span>
          </div>
          <div 
            onClick={() => onNavigate('japan')}
            className="bg-white p-4 rounded-3xl shadow-sm border border-red-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-red-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-4xl">🇯🇵</span>
            <span className="font-bold text-sm text-gray-800">日本</span>
          </div>
          <div 
            onClick={() => onNavigate('thailand')}
            className="bg-white p-4 rounded-3xl shadow-sm border border-blue-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-4xl">🇹🇭</span>
            <span className="font-bold text-sm text-gray-800">泰國</span>
          </div>
          <div 
            onClick={() => onNavigate('korea')}
            className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-95"
          >
            <span className="text-4xl">🇰🇷</span>
            <span className="font-bold text-sm text-gray-800">韓國</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mainTab, setMainTab] = useState<'home' | 'vietnam' | 'japan' | 'thailand' | 'korea'>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);

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
          {(mainTab === 'vietnam' || mainTab === 'japan' || mainTab === 'thailand' || mainTab === 'korea') && (
            <motion.div key={mainTab} className="absolute inset-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <CountryModule country={mainTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chat Modal */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Global Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 pb-2 pt-1 absolute bottom-0 w-full rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <div className="flex justify-around items-center px-6 py-0.5">
          <button
            onClick={() => setMainTab('home')}
            className={`flex flex-col items-center justify-center w-full h-12 rounded-2xl transition-all ${
              mainTab === 'home' ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-xl mb-0.5 ${mainTab === 'home' ? 'bg-blue-50' : ''}`}>
              <Home size={20} strokeWidth={mainTab === 'home' ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-bold">首頁</span>
          </button>

          <button
            onClick={() => setIsChatOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-12 rounded-2xl transition-all text-gray-400 hover:text-gray-600`}
          >
            <div className={`p-1 rounded-xl mb-0.5`}>
              <MessageCircle size={20} />
            </div>
            <span className="text-[9px] font-bold">即時問答</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

