// main.js — 总装/渲染层(胶水)

const INSTRUMENTS = ['piano', 'violin', 'guitar', 'musicbox'];

const SVG_FILES = {
  piano: 'piano.svg',
  violin: 'violin.svg',
  guitar: 'guitar.svg',
  musicbox: 'musicbox.svg'
};

const groupAssemble = { piano:0, violin:0, guitar:0, musicbox:0 };
const groupTarget   = { piano:0, violin:0, guitar:0, musicbox:0 };

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

if (typeof smoothPerlin !== "function") {
  window.smoothPerlin = function(id, seed, speed, minValue, maxValue, smoothing) {
    return (minValue + maxValue) / 2;
  };
}
if (typeof particlePerlin !== "function") {
  window.particlePerlin = function(seed, speed, minValue, maxValue) {
    return (minValue + maxValue) / 2;
  };
}
if (typeof getFrameValue !== "function") {
  window.getFrameValue = function() {
    return Math.floor(performance.now() / 16.67);
  };
}

let backgroundSvg = null;

const FLOAT_STYLE = {
  piano:    { phase: 0.4, ampX: 1.85, ampY: 2.65, rot: 2.9, speed: 0.95 },
  violin:   { phase: 2.1, ampX: 2.05, ampY: 2.75, rot: 3.2, speed: 1.08 },
  guitar:   { phase: 3.7, ampX: 1.90, ampY: 2.70, rot: 3.0, speed: 0.88 },
  musicbox: { phase: 5.0, ampX: 2.00, ampY: 2.55, rot: 2.8, speed: 1.00 }
};

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

const USED_AREAS = {
  piano: [
    { x: 216, y: 205, r: 260 },
    { x: 300, y: 470, r: 120 },
    { x: 420, y: 585, r: 175 }
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

function parseViewBox(svgEl) {
  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  return {
    x: 0, y: 0,
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

    if (tag === 'rect' && el.getAttribute('width') === '1800' && el.getAttribute('height') === '1260') {
      el.dataset.baseOpacity = '1';
      return;
    }

    let bbox;
    try { bbox = el.getBBox(); } catch { return; }

    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const inst = findInstrumentForPoint(cx, cy);

    const baseOpacity = Number(el.getAttribute('opacity') || 1);
    el.dataset.baseOpacity = String(baseOpacity);

    if (inst) {
      el.dataset.usedBy = inst;
      usedBackgroundElements.push({
        el, inst, bbox,
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
    const area = Math.max(1, bbox.width * bbox.height);
    const count = Math.max(18, Math.min(130, Math.round(Math.sqrt(area) * 0.75)));

    for (let i = 0; i < count; i++) {
      const ox = bbox.x + rand() * Math.max(2, bbox.width);
      const oy = bbox.y + rand() * Math.max(2, bbox.height);
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const baseAngle = Math.atan2(oy - cy, ox - cx);
      const angle = baseAngle + lerp(-0.85, 0.85, rand());

      fireworkParticles.push({
        inst, ox, oy,
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

  const bgFade = smoothstep(0.18, 0.88, maxAssemble);
  const _tf    = window.__timeFade !== undefined ? window.__timeFade : 1;
  const _gf    = window.__globalFade ?? 1;
  backgroundSvg.style.opacity = String((1 - bgFade * 0.78) * _tf * _gf);

  const _sat = (window.__timeSat !== undefined) ? window.__timeSat : 1;
  backgroundSvg.style.filter =
    `saturate(${_sat.toFixed(3)}) ` +
    `grayscale(${(maxAssemble * 0.16).toFixed(3)}) ` +
    `blur(${(maxAssemble * 0.15).toFixed(3)}px)`;

  for (const item of usedBackgroundElements) {
    const s = groupAssemble[item.inst];
    const disappear = smoothstep(0.18, 0.80, s);
    const mtReveal = parseFloat(item.el.dataset.mtReveal ?? item.baseOpacity);
    const newOpacity = mtReveal * (1 - disappear);
    item.el.style.opacity = String(clamp(newOpacity));
  }
}

function drawFireworkParticlesFromUsedElements() {
  if (!particleCtx || !particleCanvas) return;
  particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const p0 of fireworkParticles) {
    const s = groupAssemble[p0.inst];
    if (s <= 0.02) continue;

    const burst = smoothstep(0.16, 0.84, s);
    const local = clamp((burst - p0.delay) / (1 - p0.delay));
    if (local <= 0) continue;

    const move   = easeOutCubic(local);
    const origin = designToScreen(p0.ox, p0.oy);
    const noiseT = getFrameValue() * 0.006;
    const wobbleX = particlePerlin(noiseT + p0.phase * 0.31, 0.001, -p0.wobble, p0.wobble) * local;
    const wobbleY = particlePerlin(noiseT + p0.phase * 0.47 + 80, 0.001, -p0.wobble, p0.wobble) * local;

    const x = origin.x + Math.cos(p0.angle) * p0.distance * move * origin.scale + wobbleX;
    const y = origin.y + Math.sin(p0.angle) * p0.distance * move * origin.scale + wobbleY;

    const lifeFade  = 1 - smoothstep(0.50, 1.0, local);
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
    particleCtx.arc(x, y, p0.size * particlePerlin(getFrameValue() * 0.006 + p0.phase, 0.001, 0.9, 1.28), 0, Math.PI * 2);
    particleCtx.fill();
  }

  particleCtx.globalAlpha = 1;
}

function loadInstrumentSvgs() {
  if (svgLoadPromise) return svgLoadPromise;

  svgLoadPromise = Promise.all(INSTRUMENTS.map(async inst => {
    const response = await fetch(SVG_FILES[inst]);
    const svgText  = await response.text();
    setupInstrumentSvg(inst, svgText);
  })).catch(err => {
    console.error('SVG loading failed:', err);
  });

  return svgLoadPromise;
}

function setupInstrumentSvg(inst, svgText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(svgText, 'image/svg+xml');
  const srcSvg = doc.querySelector('svg');
  if (!srcSvg) return;

  const vb = parseViewBox(srcSvg);
  const NS = 'http://www.w3.org/2000/svg';

  const wrap = document.createElement('div');
  wrap.className  = 'instrument-wrap';
  wrap.dataset.inst = inst;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const pieces   = [];
  const children = Array.from(srcSvg.children);
  const rand     = makeRandom(1000 + INSTRUMENTS.indexOf(inst) * 777);
  const bias     = SOURCE_BIAS[inst];
  const centerX  = vb.x + vb.w / 2;
  const centerY  = vb.y + vb.h / 2;

  children.forEach((child, index) => {
    const tag = child.tagName.toLowerCase();
    if (!['path','circle','rect','line','polyline','polygon','ellipse','g'].includes(tag)) return;

    const g = document.createElementNS(NS, 'g');
    g.classList.add('svg-piece');
    g.appendChild(child.cloneNode(true));
    svg.appendChild(g);

    const angle  = rand() * Math.PI * 2;
    const radius = lerp(0.55, 1.65, rand()) * Math.max(vb.w, vb.h) * 0.55;
    const biasX  = bias.x * vb.w * lerp(0.35, 1.05, rand());
    const biasY  = bias.y * vb.h * lerp(0.35, 1.05, rand());
    const dx     = Math.cos(angle) * radius + biasX;
    const dy     = Math.sin(angle) * radius + biasY;
    const rot    = lerp(-42, 42, rand());
    const delay  = Math.min(0.32, (index % 16) * 0.012 + rand() * 0.08);

    pieces.push({ el: g, dx, dy, rot, delay, cx: centerX, cy: centerY });
  });

  wrap.appendChild(svg);
  fragmentLayer.appendChild(wrap);
  instrumentViews[inst] = { wrap, svg, pieces, viewBox: vb };
}

function render() {
  for (const inst of INSTRUMENTS) {
    const target = Math.max(dragAssemble, groupPinned[inst]);
    groupTarget[inst]  = target;
    groupAssemble[inst] += (groupTarget[inst] - groupAssemble[inst]) * 0.08;
  }

  const maxAssemble = Math.max(...INSTRUMENTS.map(i => groupAssemble[i]));

  updateCompositionBackground(maxAssemble);
  drawFireworkParticlesFromUsedElements();

  if (typeof updateAudioReactive === 'function') updateAudioReactive();

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

  const e     = easeInOutCubic(s);
  const pos   = TARGET_POS[inst];
  const float = FLOAT_STYLE[inst];

  const floatStrength = smoothstep(0.45, 0.92, s);
  const noiseSpeed    = 0.0035 * float.speed;
  const floatX   = smoothPerlin(inst+'-float-x',   float.phase*10.0,     noiseSpeed, -float.ampX, float.ampX, 0.045) * floatStrength;
  const floatY   = smoothPerlin(inst+'-float-y',   float.phase*13.0+40,  noiseSpeed, -float.ampY, float.ampY, 0.045) * floatStrength;
  const floatRot = smoothPerlin(inst+'-float-rot',  float.phase*17.0+90, noiseSpeed, -float.rot,  float.rot,  0.040) * floatStrength;

  const tx    = pos.x * e + floatX;
  const ty    = pos.y * e + floatY;
  const scale = lerp(0.72, 1.0, e);
  view.wrap.style.transform = `translate3d(calc(-50% + ${tx}vw), calc(-50% + ${ty}vh), 0) scale(${scale}) rotate(${floatRot}deg)`;

  const _gf2 = window.__globalFade ?? 1;
  view.wrap.style.opacity = s < 0.015 ? 0 : clamp(s * s * 1.5 * _gf2, 0, 0.65);

  const band       = (window.audioBands && window.audioBands[inst]) || 0;
  const audioTarget = band * smoothstep(0.2, 0.7, s);
  if (view.flicker === undefined) view.flicker = 0;
  const flickerRate = audioTarget > view.flicker ? 0.55 : 0.12;
  view.flicker += (audioTarget - view.flicker) * flickerRate;
  const f = view.flicker;

  const _instSat  = window.__timeSat !== undefined ? window.__timeSat : 1;
  const _satBoost = _instSat + s * 2.2 + f * 1.5;
  view.wrap.style.filter =
    `brightness(${(1 + s * 0.3 + f * 0.85).toFixed(3)}) ` +
    `saturate(${_satBoost.toFixed(3)}) ` +
    `drop-shadow(0 0 ${(s * 15 + f * 22).toFixed(1)}px rgba(255, 240, 200, ${(s * 0.3 + f * 0.6).toFixed(3)}))`;

  for (const piece of view.pieces) {
    const local = clamp((s - piece.delay) / (1 - piece.delay));
    const p  = easeOutCubic(local);
    const dx = piece.dx * (1 - p);
    const dy = piece.dy * (1 - p);
    const rot = piece.rot * (1 - p);

    const micro      = floatStrength * 0.68;
    const microSeed  = piece.delay * 120 + float.phase * 15;
    const microSpeed = 0.004;
    const microX = smoothPerlin(inst+'-piece-'+piece.delay+'-x', microSeed,    microSpeed, -2.0, 2.0, 0.035) * micro;
    const microY = smoothPerlin(inst+'-piece-'+piece.delay+'-y', microSeed+60, microSpeed, -1.6, 1.6, 0.035) * micro;

    piece.el.setAttribute(
      'transform',
      `translate(${(dx+microX).toFixed(2)} ${(dy+microY).toFixed(2)}) rotate(${rot.toFixed(2)} ${piece.cx.toFixed(2)} ${piece.cy.toFixed(2)})`
    );
    piece.el.style.opacity = clamp((s - piece.delay * 0.45) * 2.2, 0, 1).toFixed(3);
  }
}

window.addEventListener('resize', () => { resizeParticleCanvas(); });

resizeParticleCanvas();
loadCompositionBackgroundSvg();
loadInstrumentSvgs();
loadAudioBuffers();
render();