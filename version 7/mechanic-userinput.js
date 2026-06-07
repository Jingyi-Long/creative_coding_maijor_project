// mechanic-userinput.js — 【Mechanic: User input】
// 负责人(creative director):  Xiaoyu
//
// 控制全部交给键盘(更干净):
//   1/2/3/4 = 单独切换 钢琴/小提琴/吉他/八音盒
//   5       = 全部聚合
//   0       = 回到原图
// 鼠标点击 = 「弹奏」一道五线谱波纹(纯表现,不改变聚合)。
//
// 表现层(本 mechanic 独占两张透明 canvas,不碰别人的文件):
//   1) 点击波纹:以点击点为中心扩散 5 道同心圆,边扩散边淡出。
//   2) 色域提示:三块极淡的黄/红/蓝色区,呼应康定斯基色彩通感。
//
// 音乐自动播放:页面打开即尝试播放;浏览器规定首次发声需要一次用户操作,
//   因此再挂一个"首次任意操作(按键/点击/触摸)即启动"的兜底,做到不用鼠标点击也能起。
//
// 对外暴露(供 main.js 可选读取做"形状被波前点燃"):
//   window.__pointer = { x, y, down }
//   window.__pulses  = [ { x, y, t0 }, ... ]
//
// 给 main.js 的兼容变量:dragAssemble 固定为 0(已移除拖拽,但 main.js 仍会读它)。
//
// 跨文件依赖(运行时):INSTRUMENTS(main)、startAudio()(mechanic-audio)

const groupPinned = { piano:0, violin:0, guitar:0, musicbox:0 };
let dragAssemble = 0;          // 兼容 main.js,恒为 0

// 对外暴露
window.__pointer = { x: 0, y: 0, down: false };
window.__pulses = [];
const PULSE_LIFE = 2.2;
const PULSE_SPEED = 620;
const STAFF_LINES = 5;
const STAFF_GAP = 26;

// ============================================================
//  HUD 同步
// ============================================================
function updateHud() {
  for (const inst of INSTRUMENTS) {
    const row = document.querySelector('#hud-groups .grow[data-inst="' + inst + '"]');
    if (!row) continue;
    const dot = row.querySelector('.dot');
    if (groupPinned[inst] > 0.5) { row.classList.add('active'); dot.textContent = '●'; }
    else { row.classList.remove('active'); dot.textContent = '○'; }
  }
}

// ============================================================
//  自建两张透明画布:色域层(底) + 波纹层(上)
// ============================================================
const zoneCanvas = document.createElement('canvas');
zoneCanvas.id = 'input-zone-layer';
const rippleCanvas = document.createElement('canvas');
rippleCanvas.id = 'input-ripple-layer';

for (const c of [zoneCanvas, rippleCanvas]) {
  c.style.position = 'fixed';
  c.style.left = '0';
  c.style.top = '0';
  c.style.pointerEvents = 'none';
}
zoneCanvas.style.zIndex = '4';
zoneCanvas.style.mixBlendMode = 'soft-light';
rippleCanvas.style.zIndex = '5';
document.body.appendChild(zoneCanvas);
document.body.appendChild(rippleCanvas);

const zoneCtx = zoneCanvas.getContext('2d');
const rippleCtx = rippleCanvas.getContext('2d');

function resizeInputCanvases() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  for (const c of [zoneCanvas, rippleCanvas]) {
    c.width = Math.round(window.innerWidth * dpr);
    c.height = Math.round(window.innerHeight * dpr);
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  drawColorZones();
}
window.addEventListener('resize', resizeInputCanvases);

// ============================================================
//  色域提示:三块极淡的黄 / 红 / 蓝
// ============================================================
function drawColorZones() {
  const w = window.innerWidth, h = window.innerHeight;
  zoneCtx.clearRect(0, 0, w, h);
  const blobs = [
    { x: w * 0.30, y: h * 0.26, r: Math.max(w, h) * 0.42, col: '243,196,48' },
    { x: w * 0.74, y: h * 0.44, r: Math.max(w, h) * 0.40, col: '193,57,42' },
    { x: w * 0.42, y: h * 0.80, r: Math.max(w, h) * 0.44, col: '40,120,181' }
  ];
  for (const b of blobs) {
    const g = zoneCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0,   'rgba(' + b.col + ',0.55)');
    g.addColorStop(0.6, 'rgba(' + b.col + ',0.16)');
    g.addColorStop(1,   'rgba(' + b.col + ',0)');
    zoneCtx.fillStyle = g;
    zoneCtx.beginPath();
    zoneCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    zoneCtx.fill();
  }
}

// ============================================================
//  点击「弹奏」波纹:5 道同心圆
// ============================================================
function spawnPulse(x, y) {
  window.__pulses.push({ x, y, t0: performance.now() / 1000 });
  if (window.__pulses.length > 24) window.__pulses.shift();
}

function drawPulses() {
  const w = window.innerWidth, h = window.innerHeight;
  rippleCtx.clearRect(0, 0, w, h);
  const now = performance.now() / 1000;

  for (let i = window.__pulses.length - 1; i >= 0; i--) {
    const p = window.__pulses[i];
    const age = now - p.t0;
    if (age > PULSE_LIFE) { window.__pulses.splice(i, 1); continue; }
    const life = age / PULSE_LIFE;
    const front = age * PULSE_SPEED;
    const fade = 1 - life;

    for (let k = 0; k < STAFF_LINES; k++) {
      const r = front - k * STAFF_GAP;
      if (r <= 0) continue;
      const lineFade = fade * (1 - k / (STAFF_LINES + 1));
      rippleCtx.beginPath();
      rippleCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      rippleCtx.strokeStyle = 'rgba(43,38,34,' + (lineFade * 0.5).toFixed(3) + ')';
      rippleCtx.lineWidth = 1.4;
      rippleCtx.stroke();
    }
    const dotFade = Math.max(0, 1 - age * 3);
    if (dotFade > 0) {
      rippleCtx.beginPath();
      rippleCtx.arc(p.x, p.y, 4 + dotFade * 6, 0, Math.PI * 2);
      rippleCtx.fillStyle = 'rgba(240,196,48,' + (dotFade * 0.6).toFixed(3) + ')';
      rippleCtx.fill();
    }
  }
}

function inputRenderLoop() {
  drawPulses();
  requestAnimationFrame(inputRenderLoop);
}

// ============================================================
//  点击 = 弹奏波纹(不改变聚合)
// ============================================================
function pointPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onDown(e) {
  ensureAudio();
  const p = pointPos(e);
  window.__pointer = { x: p.x, y: p.y, down: true };
  spawnPulse(p.x, p.y);
}
function onMove(e) {
  const p = pointPos(e);
  window.__pointer.x = p.x;
  window.__pointer.y = p.y;
}
function onUp() { window.__pointer.down = false; }

document.addEventListener('mousedown',  onDown);
document.addEventListener('mousemove',  onMove);
document.addEventListener('mouseup',    onUp);
document.addEventListener('touchstart', onDown, { passive: true });
document.addEventListener('touchmove',  onMove, { passive: true });
document.addEventListener('touchend',   onUp);

// ============================================================
//  键盘控制
// ============================================================
document.addEventListener('keydown', e => {
  ensureAudio();
  const key = e.key;
  const map = { '1':'piano', '2':'violin', '3':'guitar', '4':'musicbox' };
  if (map[key]) {
    const inst = map[key];
    groupPinned[inst] = groupPinned[inst] > 0.5 ? 0 : 1;
  }
  if (key === '5') INSTRUMENTS.forEach(i => groupPinned[i] = 1);
  if (key === '0') INSTRUMENTS.forEach(i => groupPinned[i] = 0);
});

// ============================================================
//  音乐自动播放
//  打开即尝试;浏览器若拦截,则等首次任意操作(按键/点击/触摸)再起。
// ============================================================
let audioKicked = false;
function ensureAudio() {
  if (audioKicked) return;
  audioKicked = true;
  if (typeof startAudio === 'function') startAudio();
}
// 第一次任意操作(按键/点击/触摸)即启动 —— 浏览器要求必须有用户操作才能发声
['keydown', 'pointerdown', 'touchstart', 'click'].forEach(ev => {
  window.addEventListener(ev, ensureAudio, { once: true, capture: true });
});

// ============================================================
//  启动
// ============================================================
resizeInputCanvases();
inputRenderLoop();