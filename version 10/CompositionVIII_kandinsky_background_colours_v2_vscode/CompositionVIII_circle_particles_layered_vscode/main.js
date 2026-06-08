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

// Perlin breathing glow layer:
// placed above particles/background and below the instrument fragments.
const glowCanvas = document.createElement('canvas');
glowCanvas.id = 'glow-layer';
canvasEl.insertBefore(glowCanvas, fragmentLayer);
const glowCtx = glowCanvas.getContext('2d');

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
  piano:    ['#16080f', '#7b4f8d', '#f0c7b8', '#bf4f3e', '#f7f0e6', '#a9824b'],
  violin:   ['#bd8f35', '#a9824b', '#191314', '#d7b83f', '#4778a5', '#f7f0e6'],
  guitar:   ['#d7b83f', '#9db7c4', '#4778a5', '#bf4f3e', '#26384f', '#f7f0e6'],
  musicbox: ['#2f7fa3', '#4778a5', '#9a9b92', '#9db7c4', '#bf4f3e', '#f7f0e6']
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
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  if (particleCanvas && particleCtx) {
    particleCanvas.width = Math.round(window.innerWidth * dpr);
    particleCanvas.height = Math.round(window.innerHeight * dpr);
    particleCanvas.style.width = window.innerWidth + 'px';
    particleCanvas.style.height = window.innerHeight + 'px';
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  if (glowCanvas && glowCtx) {
    glowCanvas.width = Math.round(window.innerWidth * dpr);
    glowCanvas.height = Math.round(window.innerHeight * dpr);
    glowCanvas.style.width = window.innerWidth + 'px';
    glowCanvas.style.height = window.innerHeight + 'px';
    glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
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
    if (value.toLowerCase() === '#f3eadb') return;
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

      // Layered circular particles only:
      // no streak / no line tail, so the particles do not look like tadpoles.
      const layerRand = rand();
      const layer =
        layerRand < 0.55 ? 0 :      // near / clear dots
        layerRand < 0.86 ? 1 : 2;   // middle / far dust

      const depth = layer === 0 ? 1.00 : layer === 1 ? 1.35 : 1.85;

      fireworkParticles.push({
        inst, ox, oy,
        colour: colours[Math.floor(rand() * colours.length)],
        size: layer === 0 ? lerp(1.15, 2.65, rand())
              : layer === 1 ? lerp(0.75, 1.85, rand())
              : lerp(0.35, 1.05, rand()),
        layer,
        depth,
        angle,
        distance: lerp(38, 155, rand()) * depth,
        delay: lerp(0, 0.28, rand()),
        phase: rand() * Math.PI * 2,
        wobble: lerp(5, 20, rand()) * depth,
        swirl: lerp(-0.42, 0.42, rand()),
        alpha: layer === 0 ? lerp(0.42, 0.78, rand())
               : layer === 1 ? lerp(0.25, 0.52, rand())
               : lerp(0.12, 0.32, rand()),
        halo: rand() > 0.72
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

  const _sat = Math.min(1.08, (window.__timeSat !== undefined) ? window.__timeSat : 1);
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
  // Circle-only layered Perlin particles: no vertical lines, no tadpole tails.
  if (!particleCtx || !particleCanvas) return;
  particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Keep everything round: layered dots + soft circular glow only.
  // No lineTo(), no stroke tail, no vertical streaks.
  for (const p0 of fireworkParticles) {
    const s = groupAssemble[p0.inst];
    if (s <= 0.02) continue;

    const burst = smoothstep(0.16, 0.84, s);
    const local = clamp((burst - p0.delay) / (1 - p0.delay));
    if (local <= 0) continue;

    const move   = easeOutCubic(local);
    const origin = designToScreen(p0.ox, p0.oy);

    // p5.js noise controls organic drift and small circular-size variation.
    const noiseT = getFrameValue() * 0.0045;
    const driftX = particlePerlin(noiseT + p0.phase * 0.31, 0.001, -p0.wobble, p0.wobble) * local;
    const driftY = particlePerlin(noiseT + p0.phase * 0.47 + 80, 0.001, -p0.wobble, p0.wobble) * local;

    // Slight noise-based angle variation creates a soft firework cloud,
    // but the particles remain circular dots.
    const angleNoise = particlePerlin(noiseT + p0.phase * 0.63 + 160, 0.001, -1, 1);
    const angle = p0.angle + angleNoise * p0.swirl * local;

    const x = origin.x + Math.cos(angle) * p0.distance * move * origin.scale + driftX;
    const y = origin.y + Math.sin(angle) * p0.distance * move * origin.scale + driftY;

    // Particles appear, spread, then fade away.
    const lifeFade  = 1 - smoothstep(0.48, 1.0, local);
    const stateFade = 1 - smoothstep(0.82, 1.0, s) * 0.86;
    const alpha = p0.alpha * lifeFade * stateFade * 0.78;
    if (alpha <= 0.01) continue;

    const sizeNoise = particlePerlin(getFrameValue() * 0.005 + p0.phase + 220, 0.001, 0.88, 1.28);
    const r = p0.size * sizeNoise * origin.scale * 1.85;

    // Far dust layer: very small and soft.
    // Middle/near layer: clearer dots.
    if (p0.halo && p0.layer !== 2) {
      particleCtx.globalAlpha = alpha * 0.16;
      particleCtx.fillStyle = p0.colour;
      particleCtx.beginPath();
      particleCtx.arc(x, y, r * 3.8, 0, Math.PI * 2);
      particleCtx.fill();
    }

    particleCtx.globalAlpha = alpha;
    particleCtx.fillStyle = p0.colour;
    particleCtx.beginPath();
    particleCtx.arc(x, y, r, 0, Math.PI * 2);
    particleCtx.fill();

    // Tiny inner bright dot for layered Kandinsky-like particle texture.
    if (p0.layer === 0 && r > 1.1) {
      particleCtx.globalAlpha = alpha * 0.35;
      particleCtx.fillStyle = '#f7f0e6';
      particleCtx.beginPath();
      particleCtx.arc(x - r * 0.18, y - r * 0.18, r * 0.32, 0, Math.PI * 2);
      particleCtx.fill();
    }
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


// ============================================================
//  Perlin breathing glow
//  用 p5.js noise() 生成很淡的“呼吸光晕”。
//  它只在乐器形成后出现，位于乐器下方，不抢主体。
// ============================================================
const GLOW_STYLE = {
  piano:    { colour: 'rgba(168,120,184,', seed: 11.3, size: 0.92 },
  violin:   { colour: 'rgba(201,162,58,',  seed: 31.7, size: 0.86 },
  guitar:   { colour: 'rgba(231,210,74,',  seed: 53.2, size: 0.82 },
  musicbox: { colour: 'rgba(0,119,182,',   seed: 79.6, size: 0.88 }
};

function drawPerlinBreathingGlow() {
  if (!glowCtx || !glowCanvas) return;
  glowCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const maxAssemble = Math.max(...INSTRUMENTS.map(i => groupAssemble[i]));
  if (maxAssemble <= 0.03) return;

  glowCtx.globalCompositeOperation = 'source-over';

  for (const inst of INSTRUMENTS) {
    const s = groupAssemble[inst];
    if (s <= 0.08) continue;

    const formed = smoothstep(0.42, 0.92, s);
    const pos = TARGET_POS[inst];
    const g = GLOW_STYLE[inst];

    const cx = window.innerWidth  * (0.5 + pos.x / 100);
    const cy = window.innerHeight * (0.5 + pos.y / 100);

    // p5.js Perlin noise controls breathing size and opacity.
    const breathe = smoothPerlin(inst + '-breathing-glow', g.seed, 0.0045, 0.0, 1.0, 0.035);
    const radiusBase = Math.min(window.innerWidth, window.innerHeight) * 0.125 * g.size;
    const radius = radiusBase * (0.88 + breathe * 0.24) * formed;
    const alpha = (0.045 + breathe * 0.045) * formed;

    const grad = glowCtx.createRadialGradient(cx, cy, radius * 0.10, cx, cy, radius);
    grad.addColorStop(0.00, `${g.colour}${alpha})`);
    grad.addColorStop(0.42, `${g.colour}${alpha * 0.45})`);
    grad.addColorStop(1.00, `${g.colour}0)`);

    glowCtx.fillStyle = grad;
    glowCtx.beginPath();
    glowCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    glowCtx.fill();

    // A second very soft outer ring gives depth but remains subtle.
    const outerRadius = radius * (1.55 + breathe * 0.18);
    const outer = glowCtx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, outerRadius);
    outer.addColorStop(0.00, `${g.colour}${alpha * 0.18})`);
    outer.addColorStop(1.00, `${g.colour}0)`);
    glowCtx.fillStyle = outer;
    glowCtx.beginPath();
    glowCtx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    glowCtx.fill();
  }

  glowCtx.globalCompositeOperation = 'source-over';
  glowCtx.globalAlpha = 1;
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
  drawPerlinBreathingGlow();

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