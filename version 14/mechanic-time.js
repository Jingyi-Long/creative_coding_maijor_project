// mechanic-time.js — version 8 timeline v11
//
// Full timeline (timer starts on click, auto-loops at 98s):
//  0  – 12s  : All shapes appear as outlines/sketches, no fill
//  12 – 47s  : Colour fill + saturation gradually rises, reaches 100% at 47s
//  47 – 71s  : Shapes oscillate in scale + bloom lightly oscillates (smaller range)
//  72 – 80s  : Shapes scale back down
//  80 – 97s  : All shapes + bloom fade out together
//  97s       : Canvas is blank
//  98s       : Full loop reset, starts over

(function () {
  let clickTime = null;
  let inited    = false;

  // ── Timeline constants ────────────────────────────────────
  const SCALE_UP_BASE    = 47;
  const SCALE_DOWN_BASE  = 70;
  const BLOOM_FADE_START  = 80;   // bloom fades out with fill colour (80-88s)
  const BLOOM_FADE_END    = 88;
  const SHAPE_FADE_START  = 80;   // kept for main.js compatibility
  const SHAPE_FADE_DUR    = 17;
  const LOOP_AT           = 98;   // loop resets at 98s

  let newShapesInited = false;
  let newShapeItems   = [];
  let bloomItems      = [];
  let bloomCtx        = null;

  document.getElementById('canvas').addEventListener('pointerdown', () => {
    if (!clickTime) clickTime = performance.now();
  }, { once: true });

  // ── Decoration canvas layer (above shapes) ───────────────
  const decoCanvas = document.createElement('canvas');
  decoCanvas.id = 'deco-layer';
  decoCanvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;';
  document.getElementById('canvas')
    .insertBefore(decoCanvas, document.getElementById('particle-layer'));
  const decoCtx = decoCanvas.getContext('2d');

  function resizeDeco() {
    decoCanvas.width  = window.innerWidth;
    decoCanvas.height = window.innerHeight;
    if (bloomCtx) {
      bloomCtx.canvas.width  = window.innerWidth;
      bloomCtx.canvas.height = window.innerHeight;
    }
  }
  resizeDeco();
  window.addEventListener('resize', resizeDeco);

  // ── Utilities ─────────────────────────────────────────────
  function ss(t, a, b) {
    const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return k * k * (3 - 2 * k);
  }
  function sr(seed) {
    const x = Math.sin(seed + 1) * 43758.5453;
    return x - Math.floor(x);
  }
  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    return `rgba(${r},${g},${b},${Math.min(1,Math.max(0,alpha)).toFixed(3)})`;
  }

  const K_COLORS = [
    '#bf4f3e','#4778a5','#d7b83f','#000000',
    '#7b4f8d','#f0c7b8','#a9824b','#2f7fa3','#26384f'
  ];
  const BG_COLOR = '#f3eadb';

  const shapeItems = [];

  // ── Initialise background shapes ──────────────────────────
  function tryInit() {
    if (inited || !backgroundSvg) return;
    inited = true;

    window.__timeFade   = 1;
    window.__timeSat    = 1;
    window.__globalFade = 1;

    const usedEls = new Set((usedBackgroundElements || []).map(u => u.el));
    const candidates = [];

    Array.from(backgroundSvg.children).forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'rect' &&
          el.getAttribute('width')  === '1800' &&
          el.getAttribute('height') === '1260') return;

      el.style.opacity     = '0';
      el.style.fillOpacity = '0';
      el.dataset.mtReveal  = '0';

      const hasFill   = el.getAttribute('fill')   && el.getAttribute('fill')   !== 'none';
      const hasStroke = el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none';
      if (hasFill && !hasStroke) {
        el.style.stroke      = '#a0a0a0';
        el.style.strokeWidth = '0.8';
      }

      candidates.push({ el, isUsed: usedEls.has(el) });
    });

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(sr(i * 7 + 3) * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const total = candidates.length;

    candidates.forEach(({ el, isUsed }, i) => {
      const slot       = 11.0 * (i / Math.max(1, total - 1));
      const jitter     = (sr(i * 11 + 1) - 0.5) * 0.6;
      const revealTime = Math.max(0, Math.min(11.0, slot + jitter));

      const fadeDuration  = 0.3 + sr(i * 19 + 8) * 0.3;
      const targetOpacity = 0.75 + sr(i * 17 + 5) * 0.25;

      const fillSlot   = 33.0 * (i / Math.max(1, total - 1));
      const fillJitter = (sr(i * 31 + 2) - 0.5) * 1.0;
      const fillStart  = 12.0 + Math.max(0, Math.min(33.0, fillSlot + fillJitter));
      const fillDuration = 1.0 + sr(i * 29 + 6) * 0.8;
      const peakSat      = 0.92 + sr(i * 37 + 7) * 0.18;  // muted Kandinsky-like colour

      const scalePeak         = 1.15 + sr(i * 45 + 15) * 0.25;
      const oscFreq           = (0.25 + sr(i * 53 + 21) * 0.30) * Math.PI * 2;
      const oscPhase          = sr(i * 59 + 23) * Math.PI * 2;
      const scaleDownDuration = 9.0 + sr(i * 49 + 19) * 3;

      shapeItems.push({
        el, isUsed,
        revealTime, fadeDuration, targetOpacity,
        fillStart, fillDuration, peakSat,
        scalePeak, oscFreq, oscPhase, scaleDownDuration,
        _op:-1, _fo:-1, _sat:-1, _sc:-1
      });
    });

    const sorted = [...shapeItems].sort((a, b) => a.revealTime - b.revealTime);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].revealTime - sorted[i-1].revealTime < 0.08)
        sorted[i].revealTime = sorted[i-1].revealTime + 0.08;
    }
  }

  // ── Initialise new shapes & bloom (triggered at 48s) ─────
  function initNewShapes() {
    if (newShapesInited || !backgroundSvg) return;
    newShapesInited = true;

    const bc = document.createElement('canvas');
    bc.id = 'bloom-layer';
    bc.width  = window.innerWidth;
    bc.height = window.innerHeight;
    bc.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;';
    document.getElementById('canvas').appendChild(bc);
    bloomCtx = bc.getContext('2d');

    const NS    = 'http://www.w3.org/2000/svg';
    const COUNT = 28;

    // Non-black Kandinsky colour pool for triangle fills (cycled to avoid adjacent duplicates)
    const K_COLORS_NO_BLACK = K_COLORS.filter(c => c !== '#000000');
    let triColorIdx = 0;  // round-robin index for triangle colours

    for (let i = 0; i < COUNT; i++) {
      const seed = i * 61 + 100;
      const type = Math.floor(sr(seed) * 4); // 0=curve 1=line 2=circle 3=triangle
      const x    = 80  + sr(seed+1) * 1640;
      const y    = 80  + sr(seed+2) * 1100;
      const size = 25  + sr(seed+3) * 160;
      const sw   = 1.2 + sr(seed+4) * 4;
      const useBlack     = sr(seed+5) > 0.35;
      const color        = useBlack ? '#000000'
        : K_COLORS[Math.floor(sr(seed+6) * K_COLORS.length)];
      const hasFillShape = sr(seed+7) > 0.55;
      // Triangle fill colour: cycled in order so no two adjacent triangles share a colour
      const triFillColor = K_COLORS_NO_BLACK[triColorIdx % K_COLORS_NO_BLACK.length];

      // Scale-oscillation params for new shapes (small amplitude)
      const newScalePeak = 1.06 + sr(seed+17) * 0.08;  // 1.06-1.14x small range
      const newOscFreq   = (0.25 + sr(seed+18) * 0.25) * Math.PI * 2;
      const newOscPhase  = sr(seed+19) * Math.PI * 2;

      let el;
      if (type === 0) {
        el = document.createElementNS(NS, 'path');
        const len=120+sr(seed+8)*350, ang=sr(seed+9)*Math.PI*2;
        const x2=x+Math.cos(ang)*len, y2=y+Math.sin(ang)*len;
        const cp1x=x+(sr(seed+10)-.5)*200, cp1y=y+(sr(seed+11)-.5)*200;
        const cp2x=x2+(sr(seed+12)-.5)*200, cp2y=y2+(sr(seed+13)-.5)*200;
        el.setAttribute('d',`M${x},${y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`);
        el.setAttribute('fill','none');
        el.setAttribute('stroke','#000000');
        el.setAttribute('stroke-width', sw*1.2);
      } else if (type === 1) {
        el = document.createElementNS(NS, 'line');
        const len=60+sr(seed+8)*320, ang=sr(seed+9)*Math.PI*2;
        el.setAttribute('x1',x); el.setAttribute('y1',y);
        el.setAttribute('x2',x+Math.cos(ang)*len);
        el.setAttribute('y2',y+Math.sin(ang)*len);
        el.setAttribute('stroke','#000000');
        el.setAttribute('stroke-width',sw);
      } else if (type === 2) {
        el = document.createElementNS(NS, 'circle');
        el.setAttribute('cx',x); el.setAttribute('cy',y);
        el.setAttribute('r',size*.5);
        el.setAttribute('fill', hasFillShape?color:'none');
        el.setAttribute('stroke',color);
        el.setAttribute('stroke-width',sw);
      } else {
        // Triangle: no stroke, fill colour cycled from non-black palette
        el = document.createElementNS(NS, 'polygon');
        const r=size*.6, a0=sr(seed+8)*Math.PI*2;
        const pts=[0,1,2].map(k=>{
          const a=a0+k*Math.PI*2/3;
          return `${(x+Math.cos(a)*r).toFixed(1)},${(y+Math.sin(a)*r).toFixed(1)}`;
        }).join(' ');
        el.setAttribute('points',pts);
        el.setAttribute('fill', triFillColor);
        el.setAttribute('stroke', 'none');
        triColorIdx++;
      }

      el.style.opacity     = '0';
      el.style.fillOpacity = '1';
      backgroundSvg.appendChild(el);

      // Extra rotation params for triangles only
      const isTriangle = (type === 3);
      const rotAmp_n   = isTriangle ? (10 + sr(seed+20) * 20) : 0;  // 10-30°
      const rotFreq_n  = isTriangle ? (0.15 + sr(seed+21) * 0.2) * Math.PI * 2 : 0;
      const rotPhase_n = isTriangle ? sr(seed+22) * Math.PI * 2 : 0;

      newShapeItems.push({
        el,
        spawnTime:     SCALE_UP_BASE + sr(seed+14) * 10,
        spawnDuration: 0.8 + sr(seed+15) * 1.5,
        newScalePeak, newOscFreq, newOscPhase,
        isTriangle, rotAmp_n, rotFreq_n, rotPhase_n,
        _op: -1, _fo: -1, _sc: -1
      });
    }

    // Pick 5 filled shapes for bloom
    const pool = shapeItems.filter(x => {
      const f = x.el.getAttribute('fill');
      return f && f !== 'none' && !f.startsWith('url(') && f !== '#f3eadb';
    });

    // Randomly pick 4, then drop the one closest to the top-left (smallest x+y)
    const picked = new Set();
    let attempt  = 0;
    while (picked.size < 4 && attempt < 300) {
      picked.add(pool[Math.floor(sr(attempt * 71 + 200) * pool.length)]);
      attempt++;
    }
    // Remove the top-left item from the selected set
    let topLeftItem = null, topLeftVal = Infinity;
    for (const item of picked) {
      try {
        const bb = item.el.getBBox ? item.el.getBBox() : null;
        if (bb) {
          const val = bb.x + bb.y;
          if (val < topLeftVal) { topLeftVal = val; topLeftItem = item; }
        }
      } catch {}
    }
    if (topLeftItem) picked.delete(topLeftItem);

    // Force-add the bottom-right shape (largest x+y) as the 5th bloom source
    let brItem = null, brVal = -Infinity;
    for (const item of pool) {
      if (picked.has(item)) continue;
      try {
        const bb = item.el.getBBox ? item.el.getBBox() : null;
        if (bb) {
          const val = bb.x + bb.y;
          if (val > brVal) { brVal = val; brItem = item; }
        }
      } catch {}
    }
    if (brItem) picked.add(brItem);

    let bi = 0;
    for (const item of picked) {
      bloomItems.push({
        el:           item.el,
        color:        item.el.getAttribute('fill') || '#bf4f3e',
        bloomStart:   SCALE_UP_BASE + sr(bi * 83 + 300) * 4,
        bloomDuration:10 + sr(bi * 89 + 301) * 8,
        oscPhase:     sr(bi * 97 + 400) * Math.PI * 2,
        bbox:         null
      });
      bi++;
    }
  }

  // ── Bloom drawing (shrinks and fades 72-84s, disappears before shapes) ──
  function drawBloom(t) {
    if (!bloomCtx || !bloomItems.length) return;
    if (typeof getMainArtRect !== 'function') return;

    const bloomFade = 1 - ss(t, BLOOM_FADE_START, BLOOM_FADE_END);
    bloomCtx.clearRect(0, 0, bloomCtx.canvas.width, bloomCtx.canvas.height);
    if (bloomFade <= 0) return;

    const rect = getMainArtRect();

    const bEnvIn  = ss(t, SCALE_UP_BASE, SCALE_UP_BASE + 2);
    const bEnvOut = 1 - ss(t, BLOOM_FADE_START, BLOOM_FADE_END);
    const bEnv    = Math.min(bEnvIn, bEnvOut);
    const bFreq   = 0.30 * Math.PI * 2;

    for (const b of bloomItems) {
      const prog = ss(t, b.bloomStart, b.bloomStart + b.bloomDuration) * bloomFade;
      if (prog <= 0) continue;

      if (!b.bbox) {
        try { b.bbox = b.el.getBBox(); } catch { continue; }
      }
      const bbox = b.bbox;
      if (!bbox || bbox.width + bbox.height === 0) continue;

      const cx     = rect.left + (bbox.x + bbox.width  * 0.5) / 1800 * rect.width;
      const cy     = rect.top  + (bbox.y + bbox.height * 0.5) / 1260 * rect.height;
      const shapeR = Math.max(bbox.width, bbox.height) * 0.5 * rect.scale;

      const osc        = 0.5 + 0.5 * Math.sin(bFreq * (t - SCALE_UP_BASE) + b.oscPhase);
      const bloomScale = 1 + 0.2 * bEnv * osc;  // very subtle scale oscillation
      // shapeR * 2.5 controls bloom base size (was 6, reduced to 2.5)
      const maxR       = shapeR + shapeR * 2.5 * prog * bloomScale;

      const g1 = bloomCtx.createRadialGradient(cx, cy, shapeR * 0.5, cx, cy, maxR * 0.55);
      g1.addColorStop(0,   hexToRgba(b.color, 0.85 * prog));
      g1.addColorStop(0.3, hexToRgba(b.color, 0.65 * prog));
      g1.addColorStop(0.7, hexToRgba(b.color, 0.25 * prog));
      g1.addColorStop(1,   hexToRgba(b.color, 0));
      bloomCtx.fillStyle = g1;
      bloomCtx.beginPath();
      bloomCtx.arc(cx, cy, maxR * 0.55, 0, Math.PI * 2);
      bloomCtx.fill();

      const g2 = bloomCtx.createRadialGradient(cx, cy, shapeR * 0.8, cx, cy, maxR);
      g2.addColorStop(0,    hexToRgba(b.color,  0.5  * prog));
      g2.addColorStop(0.4,  hexToRgba(b.color,  0.3  * prog));
      g2.addColorStop(0.75, hexToRgba(BG_COLOR, 0.6  * prog));
      g2.addColorStop(1,    hexToRgba(BG_COLOR, 0));
      bloomCtx.fillStyle = g2;
      bloomCtx.beginPath();
      bloomCtx.arc(cx, cy, maxR, 0, Math.PI * 2);
      bloomCtx.fill();

      const g3 = bloomCtx.createRadialGradient(cx, cy, 0, cx, cy, shapeR * 1.2 * bloomScale);
      g3.addColorStop(0,   hexToRgba(b.color, 0.6  * prog));
      g3.addColorStop(0.5, hexToRgba(b.color, 0.35 * prog));
      g3.addColorStop(1,   hexToRgba(b.color, 0));
      bloomCtx.fillStyle = g3;
      bloomCtx.beginPath();
      bloomCtx.arc(cx, cy, shapeR * 1.8 * bloomScale, 0, Math.PI * 2);
      bloomCtx.fill();
    }
  }

  // ── Shape scale calculation (oscillation + envelope, no rotation) ────
  function getScale(item, t) {
    if (t < SCALE_UP_BASE) return 1;
    const envIn  = ss(t, SCALE_UP_BASE, SCALE_UP_BASE + 2);
    const envOut = 1 - ss(t, SCALE_DOWN_BASE, SCALE_DOWN_BASE + item.scaleDownDuration);
    const envelope = Math.min(envIn, envOut);
    const osc = 0.5 + 0.5 * Math.sin(item.oscFreq * (t - SCALE_UP_BASE) + item.oscPhase);
    return 1 + (item.scalePeak - 1) * envelope * osc;
  }

  // ── Loop reset ────────────────────────────────────────────
  function resetLoop() {
    const bc = document.getElementById('bloom-layer');
    if (bc) bc.remove();
    bloomCtx = null;

    for (const item of newShapeItems) {
      try { item.el.remove(); } catch {}
    }

    for (const item of shapeItems) {
      item.el.style.opacity     = '0';
      item.el.style.fillOpacity = '0';
      item.el.style.filter      = '';
      item.el.style.transform   = '';
      item.el.dataset.mtReveal  = '0';
      item._op = -1; item._fo = -1; item._sat = -1; item._sc = -1;
    }

    shapeItems.length    = 0;
    newShapeItems.length = 0;
    bloomItems.length    = 0;
    inited          = false;
    newShapesInited = false;
    window.__globalFade = 1;

    clickTime = performance.now();
  }

  // ── Main loop ─────────────────────────────────────────────
  function tick() {
    const t = clickTime ? (performance.now() - clickTime) / 1000 : 0;

    if (clickTime && t >= LOOP_AT) {
      resetLoop();
      requestAnimationFrame(tick);
      return;
    }

    if (!inited) tryInit();
    if (inited && !newShapesInited && t >= SCALE_UP_BASE) initNewShapes();

    window.__timeFade   = 1;
    window.__timeSat    = 1;

    // Two-phase fade: fill fades 80-88s, outlines/everything fades 89-97s
    const fillFade = 1 - ss(t, 80, 88);   // fill fade-out
    const lineFade = 1 - ss(t, 89, 97);   // outline/overall fade-out
    window.__globalFade = lineFade;

    for (const item of shapeItems) {
      if (t < item.revealTime) {
        if (item._op !== 0) {
          item.el.style.opacity     = '0';
          item.el.style.fillOpacity = '0';
          item.el.dataset.mtReveal  = '0';
          item._op = 0;
        }
        continue;
      }

      const revealFactor  = ss(t, item.revealTime, item.revealTime + item.fadeDuration);
      // Outline opacity (fades 89-97s)
      const revealOpacity = item.targetOpacity * revealFactor * lineFade;

      const fillProgress = ss(t, item.fillStart, item.fillStart + item.fillDuration);
      const sat = fillProgress < 0.01 ? 0 : 0.05 + (item.peakSat - 0.05) * fillProgress;

      const scale = getScale(item, t);
      const scStr = scale.toFixed(4);
      if (item._sc !== scStr) {
        item.el.style.transformBox    = 'fill-box';
        item.el.style.transformOrigin = 'center center';
        item.el.style.transform       = `scale(${scStr})`;
        item._sc = scStr;
      }

      const revStr = revealOpacity.toFixed(3);
      if (item.el.dataset.mtReveal !== revStr) item.el.dataset.mtReveal = revStr;

      if (!item.isUsed) {
        const opStr = revealOpacity.toFixed(3);
        if (item._op !== opStr) { item.el.style.opacity = opStr; item._op = opStr; }
      }

      // Fill opacity fades out 80-88s
      const fo    = fillProgress * fillFade;
      const foStr = fo.toFixed(3);
      if (item._fo !== foStr) { item.el.style.fillOpacity = foStr; item._fo = foStr; }

      // Saturation fades out together with fill
      const satStr = (sat * fillFade).toFixed(3);
      if (item._sat !== satStr) {
        item.el.style.filter = fillProgress > 0.01 ? `saturate(${satStr})` : 'saturate(0)';
        item._sat = satStr;
      }
    }

    // New Kandinsky shapes: fill fades 80-88s, outlines fade 89-97s
    for (const item of newShapeItems) {
      const spawnProg = ss(t, item.spawnTime, item.spawnTime + item.spawnDuration);
      // Outline/overall opacity
      const opVal = spawnProg * lineFade;
      const opStr = opVal.toFixed(3);
      if (item._op !== opStr) { item.el.style.opacity = opStr; item._op = opStr; }
      // Fill fade-out
      const foStr = fillFade.toFixed(3);
      if (item._fo !== foStr) { item.el.style.fillOpacity = foStr; item._fo = foStr; }

      // Small-amplitude scale oscillation; triangles also rotate
      if (opVal > 0) {
        const nEnvIn  = ss(t, SCALE_UP_BASE, SCALE_UP_BASE + 2);
        const nEnvOut = 1 - ss(t, SCALE_DOWN_BASE, SCALE_DOWN_BASE + 10);
        const nEnv    = Math.min(nEnvIn, nEnvOut);
        const nOsc    = 0.5 + 0.5 * Math.sin(item.newOscFreq * (t - SCALE_UP_BASE) + item.newOscPhase);
        const nScale  = 1 + (item.newScalePeak - 1) * nEnv * nOsc;
        const nRot = item.isTriangle
          ? item.rotAmp_n * nEnv * Math.sin(item.rotFreq_n * (t - SCALE_UP_BASE) + item.rotPhase_n)
          : 0;
        const scStr = nScale.toFixed(4) + '|' + nRot.toFixed(3);
        if (item._sc !== scStr) {
          item.el.style.transformBox    = 'fill-box';
          item.el.style.transformOrigin = 'center center';
          item.el.style.transform       = `scale(${nScale.toFixed(4)}) rotate(${nRot.toFixed(2)}deg)`;
          item._sc = scStr;
        }
      }
    }

    decoCtx.clearRect(0, 0, decoCanvas.width, decoCanvas.height);
    drawBloom(t);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();