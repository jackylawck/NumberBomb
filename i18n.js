/* =========================================================================
 * 🌐 i18n.js - 雙語字典、破冰任務庫與情緒字典
 * ========================================================================= */
const I18N = {
  zh: {
    title: "開口中・數字炸彈",
    choose_mode: "選擇遊戲模式",
    solo_mode: "單機模式",
    solo_desc: "2-8 人 · 一部手機傳住玩",
    online_mode: "多人連線",
    online_desc: "10-20 人 · 各自手機掃碼",
    lang_toggle: "🌐 EN",

    solo_setup_title: "輸入玩家名稱",
    solo_setup_sub: "依序輸入，第 1 位先開始",
    solo_add: "加入",
    solo_start: "開始遊戲",
    solo_need_two: "至少需要 2 位玩家",
    solo_max: "單機模式上限 8 人",
    solo_player_ph: "輸入暱稱",

    pass_to: "請將手機傳給",
    pass_ready: "我準備好了 ✋",
    pass_tip: "其他人請勿偷看",

    input_your_turn: "輪到你了",
    input_range_now: "目前安全範圍",
    input_hint: "輸入整數",
    input_submit: "確認送出",

    result_safe: "✅ 安全！",
    result_range_shrunk: "範圍縮窄為",
    result_next_is: "下一位",
    result_continue: "繼續",

    boom_title: "💥 炸彈引爆！",
    boom_loser: "踩中炸彈的是",
    boom_number: "神秘數字",
    boom_penalty: "破冰任務",
    boom_next_round: "下一局",

    err_out_of_range: "必須在 {min} 與 {max} 之間！",
    err_not_a_number: "請輸入整數",

    host_mode: "主持遊戲",
    host_desc: "大螢幕 / 主持人控制台",
    client_mode: "加入遊戲",
    client_desc: "輸入房號加入",
    room_code: "房號",
    room_code_ph: "8位房號",
    join_room_title: "加入房間",
    btn_join: "連線進入",
    target_mode: "神秘數字設定",
    start_game: "開始遊戲",
    current_turn: "現正輪到",
    proxy_input: "代客輸入",
    skip_player: "跳過",
    waiting_turn: "等待 {name} 作答中...",
    your_turn_now: "輪到你作答！請輸入數字",
    waiting_host_restart: "等待主持人開啟下一局...",
    cancel: "取消",
    alert_room_full: "⚠️ 房間已滿員 (上限20人)！",
    host_disconnected: "⚠️ 主持人連線已中斷，請稍後重試。",
    game_stalled: "⚠️ 所有連線玩家皆已離線，遊戲暫停。",
    invalid_room: "⚠️ 找不到該房間，請確認房號是否正確。"
  },
  en: {
    title: "Number Bomb",
    choose_mode: "Choose Game Mode",
    solo_mode: "Pass & Play",
    solo_desc: "2-8 Players · Single Phone",
    online_mode: "Multiplayer",
    online_desc: "10-20 Players · Scan & Join",
    lang_toggle: "🌐 中文",

    solo_setup_title: "Enter Player Names",
    solo_setup_sub: "Order = turn order. #1 goes first.",
    solo_add: "Add",
    solo_start: "Start Game",
    solo_need_two: "At least 2 players required",
    solo_max: "Solo mode max 8 players",
    solo_player_ph: "Nickname",

    pass_to: "Pass the phone to",
    pass_ready: "I'm Ready ✋",
    pass_tip: "No peeking, others!",

    input_your_turn: "Your Turn",
    input_range_now: "Safe Range",
    input_hint: "Enter integer",
    input_submit: "Submit",

    result_safe: "✅ Safe!",
    result_range_shrunk: "New Range",
    result_next_is: "Next up",
    result_continue: "Continue",

    boom_title: "💥 BOOM!",
    boom_loser: "Triggered by",
    boom_number: "Secret Number",
    boom_penalty: "Icebreaker Challenge",
    boom_next_round: "Next Round",

    err_out_of_range: "Must be between {min} and {max}!",
    err_not_a_number: "Please enter an integer",

    host_mode: "Host Room",
    host_desc: "Display / Master Console",
    client_mode: "Join Room",
    client_desc: "Join via room code",
    room_code: "Room Code",
    room_code_ph: "8-character code",
    join_room_title: "Join Room",
    btn_join: "Connect",
    target_mode: "Secret Number",
    start_game: "Start Game",
    current_turn: "Current Turn",
    proxy_input: "Host Override",
    skip_player: "Skip",
    waiting_turn: "Waiting for {name}...",
    your_turn_now: "It's your turn! Enter number",
    waiting_host_restart: "Waiting for host to start next round...",
    cancel: "Cancel",
    alert_room_full: "⚠️ Room is full (Max 20)!",
    host_disconnected: "⚠️ Host disconnected. Please rejoin later.",
    game_stalled: "⚠️ All active players disconnected. Game paused.",
    invalid_room: "⚠️ Room not found. Please verify the code."
  }
};

const REACTIONS = {
  nervous:   { emoji: '😱', zh: '緊張',   en: 'Nervous' },
  too_close: { emoji: '🔥', zh: '太近了', en: 'So close!' },
  watching:  { emoji: '👀', zh: '看戲',   en: 'Watching' },
  too_slow:  { emoji: '😴', zh: '好慢喔', en: 'Too slow' },
  run:       { emoji: '😱💨', zh: '快逃',   en: 'Run!' },
  boom:      { emoji: '💥', zh: '炸了',   en: 'BOOM!' },
  lol:       { emoji: '🤣', zh: '笑死',   en: 'LOL' },
  clap:      { emoji: '👏', zh: '掌聲',   en: 'Clap' }
};

const REACTION_PHASES = {
  WAITING:     ['nervous', 'too_close', 'watching', 'too_slow'],
  CLOSE_RANGE: ['run', 'too_close', 'nervous'],
  BOOM:        ['boom', 'lol', 'clap']
};

const PENALTY_POOL = [
  { id: 'p1', zh: '分享你手機相簿最後一張照片的故事。', en: 'Share the story behind the last photo in your phone album.' },
  { id: 'p2', zh: '分享一個同事不知道的個人隱藏專長或嗜好。', en: 'Share a hidden skill or hobby colleagues do not know about.' },
  { id: 'p3', zh: '挑選現場一位同事，稱讚他/她的一項優點。', en: 'Pick a colleague in the room and compliment one strength.' },
  { id: 'p4', zh: '推薦一部你近期看過最想推薦的電影或書籍。', en: 'Recommend a movie or book you enjoyed recently.' }
];

function t(key, lang = 'zh', params = {}) {
  let str = (I18N[lang] && I18N[lang][key]) || key;
  Object.keys(params).forEach(p => {
    str = str.replace(new RegExp(`{${p}}`, 'g'), params[p]);
  });
  return str;
}
