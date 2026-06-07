// input-mechanic.js — 【Mechanic: User input】
// 负责人(creative director):  Xiaoyu
//
// 鼠标拖拽 + 触摸 + 键盘 + 点击分区 + 滚轮,驱动「聚合程度」与「锁定/选择乐器」。
// 这里持有输入相关的状态:dragStart / dragAssemble / locked / groupPinned。
// main.js 的 render() 每帧读取 dragAssemble 和 groupPinned,把它们变成画面与音量。
//
// 控制:
//   拖拽           = 聚合所有乐器(松手回归)
//   点击某个角落    = 只切换那个角落的乐器(空间化输入)
//   滚轮           = 微调整体聚合程度
//   1/2/3/4        = 单个乐器开关
//   5             = 全部聚合
//   0             = 回到原图
//   L / 空格       = 锁定(松手不回归)
//
// 跨文件依赖(运行时):INSTRUMENTS / TARGET_POS(main)、startAudio()(mechanic-audio)

const groupPinned = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart = null;
let dragMoved = 0;            // 本次拖拽累计移动距离(用来区分"点击" vs "拖拽")
let dragAssemble = 0;
let locked = false;

const CLICK_THRESHOLD = 8;   // 移动小于这个像素算"点击"而非"拖拽"
const DRAG_RATIO = 0.30;     // 拖到屏幕短边的这个比例,聚合到 1
const RISE_SMOOTH = 0.16;    // 拖拽时聚合上升的平滑度
const WHEEL_STEP = 0.06;     // 每格滚轮改变的聚合量

// ============================================================
//  HUD 同步
// ============================================================
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
  const lockEl = document.getElementById('lock-state');
  if (lockEl) lockEl.textContent = locked ? '🔒 Locked [L]' : '';
}

// ============================================================
//  工具:取指针坐标
// ============================================================
function pointPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

// 把屏幕点击位置映射到「最近的乐器角落」
// TARGET_POS 用的是 vw/vh 偏移量(相对画面中心),这里换算成屏幕坐标比对距离。
function instrumentAtPoint(px, py) {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  let best = null;
  let bestDist = Infinity;
  for (const inst of INSTRUMENTS) {
    const t = TARGET_POS[inst];
    const tx = cx + (t.x / 100) * window.innerWidth;
    const ty = cy + (t.y / 100) * window.innerHeight;
    const d = Math.hypot(px - tx, py - ty);
    if (d < bestDist) { bestDist = d; best = inst; }
  }
  return best;
}

// ============================================================
//  鼠标 / 触摸 拖拽
// ============================================================
function onDown(e) {
  startAudio();
  const p = pointPos(e);
  dragStart = { x: p.x, y: p.y };
  dragMoved = 0;
}

function onMove(e) {
  if (!dragStart) return;
  const p = pointPos(e);
  const d = Math.hypot(p.x - dragStart.x, p.y - dragStart.y);
  dragMoved = Math.max(dragMoved, d);

  const maxDrag = Math.min(window.innerWidth, window.innerHeight) * DRAG_RATIO;
  const t = Math.min(1, d / maxDrag);
  dragAssemble += (t - dragAssemble) * RISE_SMOOTH;
}

function onUp(e) {
  // 区分点击 vs 拖拽:几乎没移动 → 当作点击,空间化切换最近的乐器
  if (dragStart && dragMoved < CLICK_THRESHOLD) {
    const p = (e.changedTouches && e.changedTouches[0])
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : { x: dragStart.x, y: dragStart.y };
    const inst = instrumentAtPoint(p.x, p.y);
    if (inst) groupPinned[inst] = groupPinned[inst] > 0.5 ? 0 : 1;
  }

  dragStart = null;

  // 拖拽松手:未锁定则平滑回归(被 pin 的乐器由 main.js 的 max() 维持,不受影响)
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

document.addEventListener('mousedown',  onDown);
document.addEventListener('mousemove',  onMove);
document.addEventListener('mouseup',    onUp);
document.addEventListener('touchstart', onDown,  { passive: true });
document.addEventListener('touchmove',  onMove,  { passive: true });
document.addEventListener('touchend',   onUp);

// ============================================================
//  滚轮:微调整体聚合
// ============================================================
document.addEventListener('wheel', e => {
  startAudio();
  const dir = e.deltaY < 0 ? 1 : -1;      // 上滚聚合,下滚散开
  dragAssemble = Math.max(0, Math.min(1, dragAssemble + dir * WHEEL_STEP));
  e.preventDefault();
}, { passive: false });

// ============================================================
//  键盘
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
