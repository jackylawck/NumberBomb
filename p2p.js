/* =========================================================================
 * 📡 p2p.js - 零信任生產級通訊層 (Zero-Trust & High Resilience)
 * ========================================================================= */
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceCandidatePoolSize: 4
  }
};

const MAX_PARTICIPANTS = 20;

let peer = null;
let hostConn = null;
let clients = {}; // { [peerId]: conn }
let processedMsgIds = new Set();
let clientSeq = 0;
let wakeLock = null;
let isHost = false;

const offlineQueue = [];
let lastPingReceivedTs = Date.now();
let heartbeatInterval = null;
let watchdogInterval = null;

let reconnectAttempts = 0;
const MAX_RECONNECT = 8;
let reconnectTimer = null;

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.warn('[WakeLock]', err);
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    if (isHost) await acquireWakeLock();
    flushOfflineQueue();
  }
});

function initHostPeer(roomId, onDataReceived, onCountChanged, onClientDisconnected, onError) {
  isHost = true;
  acquireWakeLock();

  // 清除任何殘留舊實例
  if (peer && !peer.destroyed) {
    try { peer.destroy(); } catch (e) {}
  }
  clearInterval(heartbeatInterval);
  clients = {};

  peer = new Peer(`nbomb-${roomId}`, PEER_CONFIG);

  // 🛡️ 關鍵防線 3：Host 報錯時執行全量清理，杜絕 WebSocket 殘留
  peer.on('error', (err) => {
    console.error('[Host Peer Error]', err);
    clearInterval(heartbeatInterval);
    if (peer && !peer.destroyed) {
      try { peer.destroy(); } catch (e) {}
    }
    peer = null;
    clients = {};
    if (onError) onError(err);
  });

  peer.on('connection', (conn) => {
    conn.on('data', (data) => {
      if (data && data.type === 'CLIENT_PONG') {
        if (conn._token) conn._lastSeen = Date.now();
        return;
      }

      if (data && data.msgId) {
        if (processedMsgIds.has(data.msgId)) return;
        processedMsgIds.add(data.msgId);
        if (processedMsgIds.size > 1000) {
          const oldest = processedMsgIds.values().next().value;
          processedMsgIds.delete(oldest);
        }
      }

      if (data.type === 'CLIENT_JOIN') {
        const { token } = data;
        Object.keys(clients).forEach((pId) => {
          if (clients[pId]._token === token && pId !== conn.peer) {
            try { clients[pId].close(); } catch (e) {}
            delete clients[pId];
          }
        });

        conn._token = token;
        conn._lastSeen = Date.now();
        clients[conn.peer] = conn;
        if (onCountChanged) onCountChanged(Object.keys(clients).length);
      }

      if (onDataReceived) onDataReceived(data, conn);
    });

    conn.on('close', () => {
      if (clients[conn.peer] === conn) {
        const token = conn._token || conn.peer;
        delete clients[conn.peer];
        if (onClientDisconnected) onClientDisconnected(token);
        if (onCountChanged) onCountChanged(Object.keys(clients).length);
      }
    });
  });

  clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    broadcastToAll({ type: 'HOST_PING', ts: now });
    Object.keys(clients).forEach((pId) => {
      const conn = clients[pId];
      if (conn._lastSeen && (now - conn._lastSeen > 10000)) {
        const token = conn._token;
        try { conn.close(); } catch (e) {}
        delete clients[pId];
        if (onClientDisconnected) onClientDisconnected(token);
        if (onCountChanged) onCountChanged(Object.keys(clients).length);
      }
    });
  }, 3000);
}

async function initClientPeer(roomId, clientInfo, callbacks) {
  isHost = false;

  if (peer && !peer.destroyed) {
    await new Promise((resolve) => {
      peer.once('close', resolve);
      peer.destroy();
      setTimeout(resolve, 800);
    });
  }

  peer = new Peer(PEER_CONFIG);

  peer.on('open', () => {
    hostConn = peer.connect(`nbomb-${roomId}`, { reliable: true });

    hostConn.on('open', () => {
      const wasReconnect = reconnectAttempts > 0;
      reconnectAttempts = 0;
      lastPingReceivedTs = Date.now();

      sendToHost({
        type: 'CLIENT_JOIN',
        token: clientInfo.token,
        name: clientInfo.name,
        lang: clientInfo.lang,
        isReconnect: wasReconnect
      });

      flushOfflineQueue();
      if (callbacks.onConnected) callbacks.onConnected();
    });

    hostConn.on('data', (data) => {
      if (data.type === 'HOST_PING') {
        lastPingReceivedTs = Date.now();
        if (hostConn && hostConn.open) {
          hostConn.send({ type: 'CLIENT_PONG' });
        }
        return;
      }
      if (callbacks.onDataReceived) callbacks.onDataReceived(data);
    });

    hostConn.on('close', () => {
      triggerReconnect(roomId, clientInfo, callbacks);
    });
  });

  // 🛡️ 關鍵防線 4：區分不可恢復錯誤，立刻中斷重連
  peer.on('error', (err) => {
    console.warn('[Client Peer Error]', err.type, err);
    if (err.type === 'peer-unavailable' || err.type === 'unavailable-id') {
      if (peer && !peer.destroyed) {
        try { peer.destroy(); } catch (e) {}
      }
      clearTimeout(reconnectTimer);
      if (callbacks.onError) callbacks.onError({ type: 'INVALID_ROOM' });
      return;
    }
    triggerReconnect(roomId, clientInfo, callbacks);
  });

  clearInterval(watchdogInterval);
  watchdogInterval = setInterval(() => {
    if (Date.now() - lastPingReceivedTs > 9000 && hostConn?.open) {
      console.warn('[Watchdog] 9秒未收到 Host 心跳，觸發重連');
      try { hostConn.close(); } catch (e) {}
    }
  }, 3000);
}

function triggerReconnect(roomId, clientInfo, callbacks) {
  if (reconnectAttempts >= MAX_RECONNECT) {
    if (callbacks.onError) callbacks.onError({ type: 'GIVE_UP' });
    return;
  }
  clearTimeout(reconnectTimer);
  const delay = Math.min(1000 * Math.pow(1.6, reconnectAttempts), 12000);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    initClientPeer(roomId, clientInfo, callbacks);
  }, delay);
}

function sendToHost(payload) {
  payload.msgId = payload.msgId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  payload.seq = ++clientSeq;

  if (!hostConn || !hostConn.open) {
    if (offlineQueue.length < 20) offlineQueue.push(payload);
    return false;
  }
  try {
    hostConn.send(payload);
    return true;
  } catch (err) {
    offlineQueue.push(payload);
    return false;
  }
}

function flushOfflineQueue() {
  while (offlineQueue.length && hostConn?.open) {
    const item = offlineQueue.shift();
    try {
      hostConn.send(item);
    } catch (e) {
      offlineQueue.unshift(item);
      break;
    }
  }
}

function broadcastToAll(payload) {
  Object.values(clients).forEach((conn) => {
    if (conn && conn.open) {
      try { conn.send(payload); } catch (e) {}
    }
  });
}

function resetPeerRoundState() {
  processedMsgIds.clear();
  clientSeq = 0;
}
