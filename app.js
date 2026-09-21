/* =========================================================================
 * 🎮 app.js - 核心路由、單機運作與線上協調器 (100 / 100 Production Final)
 * ========================================================================= */

function generateSecureToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return 'tok_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSecureRoomId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toLowerCase();
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

const App = {
  lang: localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
  screen: 'home',
  clientToken: localStorage.getItem('clientToken') || generateSecureToken(),
  currentReactionPhase: null,
  solo: { players: [], game: null, lastResult: null },
  online: {
    isHost: false,
    roomId: null,
    players: [],
    turnIndex: 0,
    range: [1, 100],
    targetNumber: null,
    isOver: false,
    isPlaying: false
  }
};
localStorage.setItem('clientToken', App.clientToken);

// Host 端每位玩家表情頻率防刷限制
const lastReactionTimeByToken = new Map();

// ---------------- i18n 渲染 ----------------
function applyI18n() {
  document.documentElement.lang = App.lang === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[App.lang] && I18N[App.lang][key]) {
      const val = I18N[App.lang][key];
      // 🛡️ 若內容包含 HTML 標籤（如 <strong>），使用 innerHTML 正常解析標籤，避免輸出字串原始碼
      if (val.includes('<')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh;
    if (I18N[App.lang] && I18N[App.lang][key]) {
      el.placeholder = I18N[App.lang][key];
    }
  });
  document.getElementById('langToggle').textContent = I18N[App.lang].lang_toggle;
}

document.getElementById('langToggle').addEventListener('click', () => {
  App.lang = App.lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lang', App.lang);
  applyI18n();
  if (App.screen === 'solo_pass') renderPassScreen();
  if (App.screen === 'solo_result') renderResultScreen();
});

// ---------------- 螢幕路由（徹底控制生命週期） ----------------
function goto(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.querySelector(`[data-screen="${screen}"]`);
  if (el) el.classList.add('active');
  App.screen = screen;

  // 🛡️ 關鍵防線 1：不依賴瀏覽器 blur，換頁直接強制收合頂部懸浮膠囊
  const rangeMini = document.getElementById('rangeMini');
  if (rangeMini && screen !== 'solo_input') {
    rangeMini.classList.remove('show');
  }

  if (screen === 'online_play') {
    App.currentReactionPhase = null;
  }
  // 進入單機輸入時重置所有可能殘留的壓力樣式
  if (screen === 'solo_input') {
    el.classList.remove('warn', 'danger', 'critical');
  }
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => goto(btn.dataset.goto));
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => goto(btn.dataset.back));
});

window.addEventListener('beforeunload', (e) => {
  if (App.online.isPlaying && !App.online.isOver) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------------- Web Audio 原生合成音效 ----------------
let audioCtx = null;
function ensureAudioUnlocked() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBoomSound() {
  try {
    ensureAudioUnlocked();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.7);
  } catch (e) {}
}

// 🛡️ 關鍵細節：進入必爆 critical 時的雙重低頻心跳重擊聲
function playHeartbeatWarning() {
  try {
    ensureAudioUnlocked();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------- 單一事實來源：嚴謹數字校驗 ----------------
function validateGuess(rawValue, range) {
  const trimmed = String(rawValue).trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) {
    return { valid: false, reason: 'not_integer' };
  }
  const val = Number(trimmed);
  if (!Number.isInteger(val)) {
    return { valid: false, reason: 'not_integer' };
  }
  if (val <= range[0] || val >= range[1]) {
    return { valid: false, reason: 'out_of_range' };
  }
  return { valid: true, value: val };
}

// ---------------- 動態三級張力分層 ----------------
function updateDangerLevel(range) {
  const screenEl = document.querySelector('[data-screen="solo_input"]');
  if (!screenEl) return;
  const diff = range[1] - range[0];
  screenEl.classList.remove('warn', 'danger', 'critical');

  if (diff <= 2) {
    // 唯一剩餘 1 個數字，下一手必爆！
    screenEl.classList.add('critical');
    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
    playHeartbeatWarning();
  } else if (diff <= 6) {
    screenEl.classList.add('danger');
  } else if (diff <= 12) {
    screenEl.classList.add('warn');
  }
}

// ---------------- 單機模式 (Pass & Play) ----------------
const nameInput = document.getElementById('soloNameInput');
const addBtn = document.getElementById('soloAddBtn');
const listEl = document.getElementById('soloPlayerList');
const hintEl = document.getElementById('soloSetupHint');
const startBtn = document.getElementById('soloStartBtn');

function renderPlayerList() {
  listEl.innerHTML = '';
  App.solo.players.forEach((name, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="num">${i + 1}</span>${escapeHtml(name)}</span><button class="del" data-idx="${i}">✕</button>`;
    listEl.appendChild(li);
  });
  listEl.querySelectorAll('.del').forEach((b) => {
    b.addEventListener('click', () => {
      App.solo.players.splice(Number(b.dataset.idx), 1);
      renderPlayerList();
      updateSetupHint();
    });
  });
}

function updateSetupHint() {
  const n = App.solo.players.length;
  hintEl.textContent = n === 1 ? I18N[App.lang].solo_need_two : '';
  startBtn.disabled = n < 2;
}

function addPlayer() {
  const name = nameInput.value.trim();
  if (!name || App.solo.players.length >= 8) return;
  App.solo.players.push(name);
  nameInput.value = '';
  renderPlayerList();
  updateSetupHint();
}
addBtn.addEventListener('click', addPlayer);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer(); });

startBtn.addEventListener('click', () => {
  ensureAudioUnlocked();
  App.solo.game = new LocalBombGame([...App.solo.players]);
  goto('solo_pass');
  renderPassScreen();
});

function renderPassScreen() {
  document.getElementById('passName').textContent = App.solo.game.getCurrentPlayer();
}
document.getElementById('passReadyBtn').addEventListener('click', () => {
  ensureAudioUnlocked();
  goto('solo_input');
  renderInputScreen();
});

function renderInputScreen() {
  const g = App.solo.game;
  const rangeStr = `${g.range[0]} ~ ${g.range[1]}`;

  document.getElementById('inputWhoTurn').textContent = `${I18N[App.lang].input_your_turn} · ${g.getCurrentPlayer()}`;
  document.getElementById('inputRange').textContent = rangeStr;

  const rangeMini = document.getElementById('rangeMini');
  if (rangeMini) rangeMini.textContent = rangeStr;

  updateDangerLevel(g.range);

  const inp = document.getElementById('soloGuessInput');
  inp.value = '';
  inp.classList.remove('in-range', 'out-of-range');
  inp.focus();
  document.getElementById('inputError').textContent = '';
}

const soloInp = document.getElementById('soloGuessInput');
const rangeMiniEl = document.getElementById('rangeMini');

soloInp.addEventListener('focus', () => rangeMiniEl && rangeMiniEl.classList.add('show'));
soloInp.addEventListener('blur', () => rangeMiniEl && rangeMiniEl.classList.remove('show'));

// 🛡️ 關鍵防線 2：輸入時不嘮叨整數報錯，但純數字超界時精準提示
soloInp.addEventListener('input', (e) => {
  const g = App.solo.game;
  const inp = e.target;
  const errEl = document.getElementById('inputError');
  const [min, max] = g.range;

  inp.classList.remove('in-range', 'out-of-range');
  errEl.textContent = '';

  const raw = e.target.value;
  if (!raw) return;

  const result = validateGuess(raw, g.range);
  if (result.valid) {
    inp.classList.add('in-range');
  } else {
    inp.classList.add('out-of-range');
    // 只有在打完純數字卻超界時才給即時輔助文字，打字中途不噴雜訊
    if (result.reason === 'out_of_range' && /^\d+$/.test(raw.trim())) {
      errEl.textContent = t('err_out_of_range', App.lang, { min: min + 1, max: max - 1 });
    }
  }
});

document.getElementById('soloSubmitBtn').addEventListener('click', handleSoloSubmit);
soloInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSoloSubmit(); });

function handleSoloSubmit() {
  const g = App.solo.game;
  const raw = soloInp.value;
  const errEl = document.getElementById('inputError');
  const [min, max] = g.range;

  const check = validateGuess(raw, g.range);

  if (!check.valid) {
    if (check.reason === 'not_integer') {
      errEl.textContent = I18N[App.lang].err_not_a_number;
    } else {
      errEl.textContent = t('err_out_of_range', App.lang, { min: min + 1, max: max - 1 });
    }
    return;
  }

  const result = g.submitGuess(check.value);
  if (result.boom) {
    showBoom(result.loser, result.number);
  } else {
    App.solo.lastResult = result;
    goto('solo_result');
    renderResultScreen();
    if (navigator.vibrate) navigator.vibrate(35);
  }
}

function renderResultScreen() {
  const r = App.solo.lastResult;
  document.getElementById('resultTitle').textContent = I18N[App.lang].result_safe;
  document.getElementById('resultRange').textContent = `${r.nextRange[0]} ~ ${r.nextRange[1]}`;
  document.getElementById('resultNextName').textContent = r.nextPlayer;
}
document.getElementById('resultContinueBtn').addEventListener('click', () => {
  goto('solo_pass');
  renderPassScreen();
});

function showBoom(loser, number) {
  const penalty = PENALTY_POOL[Math.floor(Math.random() * PENALTY_POOL.length)];
  document.getElementById('boomLoser').textContent = loser;
  document.getElementById('boomNumber').textContent = number;
  document.getElementById('boomPenalty').textContent = penalty[App.lang];
  goto('solo_boom');
  playBoomSound();
  if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 300]);
}
document.getElementById('boomNextBtn').addEventListener('click', () => {
  App.solo.game = new LocalBombGame([...App.solo.players]);
  goto('solo_pass');
  renderPassScreen();
});

// ---------------- 線上模式：Host 端 ----------------
document.getElementById('btnGoHost').addEventListener('click', () => {
  ensureAudioUnlocked();
  App.online.isHost = true;
  App.online.roomId = generateSecureRoomId();
  document.getElementById('hostRoomCode').textContent = App.online.roomId;

  document.getElementById('hostQrcode').innerHTML = '';
  new QRCode(document.getElementById('hostQrcode'), {
    text: `${window.location.origin}${window.location.pathname}?room=${App.online.roomId}`,
    width: 160, height: 160
  });

  lastReactionTimeByToken.clear();
  initHostPeer(
    App.online.roomId,
    onHostReceivedData,
    onHostCountChanged,
    onHostClientDisconnected,
    (err) => {
      if (err.type === 'unavailable-id') {
        showToast('房號衝突，請重新開房');
      } else {
        showToast('信令連線異常，請重試');
      }
      App.online.players = [];
      goto('online_choice');
    }
  );
  goto('online_host');
});

function onHostCountChanged(count) {
  document.getElementById('hostPlayerCountBadge').textContent = `👥 ${count} / 20`;
}

function onHostClientDisconnected(token) {
  const p = App.online.players.find((x) => x.token === token);
  if (p) {
    p.isOnline = false;
    renderHostPlayers();
    const curr = App.online.players[App.online.turnIndex];
    if (curr && curr.token === token && App.online.isPlaying && !App.online.isOver) {
      const ok = advanceTurn();
      if (ok) {
        updateHostGameBoard();
        syncOnlineGameState();
      }
    }
  }
}

function buildCurrentStatePayload() {
  const curr = App.online.players[App.online.turnIndex];
  return {
    type: 'SYNC_STATE',
    range: App.online.range,
    currentTurnToken: curr ? curr.token : null,
    currentTurnName: curr ? curr.name : null,
    isPlaying: App.online.isPlaying
  };
}

function onHostReceivedData(data, conn) {
  if (data.type === 'CLIENT_JOIN') {
    let p = App.online.players.find((x) => x.token === data.token);
    if (!p && App.online.players.length >= 20) {
      conn.send({ type: 'ROOM_FULL' });
      return;
    }

    if (p) {
      p.isOnline = true;
      p.name = data.name;
    } else {
      App.online.players.push({ token: data.token, name: data.name, isOnline: true });
    }
    renderHostPlayers();

    const snapshot = buildCurrentStatePayload();
    if (conn.open) conn.send(snapshot);
    broadcastToAll(snapshot);
  }

  // 型別安全過濾
  if (data.type === 'SUBMIT_GUESS') {
    const raw = Number(data.value);
    if (!Number.isInteger(raw)) return;
    if (raw < 0 || raw > 10000) return;
    handleOnlineGuess(raw, conn._token);
  }

  // 硬性速率限制、白名單與權威反查
  if (data.type === 'REACTION') {
    const t = conn._token;
    if (!t) return;
    const now = Date.now();
    const last = lastReactionTimeByToken.get(t) || 0;
    if (now - last < 1500) return;
    lastReactionTimeByToken.set(t, now);

    const allowedEmojis = new Set(Object.values(REACTIONS).map((r) => r.emoji));
    if (!allowedEmojis.has(data.emoji)) return;

    const p = App.online.players.find((x) => x.token === t);
    if (!p) return;

    spawnReactionBubble(data.emoji, p.name);
  }
}

function renderHostPlayers() {
  const ul = document.getElementById('hostPlayerList');
  ul.innerHTML = '';
  App.online.players.forEach((p, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="num">${idx + 1}</span>${escapeHtml(p.name)}</span> <span>${p.isOnline ? '🟢' : '⚪'}</span>`;
    ul.appendChild(li);
  });
}

document.getElementById('hostStartGameBtn').addEventListener('click', startOnlineRound);

function startOnlineRound() {
  if (App.online.players.length === 0) return;
  resetPeerRoundState();

  const customVal = Number(document.getElementById('hostCustomBomb').value);
  App.online.targetNumber = (Number.isInteger(customVal) && customVal >= 2 && customVal <= 99) 
    ? customVal 
    : (Math.floor(Math.random() * 98) + 2);
  App.online.range = [1, 100];
  App.online.turnIndex = 0;
  App.online.isOver = false;
  App.online.isPlaying = true;

  if (!App.online.players[0].isOnline) {
    if (!advanceTurn()) return;
  }

  document.getElementById('hostLobby').style.display = 'none';
  document.getElementById('hostGameBoard').style.display = 'block';

  updateHostGameBoard();
  syncOnlineGameState();
  goto('online_host');
}

function advanceTurn() {
  const total = App.online.players.length;
  if (total === 0) return false;
  for (let i = 0; i < total; i++) {
    App.online.turnIndex = (App.online.turnIndex + 1) % total;
    if (App.online.players[App.online.turnIndex].isOnline) {
      return true;
    }
  }
  App.online.isPlaying = false;
  broadcastToAll({ type: 'GAME_STALLED' });
  showToast(I18N[App.lang].game_stalled);
  return false;
}

function updateHostGameBoard() {
  document.getElementById('hostRangeDisplay').textContent = `${App.online.range[0]} ~ ${App.online.range[1]}`;
  const curr = App.online.players[App.online.turnIndex];
  document.getElementById('hostCurrentTurnName').textContent = curr ? curr.name : '---';
}

function handleOnlineGuess(val, senderToken = null) {
  const [min, max] = App.online.range;
  if (val <= min || val >= max || App.online.isOver) return;

  const curr = App.online.players[App.online.turnIndex];

  if (senderToken !== null && (!curr || curr.token !== senderToken)) {
    console.warn('[Security] 阻斷非當前回合者的作答請求，Token:', senderToken);
    return;
  }

  if (val === App.online.targetNumber) {
    App.online.isOver = true;
    App.online.isPlaying = false;
    const loser = curr;
    const penalty = PENALTY_POOL[Math.floor(Math.random() * PENALTY_POOL.length)];
    
    broadcastToAll({
      type: 'BOOM',
      loserName: loser.name,
      number: App.online.targetNumber,
      penalty: penalty
    });
    
    showOnlineBoom(loser.name, App.online.targetNumber, penalty);
    return;
  }

  if (val > App.online.targetNumber) App.online.range[1] = val;
  else App.online.range[0] = val;

  const ok = advanceTurn();
  if (ok) {
    updateHostGameBoard();
    syncOnlineGameState();
  }
}

function syncOnlineGameState() {
  broadcastToAll(buildCurrentStatePayload());
}

function showOnlineBoom(loserName, number, penalty) {
  document.getElementById('onlineBoomLoser').textContent = loserName;
  document.getElementById('onlineBoomNumber').textContent = number;
  document.getElementById('onlineBoomPenalty').textContent = penalty[App.lang];

  if (App.online.isHost) {
    document.getElementById('onlineBoomHostControls').style.display = 'block';
    document.getElementById('onlineBoomClientWaiting').style.display = 'none';
  } else {
    document.getElementById('onlineBoomHostControls').style.display = 'none';
    document.getElementById('onlineBoomClientWaiting').style.display = 'block';
  }

  goto('online_boom');
  playBoomSound();
  if (navigator.vibrate) navigator.vibrate([100, 50, 200, 50, 300]);
}

document.getElementById('onlineHostNextRoundBtn').addEventListener('click', () => {
  startOnlineRound();
});

const proxyModal = document.getElementById('proxyModal');
document.getElementById('hostOverrideBtn').addEventListener('click', () => {
  document.getElementById('proxyRangeHint').textContent = `${App.online.range[0]} ~ ${App.online.range[1]}`;
  document.getElementById('proxyModalInput').value = '';
  proxyModal.style.display = 'flex';
  document.getElementById('proxyModalInput').focus();
});
document.getElementById('proxyModalCancel').addEventListener('click', () => {
  proxyModal.style.display = 'none';
});
document.getElementById('proxyModalSubmit').addEventListener('click', () => {
  const v = Number(document.getElementById('proxyModalInput').value.trim());
  if (Number.isInteger(v)) {
    handleOnlineGuess(v, null);
    proxyModal.style.display = 'none';
  }
});

document.getElementById('hostSkipBtn').addEventListener('click', () => {
  const ok = advanceTurn();
  if (ok) {
    updateHostGameBoard();
    syncOnlineGameState();
  }
});

// ---------------- 線上模式：Client 端 ----------------
document.getElementById('btnGoClient').addEventListener('click', () => {
  ensureAudioUnlocked();
  goto('online_join');
});

document.getElementById('joinConnectBtn').addEventListener('click', () => {
  const code = document.getElementById('joinRoomCodeInput').value.trim().toLowerCase();
  const name = document.getElementById('joinNameInput').value.trim();
  if (!code || !name) return;

  initClientPeer(code, { token: App.clientToken, name, lang: App.lang }, {
    onConnected: () => {
      goto('online_play');
      renderReactions('WAITING');
    },
    onDataReceived: (data) => {
      if (data.type === 'ROOM_FULL') {
        showToast(I18N[App.lang].alert_room_full);
        goto('home');
        return;
      }

      if (data.type === 'GAME_STALLED') {
        showToast(I18N[App.lang].game_stalled);
        return;
      }

      if (data.type === 'SYNC_STATE') {
        if (App.screen === 'online_boom' && data.isPlaying) {
          goto('online_play');
        }
        document.getElementById('clientRangeDisplay').textContent = `${data.range[0]} ~ ${data.range[1]}`;
        const isMyTurn = data.currentTurnToken === App.clientToken;
        document.getElementById('clientInputArea').style.display = isMyTurn ? 'block' : 'none';
        document.getElementById('clientTurnStatus').textContent = isMyTurn
          ? I18N[App.lang].your_turn_now
          : t('waiting_turn', App.lang, { name: data.currentTurnName || '' });

        const span = data.range[1] - data.range[0];
        renderReactions(span <= 10 ? 'CLOSE_RANGE' : 'WAITING');
      }

      if (data.type === 'BOOM') {
        renderReactions('BOOM');
        showOnlineBoom(data.loserName, data.number, data.penalty);
      }
    },
    onError: (err) => {
      if (err.type === 'GIVE_UP') {
        showToast(I18N[App.lang].host_disconnected);
        goto('home');
      } else if (err.type === 'INVALID_ROOM') {
        showToast(I18N[App.lang].invalid_room);
        goto('online_join');
      }
    }
  });
});

document.getElementById('clientSubmitBtn').addEventListener('click', () => {
  const inp = document.getElementById('clientGuessInput');
  const val = Number(inp.value.trim());
  if (Number.isInteger(val)) {
    sendToHost({ type: 'SUBMIT_GUESS', value: val });
    inp.value = '';
  }
});

// ---------------- 表情與氣泡 ----------------
function renderReactions(phase) {
  if (App.currentReactionPhase === phase) return;
  App.currentReactionPhase = phase;

  const bar = document.getElementById('reactionBar');
  bar.innerHTML = '';
  const list = REACTION_PHASES[phase] || REACTION_PHASES.WAITING;
  list.forEach((key) => {
    const r = REACTIONS[key];
    const btn = document.createElement('button');
    btn.className = 'reaction-btn';
    btn.textContent = `${r.emoji} ${r[App.lang]}`;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      setTimeout(() => (btn.disabled = false), 2000);
      sendToHost({
        type: 'REACTION',
        emoji: r.emoji
      });
      const myName = document.getElementById('joinNameInput').value.trim();
      spawnReactionBubble(r.emoji, myName);
    });
    bar.appendChild(btn);
  });
}

function spawnReactionBubble(emoji, name) {
  const layer = document.getElementById('reactionLayer');
  const el = document.createElement('div');
  el.className = 'reaction-bubble';
  el.textContent = `${emoji} ${name}`;
  el.style.left = `${10 + Math.random() * 75}%`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---------------- 初始化 ----------------
applyI18n();

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
  document.getElementById('joinRoomCodeInput').value = roomParam.toLowerCase();
  goto('online_join');
}

// ---------------- PWA 安裝至手機主畫面支援 ----------------
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (App.screen === 'home') {
    setTimeout(() => {
      showToast(App.lang === 'zh' ? '💡 點擊瀏覽器選單可「新增至主畫面」' : '💡 Tap menu to "Add to Home Screen"');
    }, 2000);
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  showToast(App.lang === 'zh' ? '🎉 已成功安裝至手機主畫面！' : '🎉 Successfully added to Home Screen!');
});

// ---------------- 🛡️ 隱私與合規彈窗開關 (Trust & Governance Modal) ----------------
const complianceModal = document.getElementById('complianceModal');
const complianceToggle = document.getElementById('complianceToggle');
const complianceCloseBtn = document.getElementById('complianceCloseBtn');

if (complianceToggle && complianceModal) {
  complianceToggle.addEventListener('click', () => {
    complianceModal.style.display = 'flex';
  });
}
if (complianceCloseBtn && complianceModal) {
  complianceCloseBtn.addEventListener('click', () => {
    complianceModal.style.display = 'none';
  });
}
if (complianceModal) {
  complianceModal.addEventListener('click', (e) => {
    if (e.target === complianceModal) {
      complianceModal.style.display = 'none';
    }
  });
}
