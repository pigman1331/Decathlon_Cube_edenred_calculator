# 內湖二手市集盤點 app

- `index.html`：手機掃描＋核對＋填單（GitHub Pages 開啟）
- `bookmark.html`：安裝「抓未售清單」書籤（電腦 Chrome）
- `Code.gs`：多機同步後端，貼到 Google Apps Script 部署

## 設定多機同步（約 5 分鐘，一次就好）
1. 開 https://script.google.com → 新專案，貼上 `Code.gs` 全部內容，存檔。
2. 上方函式選 `setup` → 執行 → 依提示授權（會建立試算表與照片資料夾）。
3. 部署 → 新增部署作業 → 齒輪選「網頁應用程式」→ 執行身分「我」、存取權「任何人」→ 部署 → 複製網址（…/exec）。
4. 手機開 app →「紀錄」頁 → 貼上同步網址 → 儲存並連線 → 按「複製給組員的開啟連結」，貼到 LINE 群組。

## 目前的同步網址（已內建在 index.html）
https://script.google.com/macros/s/AKfycbyEGYTTHn7VRPRK6ko3ej1ZWZkM00ua_HteHgEbgtbokhqHACnpLxu5YDfFTjQkUWdyAQ/exec

掃描紀錄試算表：https://docs.google.com/spreadsheets/d/1aOnDmbzLhmxCAjAhsCvpVx3NJNkFDrLX0OULbAyR1rM/edit
