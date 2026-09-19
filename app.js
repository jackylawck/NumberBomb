/* =========================================================================
 * 🎮 app.js - 核心路由、單機運作與線上協調器 (True Production Grade)
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

// Host 端每位玩家表情頻率鎖定容器
const lastReactionTimeByToken = new Map();

// ---------------- i18n 渲染 ----------------
function applyI18n() {
  document.documentElement.lang = App.lang === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[App.lang][key]) el.textContent = I18N[App.lang][key];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh;
    if (I18N[App.lang][key]) el.placeholder = I18N[App.lang][key];
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

// ---------------- 螢幕路由 ----------------
function goto(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.querySelector(`[data-screen="${screen}"]`);
  if (el) el.classList.add('active');
  App.screen = screen;
  if (screen === 'online_play') {
    App.currentReactionPhase = null;
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

// ---------------- Web Audio API ----------------
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------- 單機模式 ----------------
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
  document.getElementById('inputWhoTurn').textContent = `${I18N[App.lang].input_your_turn} · ${g.getCurrentPlayer()}`;
  document.getElementById('inputRange').textContent = `${g.range[0]} ~ ${g.range[1]}`;
  const inp = document.getElementById('soloGuessInput');
  inp.value = '';
  inp.focus();
  document.getElementById('inputError').textContent = '';
}

document.getElementById('soloSubmitBtn').addEventListener('click', handleSoloSubmit);
document.getElementById('soloGuessInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSoloSubmit(); });

function handleSoloSubmit() {
  const g = App.solo.game;
  const raw = document.getElementById('soloGuessInput').value.trim();
  const val = Number(raw);
  const [min, max] = g.range;

  if (!raw || !Number.isInteger(val)) {
    document.getElementById('inputError').textContent = I18N[App.lang].err_not_a_number;
    return;
  }
  if (val <= min || val >= max) {
    document.getElementById('inputError').textContent = t('err_out_of_range', App.lang, { min: min + 1, max: max - 1 });
    return;
  }

  const result = g.submitGuess(val);
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

  // 🛡️ 關鍵防線 1：型別驗證，嚴格要求為有限整數，防禦 NaN 與型別污染
  if (data.type === 'SUBMIT_GUESS') {
    const raw = Number(data.value);
    if (!Number.isInteger(raw)) return;
    if (raw < 0 || raw > 10000) return;
    handleOnlineGuess(raw, conn._token);
  }

  // 🛡️ 關鍵防線 2：Host 端硬性速率限制 + 白名單 + 名稱由 Host 權威反查
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

// ---------------- 啟動處理 ----------------
applyI18n();

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
  document.getElementById('joinRoomCodeInput').value = roomParam.toLowerCase();
  goto('online_join');
}
