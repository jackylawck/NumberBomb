# 開口中・數字炸彈 (Number Bomb) 💣

[English](#english) | [繁體中文](#繁體中文)

---

## 繁體中文

輕量級、極致現代感、零伺服器架構（Serverless）的實體聚會破冰遊戲。支援「單機傳機（Pass & Play）」與「多人線上 P2P（WebRTC PeerJS）」雙模式，開箱即用，純前端靜態部署，並具備完整 PWA 支援。

### 🌟 核心特色

- **雙模式運作**：
  - **單機傳機 (Pass & Play)**：2-8 人共用一部手機輪流輸入，內建交接防窺屏設計。
  - **多人線上 (Online P2P)**：支援 10-20 人大螢幕投屏開房，現場手機掃碼即入，無須安裝 App。
- **零信任邊界與高安全性**：
  - 伺服端 (Host) 嚴格鑑權：猜測操作 (`SUBMIT_GUESS`) 綁定連線 Token，阻絕越權與惡意 Console 注入。
  - 嚴格型別校驗：使用 `Number.isInteger()` 與範圍邊界守衛，防禦 NaN、字串隱式轉換及整數溢位。
  - 嚴密 CSP (內容安全政策)：阻絕未授權腳本注入與 CDN 投毒風險。
  - 表情防刷限制：Host 端硬性 1500ms 節流機制，白名單過濾，杜絕 DOM 炸彈攻擊 (DoS)。
- **極致連線韌性 (Resilient P2P)**：
  - 雙向心跳保活機制（Host PING ➔ Client PONG），主動剔除殭屍連線。
  - 指數退避演算法（Exponential Backoff）自動重連，並分流不可恢復之房號錯誤。
  - 滿房狀態優先保護老玩家斷線恢復，杜絕誤踢。
  - LRU 訊息去重隊列（上限 1000 筆），心跳封包跳過去重，防止長時運行之記憶體洩漏。
- **現代行動端體驗與張力設計**：
  - **三級緊張感分層**：隨剩餘數字收窄，輸入框呈現 `warn` ➜ `danger` ➜ `critical`（剩餘 1 數必爆）之動態急促紅光脈衝。
  - **行動鍵盤避讓膠囊**：iOS / Android 軟體鍵盤彈起時，頂部自動懸浮半透明範圍膠囊，確保操作不脫節。
  - **原生 Web Audio & 震動**：無依賴外部音檔，以 Oscillator 原生合成引爆音效與極限心跳重擊聲。
  - **PWA 主畫面安裝**：支援 iOS / Android 快速新增至手機主畫面，沉浸式全螢幕操作。
  - **全響應與雙語支援**：暗黑科技風格，支援繁體中文 / 英文一鍵切換。

---

### 📂 檔案架構

```text
NumberBomb/
├── .nojekyll                 # 關閉 GitHub Pages Jekyll 引擎
├── index.html                # 語意化結構、無阻塞 Toast 與安全 CSP 配置
├── styles.css                # 暗黑極簡主題、呼吸拉桿與三級張力脈衝動畫
├── app.js                    # 核心狀態機、生命週期控制與 PWA 安裝監聽
├── p2p.js                    # 零信任 WebRTC 通訊層 (心跳、去重、重連與清理)
├── localGame.js              # 單機傳機模式邏輯引擎
├── i18n.js                   # 雙語字典庫、破冰挑戰題庫與情緒語彙
├── manifest.json             # PWA 應用設定檔
├── NumberBomb192icon.png     # PWA 應用圖標 (192x192 簡約風格)
├── NumberBomb512icon.png     # PWA 開啟圖標 / 社交預覽圖 (512x512 高保真 3D)
├── PRIVACY_POLICY.md         # 隱私政策與資料治理合規聲明
├── TERMS_OF_USE.md           # 服務條款與免責聲明
└── README.md                 # 專案說明文件

```

---

### 🛡️ 資料治理與合規聲明 (Governance & Privacy)

本專案經過專業法規邊界評估，遵循 **從設計著手保護隱私（Privacy-by-Design）** 與 **資料最小化（Data Minimization）** 原則（符合 ISO/IEC 27001 資安與 ISO/IEC 27701 隱私保護標準）：

* **零伺服器儲存**：全靜態架構，無後端伺服器與資料庫，不收集、不保存任何使用者個人身分資料（PII）。符合歐盟 GDPR 與香港《個人資料（私隱）條例》（第 486 章）資料最小化原則。
* **AI 治理聲明**：本遊戲核心邏輯完全依賴確定性狀態機（Deterministic State Machine），**不包含任何機器學習（ML）或人工智慧（AI）推理系統**，依法明確排除歐盟人工智慧法案（EU AI Act）與 ISO/IEC 42001 之法定合規義務。
* **治理文件**：
* 詳閱 [隱私政策與資料治理合規聲明 (PRIVACY_POLICY.md)](https://www.google.com/search?q=PRIVACY_POLICY.md&utm_source=gemini)
* 詳閱 [服務條款與免責聲明 (TERMS_OF_USE.md)](https://www.google.com/search?q=TERMS_OF_USE.md&utm_source=gemini)



---

### 🚀 快速開始與部署

#### 1. 本機運行

因專案依賴 WebRTC 與模組化結構，建議透過靜態 HTTP 伺服器預覽：

```bash
# 使用 Python 快速啟動本地伺服器
python3 -m http.server 8000

```

在瀏覽器打開 `http://localhost:8000` 即可遊玩。

#### 2. 部署至 GitHub Pages

1. 將本專案推送到你的 GitHub Repository。
2. 進入專案 **Settings** > **Pages**。
3. 在 **Build and deployment** > **Branch** 選擇 `main`，資料夾選擇 `/(root)` 並點擊 **Save**。
4. 等候約 1 分鐘，即可透過 `https://<你的帳號>.github.io/<儲存庫名稱>/` 存取。

---

### 🌐 TURN 伺服器配置（企業內網環境）

在多數家用 Wi-Fi 與 4G/5G 環境下，預設的 STUN 伺服器即可完成 P2P 穿透。若需於企業內部網路（Symmetric NAT）確保 100% 連線穩定度，建議至 [Metered](https://www.metered.ca/stun-turn?utm_source=gemini) 註冊免費 TURN 憑證，並於 `p2p.js` 的 `PEER_CONFIG` 中填入帳密或串接 Serverless API。

---

## English

A lightweight, modern, and serverless icebreaker party game. Features both "Pass & Play" (single-device mode) and "Online P2P" (multi-device WebRTC mode powered by PeerJS). Completely static, PWA-ready, and deployable anywhere out-of-the-box.

### 🌟 Key Features

* **Dual Gameplay Modes**:
* **Pass & Play**: 2–8 players sharing a single device, equipped with an anti-peeking privacy turnover screen.
* **Multiplayer P2P**: Supports 10–20 players. The host projects a master board, and participants join instantly via QR code without installing any apps.


* **Zero-Trust Boundary & High Security**:
* **Strict Host-Side Authorization**: Guess submissions (`SUBMIT_GUESS`) require valid connection tokens matching the current active turn, preventing console exploits and race conditions.
* **Rigid Type Guards**: Implements `Number.isInteger()` and range-boundary validation to stop NaN, implicit string coercion, and integer overflow attacks.
* **Hardened CSP**: Content Security Policy configured without `'unsafe-inline'` scripts, mitigating CDN tampering and XSS risks.
* **Rate Limiting (Anti-DoS)**: Host enforces a 1500ms throttle and whitelist checks on live emoji reactions, protecting against DOM-flooding attacks.


* **Resilient WebRTC Networking**:
* Bidirectional PING/PONG heartbeats detect zombie and dead connections accurately.
* Exponential backoff reconnection algorithm with instant failure redirection for invalid room IDs.
* Reconnection preservation: Existing players disconnected on full rooms (20/20) are prioritized and restored smoothly.
* LRU message deduplication pool (capped at 1,000 items) bypasses heartbeat telemetry to eliminate long-term memory leaks.


* **Engineered UX & Pacing**:
* **Three-Tier Tension Pacing**: As the range narrows, the input dynamically transitions through `warn` ➜ `danger` ➜ `critical` (last-number sudden death) with visual, auditory, and haptic warnings.
* **Keyboard Avoidance Capsule**: When mobile virtual keyboards pop up on iOS/Android, a frosted floating capsule anchors the current safe range at the top.
* **Pure Web Audio & Haptics**: Uses browser Oscillators to synthesize explosion sounds and deep warning heartbeats with zero external asset dependencies.
* **PWA Installation**: Fully installable as a standalone app on iOS and Android home screens.
* **Full Localization**: Seamless toggle between Traditional Chinese (繁體中文) and English.



---

### 📂 Architecture

```text
NumberBomb/
├── .nojekyll                 # Disables Jekyll processing on GitHub Pages
├── index.html                # Semantic layout, non-blocking toast container, and CSP
├── styles.css                # Cyberpunk dark theme, breathing inputs, and tension animations
├── app.js                    # State machine, view routing, and PWA installation logic
├── p2p.js                    # Zero-trust WebRTC layer (heartbeat, deduplication, lifecycle)
├── localGame.js              # Core logic engine for Pass & Play mode
├── i18n.js                   # Multilingual dictionary, icebreaker prompts, and reaction sets
├── manifest.json             # PWA Web App Manifest
├── NumberBomb192icon.png     # App Launcher icon (192x192 minimalist style)
├── NumberBomb512icon.png     # Splash & Open Graph preview image (512x512 3D render)
├── PRIVACY_POLICY.md         # Privacy Policy & Data Governance Statement
├── TERMS_OF_USE.md           # Terms of Service & Disclaimer
└── README.md                 # Project documentation

```

---

### 🛡️ Governance, Privacy & Compliance

This application adheres to **Privacy-by-Design** and **Data Minimization** principles aligned with ISO/IEC 27001 and ISO/IEC 27701 standards:

* **Zero Database Persistence**: Purely client-side execution with no centralized database or logging. Compliant with EU GDPR and Hong Kong Personal Data (Privacy) Ordinance (Cap. 486) data minimization mandates.
* **AI Governance Exemption**: The system runs entirely on deterministic rules and random seeds. It **does not deploy Machine Learning (ML) or Artificial Intelligence (AI)**, formally exempting it from statutory obligations under the EU Artificial Intelligence Act and ISO/IEC 42001.
* **Governance Disclosures**:
* Read the [Privacy Policy & Data Governance Statement](https://www.google.com/search?q=PRIVACY_POLICY.md&utm_source=gemini)
* Read the [Terms of Service & Disclaimer](https://www.google.com/search?q=TERMS_OF_USE.md&utm_source=gemini)



---

### 🚀 Getting Started & Deployment

#### 1. Local Development

Serve the files using any lightweight static web server:

```bash
# Start a quick server with Python 3
python3 -m http.server 8000

```

Open `http://localhost:8000` in your browser.

#### 2. Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Branch**, select `main` and root `/(root)`, then click **Save**.
4. Within minutes, your game is live at `https://<your-username>.github.io/<repo-name>/`.

---

### 🌐 TURN Relay Configuration (Restricted Networks)

While default STUN servers provide reliable connectivity across 4G/5G and home Wi-Fi, restrictive corporate firewalls (Symmetric NAT) may block direct P2P connections. For 100% enterprise delivery, register for a free TURN tier on [Metered](https://www.metered.ca/stun-turn?utm_source=gemini) and add your credentials directly to `PEER_CONFIG` in `p2p.js` or via a serverless proxy.

---

### 📄 License

Distributed under the [MIT License](https://www.google.com/search?q=LICENSE&utm_source=gemini). Free for personal and commercial team-building events.

