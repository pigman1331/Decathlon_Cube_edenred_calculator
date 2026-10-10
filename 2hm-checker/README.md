# 二手寄賣收件查詢

迪卡儂內湖店二手市集用：輸入關鍵字，查詢商品是否可以收件（可收／有條件／不可收）。

**線上使用：** https://pigman1331.github.io/Decathlon_Cube_edenred_calculator/2hm-checker/

## 更新收件標準

資料來源是 `2hm-checker/data/standards.csv`，欄位：

| 類別 | 品項 | 關鍵字 | 判定 | 條件說明 | 備註 |
|---|---|---|---|---|---|
| 自行車 | 公路車 | 單車 腳踏車 bike | 有條件 | 煞車、變速正常 | |

- **判定** 可填：可收／有條件／不可收（也接受 O、X、○、✕、不收…等寫法）
- **關鍵字** 用空白或頓號分隔，填同義詞、俗稱、英文，搜尋更容易命中

### 方法一：直接在網頁匯入（最快）
1. 打開網頁 → 最下方「資料管理」→「選擇檔案匯入」，選收件標準的 Excel 或 CSV
2. 系統會自動對應欄位（多張工作表會一起匯入，工作表名稱當類別）
3. 匯入只存在該裝置。按「下載 CSV」後，到 GitHub 把檔案覆蓋 `2hm-checker/data/standards.csv`，所有人就會看到新資料

### 方法二：直接在 GitHub 編輯
在 GitHub 打開 `2hm-checker/data/standards.csv` → 鉛筆圖示編輯 → Commit。
