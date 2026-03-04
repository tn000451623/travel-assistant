# 旅遊助手 - Vercel 部署指南

這是一個使用 React + Vite 開發的單頁應用程式 (SPA)。

### 部署步驟

1. **上傳至 GitHub**：將所有程式碼推送到您的 GitHub 儲存庫。
2. **導入 Vercel**：
   - 登入 [Vercel](https://vercel.com/)。
   - 點擊 "Add New" -> "Project"。
   - 選擇您的 GitHub 儲存庫並點擊 "Import"。
3. **設定環境變數**：
   - 在部署設定頁面的 **Environment Variables** 區塊中，新增以下變數：
     - **Key**: `GEMINI_API_KEY`
     - **Value**: (您的 Gemini API 金鑰)
4. **部署**：點擊 "Deploy" 按鈕。

### 注意事項
- 本專案已包含 `vercel.json`，會自動處理 SPA 的路由問題（重新整理頁面不會出現 404）。
- 語音功能已預錄在 `src/tts_data.json` 中，若預錄語音不存在則會自動切換至瀏覽器 TTS。
