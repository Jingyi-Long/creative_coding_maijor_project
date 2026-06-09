// mechanic-userinput.js — 【Mechanic: User input】
// Creative director: Xiaoyu Xia
// * User Input Mechanic — IDEA9103 Major Project
// Author: Xiaoyu Xia (xxia0518)
//
// AI Usage: Gemini, Cursor + Codex, and Claude (Anthropic) were used iteratively
// to refine ideas, brainstorm creative directions, and improve the implementation.
// All final design decisions, Figma asset creation, and conceptual framing were
// made by the author.
// This file owns all user input and every visual reaction it triggers.
// Structured in two parts:
//
//   Part 1 — Input capture  (loads before main.js)
//     Translates keyboard / drag / scroll / mouse position into control signals.
//     Outputs:
//       groupPinned[inst]           discrete toggle per instrument
//       dragAssemble                global continuous assembly 0..1
//       window.mouseInfluence(x,y)  local mouse-field API for other modules
//       window.mousePos             raw pointer position + velocity
//
//   Part 2 — Shape reactions  (initialises after main.js via internal retry loop)
//     Consumes window.mousePos and click events to animate individual SVG shapes
//     in the background composition:
//       Circles    — expand, breathe, outer ripple ring
//       Lines      — Bézier bend + stretch (lines converted to paths at init)
//       Triangles  — continuous spin + warm colour tint on proximity
//       Rectangles — tilt, flip, scale
//       Click      — expanding ripple wave + short pitched note from canvas position
//       Hover      — periodic soft ripple ring while the mouse is moving
//
//   Cross-file dependencies (provided at runtime):
//     INSTRUMENTS, groupAssemble, findInstrumentForPoint(), getMainArtRect()  ← main.js
//     startAudio(), getAudioContext()                                          ← mechanic-audio.js

const groupPinned = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart    = null;        // Drag start point (screen coordinates)
let dragMoved    = false;       // Whether movement exceeded the threshold (used to tell "click" from "drag")
let dragAssemble = 0;           // Current assembly strength 0..1
let locked       = false;       // Whether the current state is locked

// Drag velocity tracking — used to implement "flick = forte, slow drag = piano"
let lastMove     = { x:0, y:0, t:0 };
let dragVelocity = 0;

const DRAG_THRESHOLD = 5;       // Movement < 5px is not a drag (allows "click" detection)

// User system preference: reduce motion. Accessibility best practice.
const prefersReducedMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
//  HUD - cache DOM references to avoid querySelector every frame.
//  Lazy init: input-mechanic.js loads before main.js, so INSTRUMENTS
//  is not defined yet here; the cache is built on the first updateHud() call.
// ============================================================
let hudRows = null;
let hudLock = null;

function initHudCache() {
  hudRows = {};
  for (const inst of INSTRUMENTS) {
    hudRows[inst] = document.querySelector(
      '#hud-groups .grow[data-inst="' + inst + '"]'
    );
  }
  hudLock = document.getElementById('lock-state');
}

function updateHud() {
  if (!hudRows) initHudCache();

  for (const inst of INSTRUMENTS) {
    const row = hudRows[inst];
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
  if (hudLock) hudLock.textContent = locked ? '🔒 Locked [L]' : '';
}

// ============================================================
//  Mouse drag / touch  —  with velocity sensing + threshold + click detection
// ============================================================
function onDown(e) {
  startAudio();
  const p = pointPos(e);
  dragStart    = { x: p.x, y: p.y };
  dragMoved    = false;
  dragVelocity = 0;
  lastMove     = { x: p.x, y: p.y, t: performance.now() };
}

function onMove(e) {
  // On touch, prevent page scrolling (otherwise dragging on mobile drags the page too)
  if (e.touches) e.preventDefault();
  if (!dragStart || prefersReducedMotion) return;

  const p   = pointPos(e);
  const now = performance.now();
  const dt  = Math.max(1, now - lastMove.t);

  // Instantaneous velocity (pixels/millisecond)
  dragVelocity = Math.hypot(p.x - lastMove.x, p.y - lastMove.y) / dt;
  lastMove     = { x: p.x, y: p.y, t: now };

  // Drag distance
  const d = Math.hypot(p.x - dragStart.x, p.y - dragStart.y);
  if (d < DRAG_THRESHOLD) return;     // Within threshold is not a drag
  dragMoved = true;

  // Base assembly strength (based on distance)
  const maxDrag = Math.min(window.innerWidth, window.innerHeight) * 0.30;
  const baseT   = Math.min(1, d / maxDrag);

  // Velocity boost: a fast flick "snaps" the assembly up, mimicking musical dynamics
  const velocityBoost = Math.min(0.25, dragVelocity * 0.015);

  const target = Math.min(1, baseT + velocityBoost);
  dragAssemble += (target - dragAssemble) * 0.16;
}

function onUp() {
  const wasDragging = dragMoved;
  const startPoint  = dragStart;
  dragStart = null;
  dragMoved = false;

  // No drag → this is a "click" → check whether it hit an instrument region on screen
  if (!wasDragging && startPoint) {
    handleAreaClick(startPoint);
    return;
  }

  // Decay after releasing a drag.
  // Use requestAnimationFrame instead of setInterval to avoid stacking up
  // multiple intervals on repeated releases, which would make decay too fast.
  if (!locked) {
    const decay = () => {
      dragAssemble *= 0.90;
      if (dragAssemble > 0.01) requestAnimationFrame(decay);
      else dragAssemble = 0;
    };
    requestAnimationFrame(decay);
  }
}

function pointPos(e) {
  if (e.touches && e.touches[0])
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0])
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

// ============================================================
//  Click on a region → trigger the matching instrument
//  Uses main.js's USED_AREAS / findInstrumentForPoint():
//  each instrument has a set of cover areas (represented as circles) on screen;
//  whichever area is clicked triggers that instrument.
//  Screen coordinates are converted back to the design canvas (1800×1260) before testing.
// ============================================================
function handleAreaClick(p) {
  if (typeof findInstrumentForPoint !== 'function' ||
      typeof getMainArtRect        !== 'function') return;

  const rect    = getMainArtRect();
  const designX = (p.x - rect.left) / rect.scale;
  const designY = (p.y - rect.top)  / rect.scale;
  const inst    = findInstrumentForPoint(designX, designY);

  if (inst) {
    groupPinned[inst] = groupPinned[inst] > 0.5 ? 0 : 1;
  }
}

// ============================================================
//  Scroll wheel  →  a second continuous input channel, independent of dragging
//  Friendly for users without a touchscreen / who can't easily drag;
//  a laptop trackpad's two-finger scroll triggers it too.
// ============================================================
document.addEventListener('wheel', e => {
  startAudio();
  if (prefersReducedMotion) return;
  // deltaY is usually ±100; multiply by a small factor to smooth the scroll;
  // scroll up → assembly increases; scroll down → assembly decreases.
  dragAssemble = Math.max(0, Math.min(1, dragAssemble - e.deltaY * 0.001));
  e.preventDefault();
}, { passive: false });

// ============================================================
//  ★ Mouse-proximity reaction — turn mouse position into an "influence field"
//
//  This is the most important new feature of this mechanic: without clicking
//  or dragging, simply moving the mouse near the shapes/particles on screen
//  pushes them away / rotates them slightly, like ripples on water.
//
//  Fully decoupled by design: this only computes "the mouse's influence" and
//  never modifies any visual element directly. Other modules (mainly the
//  particle drawing and instrument transforms in main.js) actively query it
//  via window.mouseInfluence(x, y) and receive:
//    strength : 0..1, larger the closer (quadratic falloff, near-zero at the edge)
//    dx, dy   : unit direction vector pointing from the mouse to (x, y) (for "pushing away")
//    angle    : same as above but in radians (for rotation)
//    speed    : the mouse's current movement speed (can be used as disturbance strength)
//
//  Benefits of this design:
//   - input-mechanic.js doesn't need to know main.js's internal structure
//   - any new module can read this field directly, without changing input code
//   - disabling/tuning RIPPLE_RADIUS turns the whole thing off with no side effects
// ============================================================
const mouse           = { x: -9999, y: -9999, active: false, vx: 0, vy: 0 };
let   lastMousePos    = { x: 0, y: 0, t: 0 };

const RIPPLE_RADIUS   = 180;     // Influence radius (screen pixels)
const RIPPLE_STRENGTH = 1.0;     // Overall strength coefficient

document.addEventListener('mousemove', e => {
  const now = performance.now();
  const dt  = Math.max(1, now - lastMousePos.t);
  mouse.vx     = (e.clientX - lastMousePos.x) / dt;
  mouse.vy     = (e.clientY - lastMousePos.y) / dt;
  mouse.x      = e.clientX;
  mouse.y      = e.clientY;
  mouse.active = true;
  lastMousePos = { x: e.clientX, y: e.clientY, t: now };
});

document.addEventListener('mouseleave', () => { mouse.active = false; });

window.mouseInfluence = function(x, y) {
  const empty = { strength: 0, dx: 0, dy: 0, angle: 0, speed: 0 };
  if (!mouse.active || prefersReducedMotion) return empty;

  const ddx  = x - mouse.x;
  const ddy  = y - mouse.y;
  const dist = Math.hypot(ddx, ddy);
  if (dist > RIPPLE_RADIUS) return empty;

  // Quadratic falloff: strong at the center, weak at the edge, for a more focused effect
  const t        = 1 - dist / RIPPLE_RADIUS;
  const strength = t * t * RIPPLE_STRENGTH;

  return {
    strength,
    dx: ddx / Math.max(1, dist),
    dy: ddy / Math.max(1, dist),
    angle: Math.atan2(ddy, ddx),
    speed: Math.hypot(mouse.vx, mouse.vy)
  };
};

// Also expose the raw position directly; some modules only need the coordinates
window.mousePos = mouse;

// ============================================================
//  Keyboard
//  - 1/2/3/4: toggle the matching instrument
//  - 5:      assemble all
//  - 0:      return to the original artwork (and unlock)
//  - L / Space: lock / unlock
//  Improvements:
//   1) Ignore keys typed inside input fields (avoid stealing focus)
//   2) Ignore the OS "hold to auto-repeat", which would make the toggle flicker
// ============================================================
const keyHeld = {};
const keyMap  = { '1':'piano', '2':'violin', '3':'guitar', '4':'musicbox' };

document.addEventListener('keydown', e => {
  // Don't grab keys inside an input/textarea (none in this project, but good practice)
  if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
  if (keyHeld[e.key]) return;        // Block multiple triggers from OS auto-repeat
  keyHeld[e.key] = true;

  startAudio();
  const key = e.key;

  if (keyMap[key]) {
    const inst = keyMap[key];
    groupPinned[inst] = groupPinned[inst] > 0.5 ? 0 : 1;
  }

  if (key === '5') INSTRUMENTS.forEach(i => groupPinned[i] = 1);

  if (key === '0') {
    INSTRUMENTS.forEach(i => groupPinned[i] = 0);
    locked = false;
  }

  if (key === 'l' || key === 'L' || key === ' ') {
    locked = !locked;
    if (!locked && !INSTRUMENTS.some(i => groupPinned[i] > 0.5))
      dragAssemble = 0;
    e.preventDefault();              // Prevent Space from scrolling the page
  }
});

document.addEventListener('keyup', e => { keyHeld[e.key] = false; });

// ============================================================
//  Event binding
//  touchstart / touchmove are explicitly passive:false so preventDefault works;
//  otherwise modern browsers ignore preventDefault and the page scrolls while dragging.
// ============================================================
document.addEventListener('mousedown',  onDown);
document.addEventListener('mousemove',  onMove);
document.addEventListener('mouseup',    onUp);
document.addEventListener('touchstart', onDown, { passive: false });
document.addEventListener('touchmove',  onMove, { passive: false });
document.addEventListener('touchend',   onUp);

// ============================================================
//  Part 2 — Shape reactions
//  Reads window.mousePos (set above) and click events to animate
//  individual elements in the background composition SVG.
//  Initialises via a retry loop — safe to run before main.js finishes.
// ============================================================

(function () {
  const MOUSE_RADIUS = 300;
  const LINE_MAX_BEND = 90;
  const LINE_MAX_STRETCH = 22;
  const SPRING = 0.085;
  const FRICTION = 0.78;
  const HOVER_WAVE_INTERVAL = 0.16;  // seconds
  const HOVER_WAVE_LIFE = 0.8;       // seconds
  const HOVER_WAVE_RADIUS = 135;     // design units
  const CLICK_WAVE_SPEED = 500;     // design units / second
  const CLICK_WAVE_WIDTH = 42;      // ring thickness in design units
  const CLICK_WAVE_LIFE = 2.0;      // seconds
  const CLICK_WAVE_STRENGTH = 1.1;
  const TRIANGLE_TINT = '#f59f42';

  const lineItems = [];
  const circleItems = [];
  const triangleItems = [];
  const rectItems = [];
  const clickWaves = [];
  const hoverWaves = [];

  let rippleLayer = null;
  let initialized = false;
  let initRetries = 0;
  let lastHoverWaveSec = -999;

  function clamp(v, min = 0, max = 1) {
    return Math.max(min, Math.min(max, v));
  }

  function springTo(item, key, target, spring = SPRING, friction = FRICTION) {
    const velocityKey = `${key}Velocity`;
    if (item[key] === undefined) item[key] = 0;
    if (item[velocityKey] === undefined) item[velocityKey] = 0;
    item[velocityKey] += (target - item[key]) * spring;
    item[velocityKey] *= friction;
    item[key] += item[velocityKey];
    return item[key];
  }

  function parseHexColour(col) {
    if (!col) return null;
    const c = col.trim().toLowerCase();
    if (c === 'none' || c === 'transparent' || c.startsWith('url(')) return null;

    if (c.startsWith('#')) {
      const h = c.slice(1);
      if (h.length === 3) {
        return {
          r: parseInt(h[0] + h[0], 16),
          g: parseInt(h[1] + h[1], 16),
          b: parseInt(h[2] + h[2], 16)
        };
      }
      if (h.length === 6) {
        return {
          r: parseInt(h.slice(0, 2), 16),
          g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16)
        };
      }
    }

    const rgb = c.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
    if (rgb) {
      return {
        r: Math.round(parseFloat(rgb[1])),
        g: Math.round(parseFloat(rgb[2])),
        b: Math.round(parseFloat(rgb[3]))
      };
    }

    return null;
  }

  function toHex({ r, g, b }) {
    const n2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${n2(r)}${n2(g)}${n2(b)}`;
  }

  function mixColour(a, b, t) {
    const aa = parseHexColour(a);
    const bb = parseHexColour(b);
    if (!aa || !bb) return a;
    const tt = clamp(t);
    return toHex({
      r: aa.r + (bb.r - aa.r) * tt,
      g: aa.g + (bb.g - aa.g) * tt,
      b: aa.b + (bb.b - aa.b) * tt
    });
  }

  function getAssembleDamping() {
    if (typeof groupAssemble === 'undefined' || typeof INSTRUMENTS === 'undefined') return 1;
    const peak = Math.max(...INSTRUMENTS.map((i) => groupAssemble[i] || 0));
    return 1 - clamp(peak * 0.65, 0, 0.65);
  }

  function getDesignPointFromScreen(x, y) {
    if (typeof getMainArtRect !== 'function') return null;
    const rect = getMainArtRect();
    return {
      x: (x - rect.left) / rect.scale,
      y: (y - rect.top) / rect.scale
    };
  }

  function getDesignMouse() {
    if (!window.mousePos || !window.mousePos.active) return null;
    const p = getDesignPointFromScreen(window.mousePos.x, window.mousePos.y);
    if (!p) return null;
    p.speed = Math.hypot(window.mousePos.vx || 0, window.mousePos.vy || 0);
    p.speedBoost = clamp(p.speed * 0.75, 0, 1.4);
    return p;
  }

  function removeWave(list, index) {
    const w = list[index];
    if (w && w.el && w.el.parentNode) w.el.parentNode.removeChild(w.el);
    list.splice(index, 1);
  }

  function createRippleCircle(x, y, type) {
    if (!rippleLayer) return null;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toFixed(1));
    circle.setAttribute('cy', y.toFixed(1));
    circle.setAttribute('r', '0');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', type === 'click' ? '#2b2622' : '#4778a5');
    circle.setAttribute('stroke-width', type === 'click' ? '3' : '1.6');
    circle.setAttribute('opacity', '0');
    circle.style.pointerEvents = 'none';
    rippleLayer.appendChild(circle);
    return circle;
  }

  function addClickWave(x, y, strength = 1) {
    clickWaves.push({
      x,
      y,
      startSec: performance.now() / 1000,
      strength,
      el: createRippleCircle(x, y, 'click')
    });
    playClickNote(x, y, strength);
  }

  function addHoverWave(x, y, nowSec) {
    hoverWaves.push({
      x,
      y,
      startSec: nowSec,
      el: createRippleCircle(x, y, 'hover')
    });
  }

  function pulseWaveStrength(x, y, nowSec) {
    let best = 0;
    for (let i = clickWaves.length - 1; i >= 0; i--) {
      const w = clickWaves[i];
      const age = nowSec - w.startSec;
      if (age > CLICK_WAVE_LIFE) {
        removeWave(clickWaves, i);
        continue;
      }

      const dist = Math.hypot(x - w.x, y - w.y);
      const radius = age * CLICK_WAVE_SPEED;
      const delta = Math.abs(dist - radius);
      if (delta > CLICK_WAVE_WIDTH) continue;

      const band = 1 - delta / CLICK_WAVE_WIDTH;
      const fade = 1 - age / CLICK_WAVE_LIFE;
      const s = band * band * fade * w.strength;
      if (s > best) best = s;
    }
    return best;
  }

  function updateVisibleRipples(mouse, nowSec, damping) {
    if (mouse && nowSec - lastHoverWaveSec > HOVER_WAVE_INTERVAL) {
      addHoverWave(mouse.x, mouse.y, nowSec);
      lastHoverWaveSec = nowSec;
    }

    for (let i = hoverWaves.length - 1; i >= 0; i--) {
      const w = hoverWaves[i];
      const age = nowSec - w.startSec;
      if (age > HOVER_WAVE_LIFE) {
        removeWave(hoverWaves, i);
        continue;
      }

      const t = age / HOVER_WAVE_LIFE;
      if (w.el) {
        w.el.setAttribute('r', (HOVER_WAVE_RADIUS * t).toFixed(1));
        const speedBoost = mouse ? mouse.speedBoost || 0 : 0;
        w.el.setAttribute('opacity', (0.22 * (1 - t) * damping * (1 + speedBoost * 0.65)).toFixed(3));
        w.el.setAttribute('stroke-width', (1.5 * (1 - t) * (1 + speedBoost * 0.8) + 0.35).toFixed(2));
      }
    }

    for (let i = clickWaves.length - 1; i >= 0; i--) {
      const w = clickWaves[i];
      const age = nowSec - w.startSec;
      if (age > CLICK_WAVE_LIFE) {
        removeWave(clickWaves, i);
        continue;
      }

      const radius = age * CLICK_WAVE_SPEED;
      const fade = 1 - age / CLICK_WAVE_LIFE;
      if (w.el) {
        w.el.setAttribute('r', radius.toFixed(1));
        w.el.setAttribute('opacity', (0.42 * fade * damping * w.strength).toFixed(3));
        w.el.setAttribute('stroke-width', (2.8 * fade + 0.6).toFixed(2));
      }
    }
  }

  function parsePoints(pointsText) {
    if (!pointsText) return [];
    const vals = pointsText.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
    const pts = [];
    for (let i = 0; i < vals.length - 1; i += 2) {
      pts.push({ x: vals[i], y: vals[i + 1] });
    }
    return pts;
  }

  function lineNearestPoint(item, p) {
    const ldx = item.x2 - item.x1;
    const ldy = item.y2 - item.y1;
    const len2 = ldx * ldx + ldy * ldy;
    let t = ((p.x - item.x1) * ldx + (p.y - item.y1) * ldy) / Math.max(1, len2);
    t = clamp(t);
    return {
      x: item.x1 + t * ldx,
      y: item.y1 + t * ldy,
      t
    };
  }

  function responseAt(x, y, mouse, nowSec, damping) {
    const mouseDist = mouse ? Math.hypot(mouse.x - x, mouse.y - y) : 1e9;
    const near = mouseDist < MOUSE_RADIUS
      ? Math.pow(1 - mouseDist / MOUSE_RADIUS, 2) * damping * (1 + (mouse.speedBoost || 0) * 0.65)
      : 0;
    const wave = pulseWaveStrength(x, y, nowSec) * damping;
    return {
      dist: mouseDist,
      near,
      wave,
      total: near + wave * CLICK_WAVE_STRENGTH
    };
  }

  function playClickNote(x, y, strength) {
    try {
      if (typeof startAudio === 'function') startAudio();
      if (typeof getAudioContext !== 'function') return;

      const ctx = getAudioContext();
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25];
      const noteIndex = Math.floor(clamp(x / 1800, 0, 0.999) * scale.length);
      const octaveLift = y < 420 ? 1.5 : y > 860 ? 0.75 : 1;
      const freq = scale[noteIndex] * octaveLift;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045 * clamp(strength, 0.35, 1.8), ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.36);
    } catch (err) {
      console.warn('Could not play canvas note:', err);
    }
  }

  function init() {
    if (initialized) return;

    const bgSvg = document.querySelector('.composition-bg-svg');
    if (!bgSvg) {
      if (++initRetries < 600) return;
      initialized = true;
      return;
    }

    initialized = true;
    const NS = 'http://www.w3.org/2000/svg';
    const children = Array.from(bgSvg.children);

    rippleLayer = document.createElementNS(NS, 'g');
    rippleLayer.setAttribute('class', 'interactive-ripple-layer');
    rippleLayer.style.pointerEvents = 'none';
    bgSvg.appendChild(rippleLayer);

    for (const el0 of children) {
      if (!el0.tagName) continue;
      const tag = el0.tagName.toLowerCase();

      if (tag === 'line') {
        const x1 = parseFloat(el0.getAttribute('x1'));
        const y1 = parseFloat(el0.getAttribute('y1'));
        const x2 = parseFloat(el0.getAttribute('x2'));
        const y2 = parseFloat(el0.getAttribute('y2'));
        if (!isFinite(x1 + y1 + x2 + y2)) continue;

        const path = document.createElementNS(NS, 'path');
        Array.from(el0.attributes).forEach((a) => {
          if (!['x1', 'y1', 'x2', 'y2'].includes(a.name)) path.setAttribute(a.name, a.value);
        });
        path.setAttribute('fill', 'none');

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        path.setAttribute('d', `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`);
        el0.parentNode.replaceChild(path, el0);

        lineItems.push({
          el: path,
          x1,
          y1,
          x2,
          y2,
          midX,
          midY,
          baseOpacity: parseFloat(path.getAttribute('opacity') || '1'),
          currentBend: 0
        });
        continue;
      }

      if (tag === 'circle') {
        const cx = parseFloat(el0.getAttribute('cx'));
        const cy = parseFloat(el0.getAttribute('cy'));
        const r = parseFloat(el0.getAttribute('r'));
        if (!isFinite(cx + cy + r) || r <= 0) continue;
        circleItems.push({
          el: el0,
          cx,
          cy,
          baseR: r,
          rippleEl: null,
          phase: Math.random() * Math.PI * 2,
          baseOpacity: parseFloat(el0.getAttribute('opacity') || '1')
        });
        circleItems[circleItems.length - 1].rippleEl = createRippleCircle(cx, cy, 'hover');
        continue;
      }

      if (tag === 'ellipse') {
        const cx = parseFloat(el0.getAttribute('cx'));
        const cy = parseFloat(el0.getAttribute('cy'));
        const rx = parseFloat(el0.getAttribute('rx'));
        const ry = parseFloat(el0.getAttribute('ry'));
        if (!isFinite(cx + cy + rx + ry) || rx <= 0 || ry <= 0) continue;
        circleItems.push({
          el: el0,
          cx,
          cy,
          baseRx: rx,
          baseRy: ry,
          rippleEl: null,
          phase: Math.random() * Math.PI * 2,
          baseOpacity: parseFloat(el0.getAttribute('opacity') || '1')
        });
        circleItems[circleItems.length - 1].rippleEl = createRippleCircle(cx, cy, 'hover');
        continue;
      }

      if (tag === 'polygon') {
        const pts = parsePoints(el0.getAttribute('points') || '');
        if (pts.length !== 3) continue;
        const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
        const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
        triangleItems.push({
          el: el0,
          cx,
          cy,
          baseTransform: el0.getAttribute('transform') || '',
          baseFill: el0.getAttribute('fill') || '',
          baseStroke: el0.getAttribute('stroke') || '',
          baseOpacity: parseFloat(el0.getAttribute('opacity') || '1'),
          currentRot: 0,
          currentTint: 0,
          spinSpeed: (cx % 2 > 1 ? -1 : 1) * (120 + (cx % 70))
        });
        continue;
      }

      if (tag === 'rect') {
        const x = parseFloat(el0.getAttribute('x') || '0');
        const y = parseFloat(el0.getAttribute('y') || '0');
        const width = parseFloat(el0.getAttribute('width'));
        const height = parseFloat(el0.getAttribute('height'));
        if (!isFinite(x + y + width + height) || width <= 0 || height <= 0) continue;
        if (width >= 1700 && height >= 1200) continue;

        const cx = x + width / 2;
        const cy = y + height / 2;
        rectItems.push({
          el: el0,
          cx,
          cy,
          baseTransform: el0.getAttribute('transform') || '',
          baseOpacity: parseFloat(el0.getAttribute('opacity') || '1'),
          tilt: 0,
          scale: 1,
          flip: 1
        });
      }
    }
  }

  function updateLines(mouse, nowSec, damping) {
    for (const item of lineItems) {
      let mouseBend = 0;
      let mouseStretch = 0;
      const near = mouse ? lineNearestPoint(item, mouse) : null;

      if (near && mouse) {
        const ddx = mouse.x - near.x;
        const ddy = mouse.y - near.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist < MOUSE_RADIUS) {
          const s = 1 - dist / MOUSE_RADIUS;
          const strength = s * s * damping * (1 + (mouse.speedBoost || 0) * 0.5);
          const ldx = item.x2 - item.x1;
          const ldy = item.y2 - item.y1;
          const len = Math.hypot(ldx, ldy) || 1;
          const nx = -ldy / len;
          const ny = ldx / len;
          const sign = Math.sign(ddx * nx + ddy * ny) || 1;
          mouseBend = sign * strength * LINE_MAX_BEND;
          mouseStretch = strength * LINE_MAX_STRETCH;
        }
      }

      const waveStrength = pulseWaveStrength(item.midX, item.midY, nowSec) * damping;
      const waveBend = waveStrength > 0
        ? Math.sin(nowSec * 9 + item.midX * 0.02 + item.midY * 0.015) * waveStrength * LINE_MAX_BEND * 0.85
        : 0;
      const waveStretch = waveStrength * LINE_MAX_STRETCH * 1.35;

      const targetBend = mouseBend + waveBend;
      const targetStretch = mouseStretch + waveStretch;
      const bend = springTo(item, 'currentBend', targetBend);
      const stretch = springTo(item, 'currentStretch', targetStretch, 0.075, 0.76);

      const ldx = item.x2 - item.x1;
      const ldy = item.y2 - item.y1;
      const len = Math.hypot(ldx, ldy) || 1;
      const nx = -ldy / len;
      const ny = ldx / len;
      const tx = ldx / len;
      const ty = ldy / len;
      const x1 = item.x1 - tx * stretch;
      const y1 = item.y1 - ty * stretch;
      const x2 = item.x2 + tx * stretch;
      const y2 = item.y2 + ty * stretch;
      const cpX = item.midX + nx * bend;
      const cpY = item.midY + ny * bend;

      item.el.setAttribute('d', `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
      item.el.style.opacity = String(clamp(item.baseOpacity + Math.abs(bend) / LINE_MAX_BEND * 0.25, 0, 1));
    }
  }

  function updateCircles(mouse, nowSec, damping) {
    for (const item of circleItems) {
      const response = responseAt(item.cx, item.cy, mouse, nowSec, damping);

      const breathe = Math.sin(nowSec * 2.4 + item.phase) * 0.035;
      const targetScale = 1 + response.total * 0.32 + breathe;
      const scale = springTo(item, 'scale', targetScale, 0.09, 0.74);

      if (item.baseR !== undefined) {
        item.el.setAttribute('r', (item.baseR * scale).toFixed(2));
      } else {
        item.el.setAttribute('rx', (item.baseRx * scale).toFixed(2));
        item.el.setAttribute('ry', (item.baseRy * scale).toFixed(2));
      }

      if (item.rippleEl) {
        const baseRadius = item.baseR !== undefined ? item.baseR : Math.max(item.baseRx, item.baseRy);
        item.rippleEl.setAttribute('cx', item.cx.toFixed(1));
        item.rippleEl.setAttribute('cy', item.cy.toFixed(1));
        item.rippleEl.setAttribute('r', (baseRadius * (1.25 + response.total * 1.2)).toFixed(1));
        item.rippleEl.setAttribute('opacity', clamp(response.total * 0.34, 0, 0.42).toFixed(3));
        item.rippleEl.setAttribute('stroke-width', (0.8 + response.total * 1.5).toFixed(2));
      }

      const extraOpacity = response.near * 0.35 + response.wave * 0.45;
      item.el.style.opacity = String(clamp(item.baseOpacity + extraOpacity, 0, 1));
    }
  }

  function updateTriangles(mouse, nowSec, damping) {
    for (const item of triangleItems) {
      const response = responseAt(item.cx, item.cy, mouse, nowSec, damping);
      const target = response.total;
      const distanceSpin = mouse ? Math.pow(1 - clamp(response.dist / MOUSE_RADIUS), 2) : 0;

      item.currentRot += item.spinSpeed * (0.25 + distanceSpin * 1.45 + response.wave * 1.2) * (1 / 60);
      springTo(item, 'currentTint', target, 0.11, 0.7);

      const base = item.baseTransform ? `${item.baseTransform} ` : '';
      item.el.setAttribute('transform', `${base}rotate(${item.currentRot.toFixed(2)} ${item.cx.toFixed(2)} ${item.cy.toFixed(2)})`);

      if (item.baseFill && item.baseFill !== 'none') {
        item.el.setAttribute('fill', mixColour(item.baseFill, TRIANGLE_TINT, item.currentTint * 0.75));
      } else if (item.baseStroke && item.baseStroke !== 'none') {
        item.el.setAttribute('stroke', mixColour(item.baseStroke, TRIANGLE_TINT, item.currentTint * 0.75));
      }

      item.el.style.opacity = String(clamp(item.baseOpacity + target * 0.3, 0, 1));
    }
  }

  function updateRects(mouse, nowSec, damping) {
    for (const item of rectItems) {
      const response = responseAt(item.cx, item.cy, mouse, nowSec, damping);
      const dir = mouse ? Math.sign(item.cx - mouse.x) || 1 : 1;
      const tilt = springTo(item, 'tilt', dir * response.total * 18, 0.08, 0.73);
      const scale = springTo(item, 'scale', 1 + response.total * 0.24, 0.09, 0.72);
      const flip = springTo(item, 'flip', 1 - response.wave * 0.75, 0.07, 0.76);

      const base = item.baseTransform ? `${item.baseTransform} ` : '';
      item.el.setAttribute(
        'transform',
        `${base}translate(${item.cx.toFixed(2)} ${item.cy.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${scale.toFixed(3)} ${flip.toFixed(3)}) translate(${-item.cx.toFixed(2)} ${-item.cy.toFixed(2)})`
      );
      item.el.style.opacity = String(clamp(item.baseOpacity + response.total * 0.25, 0, 1));
    }
  }

  function tick() {
    if (!initialized) init();

    if (initialized) {
      const nowSec = performance.now() / 1000;
      const mouse = getDesignMouse();
      const damping = getAssembleDamping();

      updateLines(mouse, nowSec, damping);
      updateCircles(mouse, nowSec, damping);
      updateTriangles(mouse, nowSec, damping);
      updateRects(mouse, nowSec, damping);
      updateVisibleRipples(mouse, nowSec, damping);
    }

    requestAnimationFrame(tick);
  }

  document.addEventListener('click', (e) => {
    const p = getDesignPointFromScreen(e.clientX, e.clientY);
    if (!p) return;
    const speedBoost = window.mousePos ? clamp(Math.hypot(window.mousePos.vx || 0, window.mousePos.vy || 0) * 0.75, 0, 1.4) : 0;
    addClickWave(p.x, p.y, 1 + speedBoost * 0.5);
  });

  window.triggerCanvasRipple = function (screenX, screenY, strength = 1) {
    const p = getDesignPointFromScreen(screenX, screenY);
    if (!p) return;
    addClickWave(p.x, p.y, clamp(strength, 0.2, 2));
  };

  requestAnimationFrame(tick);
})();
