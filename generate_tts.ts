import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";

async function generate() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const phrases = [
    { id: 1, vi: 'Không rau mùi' },
    { id: 2, vi: 'Không đá' },
    { id: 3, vi: 'Ít đường' },
    { id: 9, vi: 'Bao nhiêu tiền?' },
    { id: 4, vi: 'Mắc quá' },
    { id: 5, vi: 'Tính tiền' },
    { id: 6, vi: 'Xin chào' },
    { id: 7, vi: 'Cảm ơn' },
    { id: 10, vi: 'Nhà vệ sinh ở đâu?' },
    { id: 8, vi: 'Tôi muốn đến đây' },
  ];

  const ttsData: Record<string, string> = {};

  for (const phrase of phrases) {
    console.log(`Generating for: ${phrase.vi}`);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: phrase.vi }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        ttsData[phrase.id.toString()] = `data:audio/mp3;base64,${base64Audio}`;
      }
    } catch (e) {
      console.error(`Failed for ${phrase.vi}:`, e);
    }
  }

  fs.writeFileSync("./src/tts_data.json", JSON.stringify(ttsData, null, 2));
  console.log("Done!");
}

generate();
