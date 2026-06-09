// input-mechanic.js — 【Mechanic: User input】
// Creative director:  Xiaoyu Xia
//
// Translates user input into control signals for the visuals and music.
// Designed in three layers:
//
//   ┌────────────────────┬────────────────────────────┬──────────────────────────┐
//   │ Input channel      │ Nature                     │ Output                   │
//   ├────────────────────┼────────────────────────────┼──────────────────────────┤
//   │ Keyboard 1~5/0/L   │ Discrete selection (toggle)│ groupPinned[inst]        │
//   │ Drag distance+speed│ Global continuous (0..1)   │ dragAssemble             │
//   │ Scroll wheel       │ Global continuous (0..1,    │ dragAssemble             │
//   │                    │   second channel)          │                          │
//   │ Click on a region  │ Discrete, spatial          │ groupPinned[inst]        │
//   │ Mouse position     │ 2D continuous, local       │ window.mouseInfluence()  │
//   └────────────────────┴────────────────────────────┴──────────────────────────┘
//
// "Mouse position" is a local spatial input: it does not affect the overall
// assembly, it only pushes away or slightly rotates the shapes/particles near
// the cursor, like ripples on water. Other modules read it via
// window.mouseInfluence(x, y).
//
// Cross-file dependencies (provided at runtime by main.js once loaded):
//   INSTRUMENTS, USED_AREAS, findInstrumentForPoint(), getMainArtRect()
//   startAudio() (from mechanic-audio.js)

// ============================================================
//  Shared state
// ============================================================
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
