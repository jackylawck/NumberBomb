# Privacy Policy & Data Governance Statement
# 隱私政策與資料治理合規聲明

Last Updated: September 2026 / 最後更新日期：2026 年 9 月

---

## English

### 1. Privacy-by-Design Architecture & Data Minimization
"Number Bomb" (the "Application") is engineered under strict **Privacy-by-Design** and **Data Minimization** principles (aligned with ISO/IEC 27001, ISO/IEC 27701, and General Data Protection Principles):
- **Zero Central Server Collection**: The Application does not maintain any centralized backend server or external database. No user accounts, passwords, biometric data, or telemetry logs are collected or stored remotely.
- **Local Ephemeral Data**: Player nicknames and temporary connection tokens (`clientToken`) are processed strictly within client-side memory (RAM) and the local browser storage (`localStorage`). You can wipe this data at any time by clearing your browser cache.
- **P2P Telemetry**: Multiplayer connectivity operates via WebRTC Peer-to-Peer protocols. Game states (guesses, range transitions, reactions) are transmitted directly between the Host and Client browsers.

### 2. Regulatory & Governance Framework Applicability
- **EU AI Act & Global AI Governance**: This Application operates entirely on deterministic algorithms and fixed logic. It **does not utilize Artificial Intelligence (AI), Machine Learning (ML), or automated profiling systems**. Therefore, regulations governing AI systems (such as the EU Artificial Intelligence Act, ISO/IEC 42001, or GenAI provisions) are substantively non-applicable.
- **GDPR (EU) & PDPO (Hong Kong Cap. 486)**: Because no personally identifiable data (PII) is gathered or controlled on a central server, the developer does not act as a Data Controller or Data Processor.
- **Third-Party CDN & WebRTC Infrastructure**:
  - WebRTC signaling and public STUN/TURN relays (e.g., PeerJS, Google STUN, Cloudflare STUN) route standard IP metadata solely to establish direct network handshakes. No payload game data is inspected or preserved by the developer.

### 3. Contact & Security Inquiries
For security disclosures, auditing queries, or governance inquiries, please open an issue in the official GitHub repository.

---

## 繁體中文

### 1. 隱私原生設計與資料最小化原則
「開口中・數字炸彈」（以下簡稱「本應用程式」）遵循 **從設計著手保護隱私（Privacy-by-Design）** 與 **資料最小化（Data Minimization）** 核心原則（符合 ISO/IEC 27001、ISO/IEC 27701 及國際個人資料保護原則）：
- **零伺服器儲存**：本應用程式為純靜態無伺服器（Serverless）架構，不具備任何集中式後端資料庫，亦不收集、不監控、不上傳任何使用者真實姓名、密碼、生物特徵或裝置遙測紀錄。
- **本地端資料留存**：玩家暱稱與連線識別碼（`clientToken`）僅暫存於使用者手機或瀏覽器本地儲存區（`localStorage`）與執行記憶體中。使用者可隨時透過清理瀏覽器快取將其徹底刪除。
- **點對點通訊傳輸**：線上連線模式透過 WebRTC P2P 協定實現，猜測數字、遊戲範圍與表情反饋皆直接於玩家與主持人間點對點傳遞，不經過開發者之伺服器。

### 2. 國際法規與 AI 治理適用性說明
- **歐盟 AI 法案（EU AI Act）與全球 AI 規範**：本應用程式之運算邏輯純屬確定性演算法（Deterministic State Machine），**完全不涉及人工智慧（AI）、機器學習（ML）或自動化個人特徵分析**。因此，歐盟 AI 法案、ISO/IEC 42001 等人工智慧監管架構於實質上不適用於本專案。
- **歐盟 GDPR 與香港《個人資料（私隱）條例》（第 486 章）**：由於本專案不於伺服端持有、處理或控制任何個人身分資料（PII），開發者不構成資料控制者（Data Controller）或資料處理者（Data Processor）。
- **第三方 CDN 與 WebRTC 基礎設施**：
  - 專案引用之開源 CDN（如 Cloudflare、unpkg）與公開 STUN/TURN 伺服器僅於連線初期協助網路穿透交換暫態 IP 封包，開發者無法亦不會窺探任何遊戲傳輸內容。

### 3. 聯絡與資訊安全反映
若有任何資安通報或治理合規疑問，歡迎透過官方 GitHub 儲存庫提交 Issue 反映。
