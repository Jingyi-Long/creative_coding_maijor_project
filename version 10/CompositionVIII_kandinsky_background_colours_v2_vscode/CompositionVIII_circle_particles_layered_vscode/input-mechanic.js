// input-mechanic.js — 【Mechanic: User input】
// 负责人(creative director):  ______
//
// 把用户输入翻译成画面与音乐的控制信号。设计上分三个层次:
//
//   ┌────────────────────┬────────────────────────────┬──────────────────────────┐
//   │ 输入通道           │ 性质                       │ 输出                     │
//   ├────────────────────┼────────────────────────────┼──────────────────────────┤
//   │ 键盘 1~5/0/L       │ 离散选择(toggle)           │ groupPinned[inst]        │
//   │ 拖拽距离 + 速度    │ 全局连续(0..1)             │ dragAssemble             │
//   │ 滚轮               │ 全局连续(0..1,第二通道)    │ dragAssemble             │
//   │ 点击画面区域       │ 离散,空间定位              │ groupPinned[inst]        │
//   │ 鼠标位置           │ 二维连续,局部              │ window.mouseInfluence()  │
//   └────────────────────┴────────────────────────────┴──────────────────────────┘
//
// 其中"鼠标位置"是局部空间输入:不影响整体聚合,只让靠近鼠标的图形/粒子
// 被推开或微微旋转,像水面波纹。其他模块通过 window.mouseInfluence(x,y) 读取。
//
// 跨文件依赖(运行时,由 main.js 在加载完毕后提供):
//   INSTRUMENTS, USED_AREAS, findInstrumentForPoint(), getMainArtRect()
//   startAudio() (来自 mechanic-audio.js)

// ============================================================
//  共享状态
// ============================================================
const groupPinned = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart    = null;        // 拖拽起点(屏幕坐标)
let dragMoved    = false;       // 移动是否超过阈值(用来区分"点击"和"拖拽")
let dragAssemble = 0;           // 当前聚合强度 0..1
let locked       = false;       // 是否锁定当前状态

// 拖拽速度追踪 — 用来实现"甩动 = forte,慢拖 = piano"
let lastMove     = { x:0, y:0, t:0 };
let dragVelocity = 0;

const DRAG_THRESHOLD = 5;       // 移动 < 5px 不算拖拽(允许"点击"判定)

// 用户系统偏好:减少动画。无障碍最佳实践。
const prefersReducedMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
//  HUD - 缓存 DOM 引用,避免每帧 querySelector
//  延迟初始化:input-mechanic.js 比 main.js 先加载,
//  此时 INSTRUMENTS 还未定义,所以在第一次 updateHud() 才建立缓存。
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
//  鼠标拖拽 / 触摸  —  带速度感应 + 阈值 + 点击区分
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
  // 触摸时阻止页面滚动(否则手机拖拽会同时把页面拉走)
  if (e.touches) e.preventDefault();
  if (!dragStart || prefersReducedMotion) return;

  const p   = pointPos(e);
  const now = performance.now();
  const dt  = Math.max(1, now - lastMove.t);

  // 瞬时速度(像素/毫秒)
  dragVelocity = Math.hypot(p.x - lastMove.x, p.y - lastMove.y) / dt;
  lastMove     = { x: p.x, y: p.y, t: now };

  // 拖拽距离
  const d = Math.hypot(p.x - dragStart.x, p.y - dragStart.y);
  if (d < DRAG_THRESHOLD) return;     // 阈值内不算拖拽
  dragMoved = true;

  // 基础聚合强度(基于距离)
  const maxDrag = Math.min(window.innerWidth, window.innerHeight) * 0.30;
  const baseT   = Math.min(1, d / maxDrag);

  // 速度加成:快速甩动会"猛地"增加聚合,模拟乐句的强弱处理
  const velocityBoost = Math.min(0.25, dragVelocity * 0.015);

  const target = Math.min(1, baseT + velocityBoost);
  dragAssemble += (target - dragAssemble) * 0.16;
}

function onUp() {
  const wasDragging = dragMoved;
  const startPoint  = dragStart;
  dragStart = null;
  dragMoved = false;

  // 没有拖拽 → 这是一次"点击" → 检查是否点中画面里的乐器区域
  if (!wasDragging && startPoint) {
    handleAreaClick(startPoint);
    return;
  }

  // 拖拽释放后衰减。
  // 改用 requestAnimationFrame 而不是 setInterval,
  // 避免多次松手时累积多个 interval 导致衰减速度异常。
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
//  点击画面区域 → 触发对应乐器
//  利用 main.js 的 USED_AREAS / findInstrumentForPoint():
//  画面上每个乐器有一组覆盖区(以圆形表示),点中哪个区就触发哪个乐器。
//  把屏幕坐标先换算回画布设计坐标(1800×1260)再判定。
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
//  滚轮  →  独立于拖拽的第二个连续输入通道
//  对没有触屏 / 不方便拖拽的用户友好;
//  笔记本触摸板的双指滚动同样会触发。
// ============================================================
document.addEventListener('wheel', e => {
  startAudio();
  if (prefersReducedMotion) return;
  // deltaY 通常 ±100,乘以小系数让滚动平滑;
  // 向上滚 → 聚合增加;向下滚 → 聚合减少。
  dragAssemble = Math.max(0, Math.min(1, dragAssemble - e.deltaY * 0.001));
  e.preventDefault();
}, { passive: false });

// ============================================================
//  ★ 鼠标接近反应 — 把鼠标位置变成"影响力场"
//
//  这是本机制最重要的新增功能:不需要点击或拖拽,只要鼠标靠近
//  画面里的图形/粒子,就会让它们被推开 / 微微旋转,像水波纹。
//
//  设计上完全解耦:这里只负责"算出鼠标的影响",不直接修改任何
//  视觉元素。其他模块(主要是 main.js 里的粒子绘制和乐器变换)
//  通过 window.mouseInfluence(x, y) 主动查询,得到:
//    strength : 0..1, 距离越近越大(平方衰减,边缘几乎无效果)
//    dx, dy   : 从鼠标指向 (x,y) 的单位方向向量(用来"推开")
//    angle    : 同上,但是弧度(用于旋转)
//    speed    : 鼠标当前移动速度(可作扰动强度)
//
//  这种设计的好处:
//   - input-mechanic.js 不需要知道 main.js 的内部结构
//   - 任何新模块都可以直接读取这个力场,不用改 input 代码
//   - 关掉/调节 RIPPLE_RADIUS 就能整体禁用,无副作用
// ============================================================
const mouse           = { x: -9999, y: -9999, active: false, vx: 0, vy: 0 };
let   lastMousePos    = { x: 0, y: 0, t: 0 };

const RIPPLE_RADIUS   = 180;     // 影响半径(屏幕像素)
const RIPPLE_STRENGTH = 1.0;     // 整体强度系数

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

  // 平方衰减:中心强、边缘弱,效果更聚焦
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

// 也直接暴露原始位置,有些模块只需要坐标
window.mousePos = mouse;

// ============================================================
//  键盘
//  - 1/2/3/4: toggle 对应乐器
//  - 5:      全部聚合
//  - 0:      回到原图(并解锁)
//  - L / 空格: 锁定/解锁
//  改进:
//   1) 忽略输入框中的按键(防止抢焦点)
//   2) 忽略系统级"按住自动重复",避免一直按导致 toggle 抖动
// ============================================================
const keyHeld = {};
const keyMap  = { '1':'piano', '2':'violin', '3':'guitar', '4':'musicbox' };

document.addEventListener('keydown', e => {
  // 在输入框/文本域里不抢键(本项目暂无输入框,但属良好实践)
  if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
  if (keyHeld[e.key]) return;        // 阻止 OS 自动重复造成的多次触发
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
    e.preventDefault();              // 防止空格滚动页面
  }
});

document.addEventListener('keyup', e => { keyHeld[e.key] = false; });

// ============================================================
//  事件绑定
//  touchstart / touchmove 显式 passive:false,允许 preventDefault
//  否则现代浏览器会忽略 preventDefault,导致页面在拖拽时滚动。
// ============================================================
document.addEventListener('mousedown',  onDown);
document.addEventListener('mousemove',  onMove);
document.addEventListener('mouseup',    onUp);
document.addEventListener('touchstart', onDown, { passive: false });
document.addEventListener('touchmove',  onMove, { passive: false });
document.addEventListener('touchend',   onUp);