// input-mechanic.js — 鼠标拖拽 + 按键分组(不依赖音频状态)

let scatterLevel = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let locked = false;

const DRAG_RATIO = 0.22;
const DECAY_SPEED = 0.025;
const RISE_SMOOTH = 0.15;

window.__groupPinned = { piano:0, violin:0, guitar:0, musicbox:0 };

function inputMousePressed() {
  isDragging = true;
  dragStartX = mouseX; dragStartY = mouseY;
}
function inputMouseReleased() { isDragging = false; }

function inputKeyPressed() {
  const gk = { '1':'piano', '2':'violin', '3':'guitar', '4':'musicbox' };
  if (gk[key]) {
    const g = gk[key];
    window.__groupPinned[g] = window.__groupPinned[g] > 0.5 ? 0 : 1;
  }
  if (key === '5') { for (const g in window.__groupPinned) window.__groupPinned[g] = 1; }
  if (key === '0') { for (const g in window.__groupPinned) window.__groupPinned[g] = 0; locked = false; }
  if (key === 'l' || key === 'L' || key === ' ') {
    locked = !locked;
    if (!locked && !Object.values(window.__groupPinned).some(v => v > 0.5)) scatterLevel = 0;
  }
}

function applyInput(shapes, t) {
  if (isDragging) {
    const d = dist(mouseX, mouseY, dragStartX, dragStartY);
    scatterLevel = lerp(scatterLevel, constrain(d / (width * DRAG_RATIO), 0, 1), RISE_SMOOTH);
  } else if (!locked) {
    scatterLevel = Math.max(0, scatterLevel - DECAY_SPEED);
  }
  window.__scatterLevel = scatterLevel;
  const p = window.__groupPinned;
  window.__groupEffective = {
    piano:   Math.max(scatterLevel, p.piano),
    violin:  Math.max(scatterLevel, p.violin),
    guitar:  Math.max(scatterLevel, p.guitar),
    musicbox:Math.max(scatterLevel, p.musicbox)
  };
}

const REACH = 170;
function applyInputLocal(shapes, t) {
  const gvs = window.__groupVisualScatter || {};
  for (const s of shapes) {
    const vs = gvs[s.instrument] || 0;
    if (vs < 0.15) {
      s.rippleAlpha = lerp(s.rippleAlpha, 0, 0.2);
      s.rotation = lerp(s.rotation, 0, 0.1);
      s.bend = lerp(s.bend, 0, 0.15);
      if (s.rippleAlpha < 2) s.rippleR = 0;
      continue;
    }
    const x = s.baseX + s.offsetX, y = s.baseY + s.offsetY;
    const d = dist(mouseX, mouseY, x, y);
    const strength = d < REACH ? Math.pow(1 - d/REACH, 1.4) * vs : 0;
    if (s.type === 'circle') {
      if (strength > 0.1) { s.rippleR += 2*(0.4+strength); s.rippleAlpha = strength*180; if (s.rippleR > s.baseSize*2) s.rippleR = 0; }
      else { s.rippleAlpha = lerp(s.rippleAlpha, 0, 0.15); if (s.rippleAlpha < 2) s.rippleR = 0; }
    } else if (s.type === 'triangle' || s.type === 'square' || s.type === 'rect' || s.type === 'polygon') {
      s.rotation = lerp(s.rotation, strength * Math.PI * 0.9, 0.1);
    } else if (s.type === 'line') {
      s.bend = lerp(s.bend, strength * 45, 0.12);
    }
  }
}

function drawMouseHalo() {
  const vs = window.__visualScatter || 0;
  if (vs < 0.15 || mouseX<=0 || mouseY<=0 || mouseX>=width || mouseY>=height) return;
  push(); noFill();
  for (let r = REACH; r > 40; r -= 30) {
    stroke(43, 38, 34, map(r, 40, REACH, 30*vs, 4*vs)); strokeWeight(0.8);
    ellipse(mouseX, mouseY, r*2, r*2);
  }
  pop();
}
