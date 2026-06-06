
// main.js — 元素聚合动画 + 同一时间轴音频控制
// 重点逻辑：
// 1) 背景保持“淡背景”状态。
// 2) 只有淡背景中“被乐器用到的原始图形元素”会消失。
// 3) 这些被用到的元素会从原位置炸开成粒子，然后粒子慢慢淡出。
// 4) 没有被乐器用到的背景元素继续留在淡背景里。
// 5) 乐器漂浮效果保留。

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

const groupAssemble = { piano:0, violin:0, guitar:0, musicbox:0 };
const groupTarget   = { piano:0, violin:0, guitar:0, musicbox:0 };
const groupPinned   = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart = null;
let dragAssemble = 0;
let locked = false;

let audioStarted = false;
let audioLoaded = false;
let audioStartInProgress = false;
let audioCtx = null;
let audioLoadPromise = null;
let loadedCount = 0;

const audioBuffers = {};
const audioSources = {};
const audioGains = {};

let svgLoadPromise = null;
let bgLoadPromise = null;

const instrumentViews = {};
const usedBackgroundElements = [];
const fireworkParticles = [];

const mainEl = document.getElementById('main');
const fragmentLayer = document.getElementById('fragment-layer');
const canvasEl = document.getElementById('canvas');
const particleCanvas = document.getElementById('particle-layer');
const particleCtx = particleCanvas ? particleCanvas.getContext('2d') : null;

let backgroundSvg = null;

// 乐器漂浮参数
const FLOAT_STYLE = {
  piano:    { phase: 0.4, ampX: 1.85, ampY: 2.65, rot: 2.9, speed: 0.95 },
  violin:   { phase: 2.1, ampX: 2.05, ampY: 2.75, rot: 3.2, speed: 1.08 },
  guitar:   { phase: 3.7, ampX: 1.90, ampY: 2.70, rot: 3.0, speed: 0.88 },
  musicbox: { phase: 5.0, ampX: 2.00, ampY: 2.55, rot: 2.8, speed: 1.00 }
};

// 乐器最终位置
const TARGET_POS = {
  piano:    { x: -21, y: -15 },
  violin:   { x:   8, y: -19 },
  guitar:   { x: -21, y:  15 },
  musicbox: { x:  21, y:  15 }
};

const SOURCE_BIAS = {
  piano:    { x: -0.95, y: -0.45 },
  violin:   { x:  0.85, y: -0.45 },
  guitar:   { x: -0.85, y:  0.55 },
  musicbox: { x:  0.85, y:  0.55 }
};

// 这些区域定义了“哪些淡背景元素是被乐器用到的”。
// 注意：这次不是遮整片背景，而是会真正找到原始 SVG 里的图形元素，让这些元素 opacity 变成 0。
// 其他没有落入这些区域的 SVG 元素会继续留在淡背景里。
const USED_AREAS = {
  piano: [
    { x: 216, y: 205, r: 260 },  // 左上大圆
    { x: 300, y: 470, r: 120 },  // 红圆
    { x: 420, y: 585, r: 175 }   // 钢琴键盘/棋盘格
  ],
  violin: [
    { x: 1040, y: 400, r: 160 },
    { x: 1180, y: 275, r: 130 },
    { x: 1005, y: 542, r: 120 }
  ],
  guitar: [
    { x: 150, y: 862, r: 130 },
    { x: 505, y: 768, r: 135 },
    { x: 205, y: 1015, r: 100 },
    { x: 330, y: 1000, r: 110 }
  ],
  musicbox: [
    { x: 1469, y: 758, r: 155 },
    { x: 1550, y: 500, r: 105 },
    { x: 1653, y: 963, r: 100 },
    { x: 1737, y: 729, r: 82 }
  ]
};

const DEFAULT_PARTICLE_COLOURS = {
  piano:    ['#16080f', '#a878b8', '#f0c7b8', '#c1392a', '#f6f1ec', '#bb9450'],
  violin:   ['#c9a23a', '#bb9450', '#1c0f14', '#e7d24a', '#2f6cb0', '#f6f1ec'],
  guitar:   ['#e7d24a', '#a9c1d6', '#2f6cb0', '#c1392a', '#1D3557', '#f6f1ec'],
  musicbox: ['#0077B6', '#2f6cb0', '#9a9a96', '#a9c1d6', '#c1392a', '#f6f1ec']
};

function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
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

function resizeParticleCanvas() {
  if (!particleCanvas || !particleCtx) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  particleCanvas.width = Math.round(window.innerWidth * dpr);
  particleCanvas.height = Math.round(window.innerHeight * dpr);
  particleCanvas.style.width = window.innerWidth + 'px';
  particleCanvas.style.height = window.innerHeight + 'px';
  particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getMainArtRect() {
  const artW = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.92 * 1800 / 1260);
  const artH = artW * 1260 / 1800;
  return {
    left: window.innerWidth / 2 - artW / 2,
    top: window.innerHeight / 2 - artH / 2,
    width: artW,
    height: artH,
    scale: artW / 1800
  };
}

function designToScreen(x, y) {
  const r = getMainArtRect();
  return {
    x: r.left + (x / 1800) * r.width,
    y: r.top + (y / 1260) * r.height,
    scale: r.scale
  };
}

function findInstrumentForPoint(x, y) {
  for (const inst of INSTRUMENTS) {
    for (const area of USED_AREAS[inst]) {
      const d = Math.hypot(x - area.x, y - area.y);
      if (d <= area.r) return inst;
    }
  }
  return null;
}

function collectColours(el) {
  const colours = [];
  const add = (value) => {
    if (!value || value === 'none' || value === 'transparent') return;
    if (value.startsWith('url(')) return;
    if (value.toLowerCase() === '#f1e9d8') return;
    colours.push(value);
  };

  add(el.getAttribute('fill'));
  add(el.getAttribute('stroke'));

  el.querySelectorAll?.('*').forEach(child => {
    add(child.getAttribute('fill'));
    add(child.getAttribute('stroke'));
  });

  return [...new Set(colours)];
}

// ============================================================
//  加载原始 Composition 背景为 inline SVG
//  这样才可以让“某些具体 SVG 图形元素”消失，而不是整张背景一起消失。
// ============================================================
function loadCompositionBackgroundSvg() {
  if (bgLoadPromise) return bgLoadPromise;

  bgLoadPromise = fetch('composition.svg')
    .then(res => res.text())
    .then(svgText => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return;

      svg.classList.add('composition-bg-svg');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // 插入到原 main image 的位置上，并隐藏原来的 img。
      canvasEl.insertBefore(svg, particleCanvas);
      backgroundSvg = svg;
      mainEl.style.display = 'none';

      classifyUsedBackgroundElements();
      initFireworkParticlesFromUsedElements();
    })
    .catch(err => {
      console.warn('Could not load inline background SVG. Fallback to image background.', err);
    });

  return bgLoadPromise;
}

function classifyUsedBackgroundElements() {
  if (!backgroundSvg) return;

  usedBackgroundElements.length = 0;

  const children = Array.from(backgroundSvg.children);
  children.forEach(el => {
    const tag = el.tagName.toLowerCase();

    // 背景米色底不参与消失
    if (tag === 'rect' && el.getAttribute('width') === '1800' && el.getAttribute('height') === '1260') {
      el.dataset.baseOpacity = '1';
      return;
    }

    let bbox;
    try {
      bbox = el.getBBox();
    } catch {
      return;
    }

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const inst = findInstrumentForPoint(cx, cy);

    const baseOpacity = Number(el.getAttribute('opacity') || 1);
    el.dataset.baseOpacity = String(baseOpacity);

    // 超长线条如果中心不在区域里不会动；中心在区域里的小线条/局部线条会参与。
    if (inst) {
      el.dataset.usedBy = inst;
      usedBackgroundElements.push({
        el,
        inst,
        bbox,
        colours: collectColours(el).length ? collectColours(el) : DEFAULT_PARTICLE_COLOURS[inst],
        baseOpacity
      });
    }
  });
}

function initFireworkParticlesFromUsedElements() {
  const rand = makeRandom(20260606);
  fireworkParticles.length = 0;

  for (const item of usedBackgroundElements) {
    const { inst, bbox, colours } = item;

    // 根据元素大小决定粒子数量：大圆更多，小元素更少。
    const area = Math.max(1, bbox.width * bbox.height);
    const count = Math.max(18, Math.min(130, Math.round(Math.sqrt(area) * 0.75)));

    for (let i = 0; i < count; i++) {
      const ox = bbox.x + rand() * Math.max(2, bbox.width);
      const oy = bbox.y + rand() * Math.max(2, bbox.height);

      // 从元素中心向外爆开
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const baseAngle = Math.atan2(oy - cy, ox - cx);
      const angle = baseAngle + lerp(-0.85, 0.85, rand());

      fireworkParticles.push({
        inst,
        ox,
        oy,
        colour: colours[Math.floor(rand() * colours.length)],
        size: lerp(0.8, 2.6, rand()),
        angle,
        distance: lerp(45, 185, rand()),
        delay: lerp(0, 0.24, rand()),
        phase: rand() * Math.PI * 2,
        wobble: lerp(7, 24, rand()),
        alpha: lerp(0.48, 0.90, rand()),
        streak: rand() > 0.55,
        trail: lerp(10, 34, rand())
      });
    }
  }
}

function updateCompositionBackground(maxAssemble) {
  if (!backgroundSvg) return;

  // 整体背景保持第二张图那种淡淡的状态
  const bgFade = smoothstep(0.18, 0.88, maxAssemble);
  backgroundSvg.style.opacity = String(1 - bgFade * 0.78);
  backgroundSvg.style.filter = maxAssemble > 0.05
    ? `grayscale(${maxAssemble * 0.16}) blur(${maxAssemble * 0.15}px)`
    : 'none';

  // 关键：只让乐器用到的淡背景元素消失
  for (const item of usedBackgroundElements) {
    const s = groupAssemble[item.inst];
    const disappear = smoothstep(0.18, 0.80, s);
    const newOpacity = item.baseOpacity * (1 - disappear);
    item.el.style.opacity = String(clamp(newOpacity, 0, item.baseOpacity));
  }
}

function drawFireworkParticlesFromUsedElements() {
  if (!particleCtx || !particleCanvas) return;
  particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const time = performance.now() * 0.001;

  for (const p0 of fireworkParticles) {
    const s = groupAssemble[p0.inst];
    if (s <= 0.02) continue;

    const burst = smoothstep(0.16, 0.84, s);
    const local = clamp((burst - p0.delay) / (1 - p0.delay));
    if (local <= 0) continue;

    const move = easeOutCubic(local);
    const origin = designToScreen(p0.ox, p0.oy);

    const wobbleX = Math.sin(time * 0.9 + p0.phase) * p0.wobble * local;
    const wobbleY = Math.cos(time * 0.72 + p0.phase * 1.27) * p0.wobble * local;

    const x = origin.x + Math.cos(p0.angle) * p0.distance * move * origin.scale + wobbleX;
    const y = origin.y + Math.sin(p0.angle) * p0.distance * move * origin.scale + wobbleY;

    // 粒子：先比较明显，再慢慢消失
    const lifeFade = 1 - smoothstep(0.50, 1.0, local);
    const stateFade = 1 - smoothstep(0.82, 1.0, s) * 0.85;
    const alpha = p0.alpha * lifeFade * stateFade * 0.72;

    if (alpha <= 0.01) continue;

    if (p0.streak) {
      particleCtx.globalAlpha = alpha * 0.55;
      particleCtx.strokeStyle = p0.colour;
      particleCtx.lineWidth = 0.9;
      particleCtx.beginPath();
      particleCtx.moveTo(
        x - Math.cos(p0.angle) * p0.trail * origin.scale,
        y - Math.sin(p0.angle) * p0.trail * origin.scale
      );
      particleCtx.lineTo(x, y);
      particleCtx.stroke();
    }

    particleCtx.globalAlpha = alpha;
    particleCtx.fillStyle = p0.colour;
    particleCtx.beginPath();
    particleCtx.arc(x, y, p0.size * (1 + 0.25 * Math.sin(time + p0.phase)), 0, Math.PI * 2);
    particleCtx.fill();
  }

  particleCtx.globalAlpha = 1;
}

// ============================================================
//  乐器 SVG 加载
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
    const tag = child.tagName.toLowerCase();
    if (!['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'].includes(tag)) return;

    const g = document.createElementNS(NS, 'g');
    g.classList.add('svg-piece');
    const clone = child.cloneNode(true);
    g.appendChild(clone);
    svg.appendChild(g);

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
    groupAssemble[inst] += (groupTarget[inst] - groupAssemble[inst]) * 0.08;
  }

  const maxAssemble = Math.max(...INSTRUMENTS.map(i => groupAssemble[i]));

  updateCompositionBackground(maxAssemble);
  drawFireworkParticlesFromUsedElements();

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
  const float = FLOAT_STYLE[inst];
  const time = performance.now() * 0.001;

  const floatStrength = smoothstep(0.45, 0.92, s);
  const wave = time * float.speed + float.phase;
  const floatX = Math.sin(wave) * float.ampX * floatStrength;
  const floatY = Math.cos(wave * 0.86) * float.ampY * floatStrength;
  const floatRot = Math.sin(wave * 0.72 + 0.8) * float.rot * floatStrength;

  const tx = pos.x * e + floatX;
  const ty = pos.y * e + floatY;
  const scale = lerp(0.72, 1.0, e);
  view.wrap.style.transform = `translate(calc(-50% + ${tx}vw), calc(-50% + ${ty}vh)) scale(${scale}) rotate(${floatRot}deg)`;
  view.wrap.style.opacity = s < 0.015 ? 0 : clamp(s * 1.5, 0, 1);

  for (const piece of view.pieces) {
    const local = clamp((s - piece.delay) / (1 - piece.delay));
    const p = easeOutCubic(local);
    const dx = piece.dx * (1 - p);
    const dy = piece.dy * (1 - p);
    const rot = piece.rot * (1 - p);

    const micro = floatStrength * 0.68;
    const microX = Math.sin(time * 0.9 + piece.delay * 18 + float.phase) * 2.7 * micro;
    const microY = Math.cos(time * 0.8 + piece.delay * 22 + float.phase) * 2.2 * micro;

    piece.el.setAttribute(
      'transform',
      `translate(${(dx + microX).toFixed(2)} ${(dy + microY).toFixed(2)}) rotate(${rot.toFixed(2)} ${piece.cx.toFixed(2)} ${piece.cy.toFixed(2)})`
    );

    piece.el.style.opacity = clamp((s - piece.delay * 0.45) * 2.2, 0, 1).toFixed(3);
  }
}

function updateAudioVolumes(maxAssemble) {
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
//  鼠标拖拽
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
      if (dragAssemble < 0.01) {
        dragAssemble = 0;
        clearInterval(decay);
      }
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
  if (key === '0') {
    INSTRUMENTS.forEach(i => groupPinned[i] = 0);
    locked = false;
  }

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
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

async function loadAudioBuffers() {
  if (audioLoadPromise) return audioLoadPromise;

  const ctx = getAudioContext();
  loadedCount = 0;
  updateLoadProgress();

  audioLoadPromise = Promise.all(AUDIO_KEYS.map(async key => {
    const res = await fetch(AUDIO_FILES[key]);
    const buf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    audioBuffers[key] = decoded;
    loadedCount++;
    updateLoadProgress();
  })).then(() => {
    audioLoaded = true;
    updateLoadProgress();
  }).catch(err => {
    console.error('audio load failed:', err);
  });

  return audioLoadPromise;
}

function createStemSource(key, when) {
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = audioBuffers[key];
  src.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = key === 'ensemble' ? 0.55 : 0;

  src.connect(gain).connect(ctx.destination);
  src.start(when, 0);

  audioSources[key] = src;
  audioGains[key] = gain;
}

async function startAudio() {
  if (audioStarted || audioStartInProgress) return;

  audioStartInProgress = true;
  const ctx = getAudioContext();

  await ctx.resume();
  await loadAudioBuffers();

  const when = ctx.currentTime + 0.06;
  AUDIO_KEYS.forEach(key => createStemSource(key, when));

  audioStarted = true;
  audioStartInProgress = false;
  updateLoadProgress();
}

function updateLoadProgress() {
  const total = AUDIO_KEYS.length;
  const pct = Math.round((loadedCount / total) * 100);
  const el = document.getElementById('audio-progress');
  if (!el) return;

  if (pct >= 100) {
    el.textContent = audioStarted ? '' : '♪ click to start canon';
  } else {
    el.textContent = 'audio loading ' + pct + '%';
  }
}

// ============================================================
//  启动
// ============================================================
window.addEventListener('resize', () => {
  resizeParticleCanvas();
});

resizeParticleCanvas();
loadCompositionBackgroundSvg();
loadInstrumentSvgs();
loadAudioBuffers();
render();
