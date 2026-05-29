// sketch.js — 主循环
// 职责:初始化形状数组;每帧按当前模式调用四个 mechanic;最后统一绘制。
// mechanic 之间互不冲突,因为各写各的参数;display 把它们合成。

let shapes = [];
let mode = 'all';
const MODE_NAMES = {
  all: '全部开启 · All On',
  1:   'Audio · Jingyi',
  2:   'Time · Yuming',
  3:   'Noise · Zichen',
  4:   'Input · Xiaoyu'
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  initShapes();
  updateHUD();
  noiseDetail(3, 0.5);  // 让 Perlin noise 更柔和
}

function initShapes() {
  shapes = [];
  const scaleX = width / DESIGN_W;
  const scaleY = height / DESIGN_H;
  for (const data of SHAPE_DATA) {
    shapes.push(new Shape(data, scaleX, scaleY));
  }
}

function draw() {
  const t = millis() / 1000;

  // 半透明覆盖底色,形成时间 mechanic 的拖尾
  push();
  noStroke();
  const bg = color(PALETTE.bg);
  // climax 阶段降低覆盖 alpha,让尾迹更长更明显
  const ts = window.__timeState;
  const coverAlpha = ts && ts.name === 'climax' ? 45 : 75;
  fill(red(bg), green(bg), blue(bg), coverAlpha);
  rect(0, 0, width, height);
  pop();

  // 单独演示时,把不参与的参数复位
  resetInactiveParams();

  // 按模式调用对应 mechanic
  if (mode === 'all' || mode === 1) applyAudio(shapes, t);
  if (mode === 'all' || mode === 2) applyTime(shapes, t);
  if (mode === 'all' || mode === 3) applyNoise(shapes, t);
  if (mode === 'all' || mode === 4) applyInput(shapes, t);

  // 合成绘制所有形状
  for (const s of shapes) s.display();

  // 鼠标光环(仅在 input 单独模式或全开时显示,且鼠标在画布内)
  if ((mode === 'all' || mode === 4) && mouseX > 0 && mouseY > 0 && mouseX < width && mouseY < height) {
    drawMouseHalo();
  }

  // 更新 HUD 状态条
  updateHUDLive();
}

function resetInactiveParams() {
  if (mode === 'all') return;
  for (const s of shapes) {
    if (mode !== 1) { s.brightness = 1; s.weightMul = 1; }
    if (mode !== 2) { s.sizeScale = 1; s.alpha = 255; }
    if (mode !== 3) { s.offsetX = 0; s.offsetY = 0; }
    if (mode !== 4) {
      s.rippleR = 0; s.rippleAlpha = 0;
      s.rotation = 0; s.bend = 0;
    }
  }
}

function keyPressed() {
  if (key === '0' || key === ' ') mode = 'all';
  else if (key === '1') mode = 1;
  else if (key === '2') mode = 2;
  else if (key === '3') mode = 3;
  else if (key === '4') mode = 4;
  updateHUD();
}

function updateHUD() {
  const el = document.getElementById('mode-label');
  if (el) el.textContent = MODE_NAMES[mode];
}

// 每帧更新右侧的实时状态(音频能量条、时间阶段、BPM)
function updateHUDLive() {
  const meterEl = document.getElementById('meter');
  const phaseEl = document.getElementById('phase');
  if (!meterEl) return;

  const a = window.__audioState || { kick: 0, snare: 0, hihat: 0, bass: 0 };
  meterEl.innerHTML = `
    <div class="row"><span class="lab">Kick</span>  <span class="bar" style="width:${a.kick * 80}px"></span></div>
    <div class="row"><span class="lab">Snare</span> <span class="bar" style="width:${a.snare * 80}px"></span></div>
    <div class="row"><span class="lab">HiHat</span> <span class="bar" style="width:${a.hihat * 80}px"></span></div>
    <div class="row"><span class="lab">Bass</span>  <span class="bar" style="width:${a.bass * 80}px"></span></div>
  `;

  const ts = window.__timeState;
  if (phaseEl && ts) {
    const map = { intro: '引入', develop: '发展', climax: '高潮', return: '回归' };
    phaseEl.textContent = `Phase · ${map[ts.name] || ts.name}`;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initShapes();
}
