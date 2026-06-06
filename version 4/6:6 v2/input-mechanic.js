// input-mechanic.js — 【Mechanic: User input】
// 负责人(creative director):  ______
//
// 鼠标拖拽 + 触摸 + 键盘,驱动「聚合程度」与「锁定/选择乐器」。
// 这里持有输入相关的状态:dragStart / dragAssemble / locked / groupPinned。
// main.js 的 render() 每帧读取 dragAssemble 和 groupPinned,把它们变成画面与音量。
//
// 控制:拖拽=聚合; 1/2/3/4=单个乐器开关; 5=全部; 0=回到原图; L/空格=锁定
//
// 跨文件依赖(运行时):INSTRUMENTS(main)、startAudio()(mechanic-audio)

const groupPinned   = { piano:0, violin:0, guitar:0, musicbox:0 };

let dragStart = null;
let dragAssemble = 0;
let locked = false;

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
