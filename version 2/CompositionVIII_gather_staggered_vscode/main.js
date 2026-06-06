// main.js — 元素聚合动画 + 同一时间轴音频控制
// 交互逻辑：初始状态保留完整 Composition VIII；交互时，SVG 内部的独立元素从不同位置慢慢聚合成对应乐器。

// ============================================================
//  状态
// ============================================================
const INSTRUMENTS = ['piano', 'violin', 'guitar', 'musicbox'];
const AUDIO_KEYS = [...INSTRUMENTS, 'ensemble'];
const AUDIO_FILES = {
  piano: 'piano.mp3',
  violin: 'violin.mp3',
  guitar: 'guitar.mp3',
  musicbox: 'musicbox.mp3',
  ensemble: 'ensemble.mp3'
};
const SVG_FILES = {
  piano: 'piano.svg',
  violin: 'violin.svg',
  guitar: 'guitar.svg',
  musicbox: 'musicbox.svg'
};

// 每组的聚合值(0=元素散在原图感位置, 1=聚合成乐器)
const groupAssemble = { piano:0, violin:0, guitar:0, musicbox:0 };
const groupTarget   = { piano:0, violin:0, guitar:0, musicbox:0 };
const groupPinned   = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart = null;
let dragAssemble = 0;      // 鼠标拖拽产生的全局聚合值
let locked = false;
let audioStarted = false;
let audioLoaded = false;
let audioStartInProgress = false;

// Web Audio：把 5 个音频作为同一条时间轴上的 5 个 stem 同时启动
let audioCtx = null;
let audioLoadPromise = null;
let loadedCount = 0;
const audioBuffers = {};
const audioSources = {};
const audioGains = {};

// SVG 元素视图
let svgLoadPromise = null;
const instrumentViews = {}; // { inst: { wrap, svg, pieces, viewBox } }

// 四个乐器最终聚合位置(% of viewport, 从中心点偏移)
// 这版不再是板正的 2×2 排列，而是向画面中心收拢并交错摆放。
// x / y 控制位置；rot 控制整体轻微旋转；scale 控制最终大小。
const TARGET_POS = {
  piano:    { x: -14, y: -5, rot: -5, scale: 0.96, z: 4 },
  violin:   { x:   7, y: -8, rot:  7, scale: 0.84, z: 5 },
  guitar:   { x:  -8, y:  7, rot:  6, scale: 0.88, z: 6 },
  musicbox: { x:  12, y:  5, rot: -4, scale: 0.86, z: 3 }
};

// 每个乐器的元素初始“来源方向”，用于制造从不同位置聚合的感觉
const SOURCE_BIAS = {
  piano:    { x: -0.95, y: -0.45 },
  violin:   { x:  0.85, y: -0.45 },
  guitar:   { x: -0.85, y:  0.55 },
  musicbox: { x:  0.85, y:  0.55 }
};

// ============================================================
//  DOM 引用
// ============================================================
const mainEl = document.getElementById('main');
const fragmentLayer = document.getElementById('fragment-layer');

// ============================================================
//  工具函数
// ============================================================
function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOutCubic(t) {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t) {
  t = clamp(t);
  return 1 - Math.pow(1 - t, 3);
}
function makeRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function parseViewBox(svgEl) {
  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  return {
    x: 0,
    y: 0,
    w: Number(svgEl.getAttribute('width')) || 1000,
    h: Number(svgEl.getAttribute('height')) || 1000
  };
}

// ============================================================
//  SVG 加载：把每个乐器 SVG 拆成独立 pieces
// ============================================================
function loadInstrumentSvgs() {
  if (svgLoadPromise) return svgLoadPromise;

  svgLoadPromise = Promise.all(INSTRUMENTS.map(async inst => {
    const response = await fetch(SVG_FILES[inst]);
    const svgText = await response.text();
    setupInstrumentSvg(inst, svgText);
  })).catch(err => {
    console.error('SVG loading failed:', err);
  });

  return svgLoadPromise;
}

function setupInstrumentSvg(inst, svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const srcSvg = doc.querySelector('svg');
  if (!srcSvg) return;

  const vb = parseViewBox(srcSvg);
  const NS = 'http://www.w3.org/2000/svg';

  const wrap = document.createElement('div');
  wrap.className = 'instrument-wrap';
  wrap.dataset.inst = inst;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const pieces = [];
  const children = Array.from(srcSvg.children);
  const rand = makeRandom(1000 + INSTRUMENTS.indexOf(inst) * 777);
  const bias = SOURCE_BIAS[inst];
  const centerX = vb.x + vb.w / 2;
  const centerY = vb.y + vb.h / 2;

  children.forEach((child, index) => {
    // 保留真实视觉元素，跳过空白文本等
    const tag = child.tagName.toLowerCase();
    if (!['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'].includes(tag)) return;

    const g = document.createElementNS(NS, 'g');
    g.classList.add('svg-piece');
    const clone = child.cloneNode(true);
    g.appendChild(clone);
    svg.appendChild(g);

    // 让每个元素从不同方向/不同距离聚合，不再是整张乐器图片直接出现
    const angle = rand() * Math.PI * 2;
    const radius = lerp(0.55, 1.65, rand()) * Math.max(vb.w, vb.h) * 0.55;
    const biasX = bias.x * vb.w * lerp(0.35, 1.05, rand());
    const biasY = bias.y * vb.h * lerp(0.35, 1.05, rand());

    const dx = Math.cos(angle) * radius + biasX;
    const dy = Math.sin(angle) * radius + biasY;
    const rot = lerp(-42, 42, rand());
    const delay = Math.min(0.32, (index % 16) * 0.012 + rand() * 0.08);

    pieces.push({ el: g, dx, dy, rot, delay, cx: centerX, cy: centerY });
  });

  wrap.appendChild(svg);
  fragmentLayer.appendChild(wrap);
  instrumentViews[inst] = { wrap, svg, pieces, viewBox: vb };
}

// ============================================================
//  渲染
// ============================================================
function render() {
  for (const inst of INSTRUMENTS) {
    const target = Math.max(dragAssemble, groupPinned[inst]);
    groupTarget[inst] = target;
    // 平滑过渡，让聚合/散开不是突然发生
    groupAssemble[inst] += (groupTarget[inst] - groupAssemble[inst]) * 0.08;
  }

  const maxAssemble = Math.max(...INSTRUMENTS.map(i => groupAssemble[i]));

  // 初始图层不会立刻消失，而是退到背景，表现“从原图中抽取元素”
  mainEl.style.opacity = 1 - maxAssemble * 0.74;
  mainEl.style.filter = maxAssemble > 0.05 ? `grayscale(${maxAssemble * 0.15})` : 'none';

  for (const inst of INSTRUMENTS) {
    updateInstrumentVisual(inst, groupAssemble[inst]);
  }

  updateAudioVolumes(maxAssemble);
  updateHud();

  requestAnimationFrame(render);
}

function updateInstrumentVisual(inst, s) {
  const view = instrumentViews[inst];
  if (!view) return;

  const e = easeInOutCubic(s);
  const pos = TARGET_POS[inst];

  // 整个乐器容器从画面中心缓慢移动到最终位置；真正的“聚合感”来自每个 piece 的独立位移
  const tx = pos.x * e;
  const ty = pos.y * e;
  const rot = lerp(0, pos.rot || 0, e);
  const scale = lerp(0.66, pos.scale || 1.0, e);

  // 加一点轻微漂移，避免四个乐器看起来像整齐排队。
  const driftX = Math.sin(performance.now() * 0.0006 + INSTRUMENTS.indexOf(inst)) * 0.18 * e;
  const driftY = Math.cos(performance.now() * 0.0005 + INSTRUMENTS.indexOf(inst) * 1.7) * 0.14 * e;

  view.wrap.style.transform =
    `translate(calc(-50% + ${tx + driftX}vw), calc(-50% + ${ty + driftY}vh)) rotate(${rot}deg) scale(${scale})`;
  view.wrap.style.opacity = s < 0.015 ? 0 : clamp(s * 1.5, 0, 1);
  view.wrap.style.zIndex = pos.z || 3;

  for (const piece of view.pieces) {
    // stagger：每个元素略有先后，视觉上更像“慢慢聚起来”
    const local = clamp((s - piece.delay) / (1 - piece.delay));
    const p = easeOutCubic(local);
    const dx = piece.dx * (1 - p);
    const dy = piece.dy * (1 - p);
    const rot = piece.rot * (1 - p);

    piece.el.setAttribute(
      'transform',
      `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} ${piece.cx.toFixed(2)} ${piece.cy.toFixed(2)})`
    );

    // 散开初期先淡入，聚合完成后保持完整可见
    piece.el.style.opacity = clamp((s - piece.delay * 0.45) * 2.2, 0, 1).toFixed(3);
  }
}

function updateAudioVolumes(maxAssemble) {
  // 音频音量：5 个音频在 Web Audio 里同一时间轴播放，只改变各自音量
  if (audioStarted && audioCtx) {
    for (const inst of INSTRUMENTS) {
      if (audioGains[inst]) {
        audioGains[inst].gain.setTargetAtTime(0.55 * groupAssemble[inst], audioCtx.currentTime, 0.03);
      }
    }
    if (audioGains.ensemble) {
      audioGains.ensemble.gain.setTargetAtTime(0.55 * (1 - maxAssemble), audioCtx.currentTime, 0.03);
    }
  }
}

function updateHud() {
  for (const inst of INSTRUMENTS) {
    const row = document.querySelector('#hud-groups .grow[data-inst="' + inst + '"]');
    if (!row) continue;
    const dot = row.querySelector('.dot');
    if (groupPinned[inst] > 0.5) {
      row.classList.add('active');
      dot.textContent = '●';
    } else {
      row.classList.remove('active');
      dot.textContent = '○';
    }
  }
  document.getElementById('lock-state').textContent = locked ? '🔒 Locked [L]' : '';
}

// ============================================================
//  鼠标拖拽：拖动越远，聚合越强；松手后回到原图
// ============================================================
function onDown(e) {
  startAudio();
  const p = pointPos(e);
  dragStart = { x: p.x, y: p.y };
}
function onMove(e) {
  if (!dragStart) return;
  const p = pointPos(e);
  const d = Math.hypot(p.x - dragStart.x, p.y - dragStart.y);
  const maxDrag = Math.min(window.innerWidth, window.innerHeight) * 0.30;
  const t = Math.min(1, d / maxDrag);
  dragAssemble += (t - dragAssemble) * 0.16;
}
function onUp() {
  dragStart = null;
  if (!locked) {
    const decay = setInterval(() => {
      dragAssemble *= 0.90;
      if (dragAssemble < 0.01) { dragAssemble = 0; clearInterval(decay); }
    }, 16);
  }
}
function pointPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

document.addEventListener('mousedown',  onDown);
document.addEventListener('mousemove',  onMove);
document.addEventListener('mouseup',    onUp);
document.addEventListener('touchstart', onDown);
document.addEventListener('touchmove',  onMove);
document.addEventListener('touchend',   onUp);

// ============================================================
//  按键
// ============================================================
document.addEventListener('keydown', e => {
  startAudio();
  const key = e.key;
  const map = { '1':'piano', '2':'violin', '3':'guitar', '4':'musicbox' };

  if (map[key]) {
    const inst = map[key];
    groupPinned[inst] = groupPinned[inst] > 0.5 ? 0 : 1;
  }
  if (key === '5') INSTRUMENTS.forEach(i => groupPinned[i] = 1);
  if (key === '0') { INSTRUMENTS.forEach(i => groupPinned[i] = 0); locked = false; }
  if (key === 'l' || key === 'L' || key === ' ') {
    locked = !locked;
    if (!locked && !INSTRUMENTS.some(i => groupPinned[i] > 0.5)) dragAssemble = 0;
    e.preventDefault();
  }
});

// ============================================================
//  音频：同一时间轴加载 / 同时启动
// ============================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function preloadAudio() {
  if (audioLoadPromise) return audioLoadPromise;

  const ctx = getAudioContext();
  loadedCount = 0;
  updateLoadProgress();

  audioLoadPromise = Promise.all(AUDIO_KEYS.map(async key => {
    const response = await fetch(AUDIO_FILES[key]);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffers[key] = await ctx.decodeAudioData(arrayBuffer);
    loadedCount++;
    updateLoadProgress();
  })).then(() => {
    audioLoaded = true;
    updateLoadProgress();

    // 控制台检查：5 个 buffer 应该是同一长度
    console.table(AUDIO_KEYS.map(key => ({
      track: key,
      duration: audioBuffers[key].duration.toFixed(3) + 's',
      sampleRate: audioBuffers[key].sampleRate
    })));
  }).catch(err => {
    console.error('Audio loading failed:', err);
    const el = document.getElementById('audio-progress');
    el.textContent = 'audio load failed — please use Live Server';
  });

  return audioLoadPromise;
}

async function startAudio() {
  if (audioStarted || audioStartInProgress) return;
  audioStartInProgress = true;

  const ctx = getAudioContext();
  await preloadAudio();
  await ctx.resume();

  // 所有音轨使用同一个 AudioContext 时间点启动，避免多个 <audio> 标签分别 play() 造成细微错位
  const startAt = ctx.currentTime + 0.08;

  for (const key of AUDIO_KEYS) {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffers[key];
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = key === 'ensemble' ? 0.55 : 0;

    source.connect(gain).connect(ctx.destination);
    source.start(startAt, 0);

    audioSources[key] = source;
    audioGains[key] = gain;
  }

  audioStarted = true;
  audioStartInProgress = false;
  updateLoadProgress();
}

// 加载进度
function updateLoadProgress() {
  const el = document.getElementById('audio-progress');
  if (!el) return;

  if (audioStarted) {
    el.textContent = '';
    return;
  }

  if (audioLoaded) {
    el.textContent = '♪ click to start canon';
    return;
  }

  const pct = Math.round(loadedCount / AUDIO_KEYS.length * 100);
  el.textContent = 'audio loading ' + pct + '%';
}

// ============================================================
//  启动
// ============================================================
loadInstrumentSvgs();
preloadAudio();
render();
