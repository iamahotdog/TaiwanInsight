# 臺灣觀光戰情室：專業數據分析 (Taiwan Tourism Dashboard)

![Dashboard Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-2026.1-blue)

這是「交通部觀光署數據視覺化：臺灣觀光戰情室」的官方專案數據大屏。  
本視覺化大屏透過最新的觀光數據（2019 - 2026年），動態呈現了臺灣疫後觀光的復甦與成長狀態，旨在提供專業級的總體與客源地資料分析。

## 🌟 核心功能特點 (Key Features)

- **總體趨勢與復甦解析：** 動態呈現 2026 年度累計旅客數、全球復甦率與過往年度（尤其是疫情前 2019 年與高峰的 2025 年）之間的對比。
- **五大洲板塊深度分析：** 五大洲的復甦程度、區域成長動能以雷達圖與長條圖方式綜合解構。
- **核心市場排行榜：** 呈現歷年至今的精準客群（日、韓、港、美等）來臺人次與佔比。
- **歷年成長比對儀表板：** 包含歷年月份強弱走勢對比、客源市場最新的動態占比圓餅圖等。

## 📂 檔案結構 (Directory Structure)

- `index.html`：戰情室大屏主要介面。
- `style.css`：專業儀表板深色/霓虹高解析度版面樣式。
- `script.js`：圖表渲染（基於 `Chart.js`）、動態切換、KPI 動態計算之核心程式碼。
- `data.js`：最新的觀光來源資料包。
- `*.csv`：提供備份參照之原始 csv 表單。

## 🚀 部屬與執行 (Deployment & Run)

本專案全由純前端網頁語言（Vanilla HTML/CSS/JS）撰寫，**具有高度可攜性，無須後端建置即可運行**：
1. 下載或 Clone 本專案所有檔案。
2. 啟動本機端伺服器 (如 VS Code 的 Live Server)；或是直接將檔案拖曳上傳至 GitHub。
3. 若發布於 **GitHub Pages**，請在 Repository 中進入 `Settings > Pages`，將 `Branch` 設置為 `main` (或 `master`) 的根目錄（Root），儲存後即可獲得您的專屬網站連結。

---
*資料來源：交通部觀光署 來臺旅客按居住地統計*
