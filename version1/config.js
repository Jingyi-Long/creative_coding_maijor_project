// config.js — 共享调色板 + 原作几何坐标数据
// 形状按 1000x700 设计画布给出,运行时按实际画布缩放。
// 这一版尽量还原 Composition VIII 的标志性结构:
//   左上角的同心圆系 + 散布彩色圆 + 三角群 + 大量直线穿插
//   + 半圆弧 + 曲线 + 棋盘格小方块阵 + 谱线状网格

const DESIGN_W = 1000;
const DESIGN_H = 700;

// 康定斯基偏好的暖灰底 + 几何原色点缀
const PALETTE = {
  bg:      '#e9e2d0',
  bgDark:  '#d6cdb6',
  ink:     '#2b2622',
  yellow:  '#f0b429',
  red:     '#c0392b',
  blue:    '#2c5f8a',
  navy:    '#1a3a5c',
  teal:    '#3a8f8f',
  purple:  '#6b4e8f',
  orange:  '#d97824',
  pink:    '#d97a8c',
  white:   '#f5efe1'
};

const SHAPE_DATA = [];

// === 1. 左上角标志性同心圆系(Composition VIII 的灵魂)===
// 由外到内一圈圈套着,外圈是淡晕,内圈是饱和的核
SHAPE_DATA.push(
  { type: 'circle', x: 180, y: 160, size: 170, color: 'bgDark',  filled: true },
  { type: 'circle', x: 180, y: 160, size: 145, color: 'navy',    filled: false, weight: 2 },
  { type: 'circle', x: 180, y: 160, size: 120, color: 'navy',    filled: true },
  { type: 'circle', x: 180, y: 160, size: 90,  color: 'purple',  filled: true },
  { type: 'circle', x: 180, y: 160, size: 55,  color: 'red',     filled: true },
  { type: 'circle', x: 180, y: 160, size: 28,  color: 'yellow',  filled: true }
);

// 同心圆周围的"射线"(原作里那些朝外辐射的短线)
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * TWO_PI_DEG();
  SHAPE_DATA.push({
    type: 'line',
    x: 180 + Math.cos(ang) * 105,
    y: 160 + Math.sin(ang) * 105,
    len: 36, angle: ang, color: 'ink', weight: 1.5
  });
}
function TWO_PI_DEG() { return Math.PI * 2; }

// === 2. 散布的彩色圆(中小尺寸,分布在画面其余位置)===
SHAPE_DATA.push(
  { type: 'circle', x: 520, y: 230, size: 70,  color: 'teal',   filled: true  },
  { type: 'circle', x: 520, y: 230, size: 36,  color: 'yellow', filled: true  },
  { type: 'circle', x: 780, y: 170, size: 55,  color: 'orange', filled: true  },
  { type: 'circle', x: 760, y: 170, size: 80,  color: 'orange', filled: false, weight: 1.5 },
  { type: 'circle', x: 640, y: 510, size: 95,  color: 'pink',   filled: true  },
  { type: 'circle', x: 640, y: 510, size: 50,  color: 'red',    filled: false, weight: 2 },
  { type: 'circle', x: 320, y: 540, size: 42,  color: 'blue',   filled: true  },
  { type: 'circle', x: 880, y: 540, size: 38,  color: 'purple', filled: true  },
  { type: 'circle', x: 450, y: 600, size: 22,  color: 'yellow', filled: true  },
  { type: 'circle', x: 720, y: 320, size: 18,  color: 'red',    filled: true  }
);

// === 3. 三角形群 ===
SHAPE_DATA.push(
  { type: 'triangle', x: 420, y: 360, size: 75, color: 'yellow', rotation: 0 },
  { type: 'triangle', x: 830, y: 440, size: 60, color: 'blue',   rotation: 0.4 },
  { type: 'triangle', x: 560, y: 410, size: 38, color: 'red',    rotation: -0.3 },
  { type: 'triangle', x: 380, y: 200, size: 32, color: 'teal',   rotation: 1.2 }
);

// === 4. 直线穿插群 ===
SHAPE_DATA.push(
  { type: 'line', x: 250, y: 320, len: 240, angle: -0.32, color: 'ink',  weight: 2 },
  { type: 'line', x: 600, y: 350, len: 320, angle: 0.55,  color: 'ink',  weight: 2.5 },
  { type: 'line', x: 700, y: 590, len: 200, angle: -0.9,  color: 'red',  weight: 3 },
  { type: 'line', x: 480, y: 120, len: 180, angle: 1.2,   color: 'ink',  weight: 1.5 },
  { type: 'line', x: 200, y: 450, len: 280, angle: 0.18,  color: 'navy', weight: 2 },
  { type: 'line', x: 880, y: 280, len: 160, angle: -1.4,  color: 'ink',  weight: 1.5 },
  { type: 'line', x: 520, y: 540, len: 220, angle: 1.5,   color: 'ink',  weight: 1 }
);

// === 5. 半圆弧 ===
SHAPE_DATA.push(
  { type: 'arc', x: 460, y: 280, size: 90,  start: Math.PI,        stop: Math.PI*2, color: 'blue',  weight: 3 },
  { type: 'arc', x: 350, y: 470, size: 70,  start: -Math.PI/2,     stop: Math.PI/2, color: 'red',   weight: 2.5 },
  { type: 'arc', x: 820, y: 600, size: 110, start: Math.PI*1.2,    stop: Math.PI*1.9, color: 'navy', weight: 2 }
);

// === 6. 曲线(优雅的弧形) ===
SHAPE_DATA.push(
  { type: 'curve', x: 100,  y: 380, x2: 280, y2: 280, cpx: 190, cpy: 220, color: 'ink',    weight: 1.5 },
  { type: 'curve', x: 600,  y: 80,  x2: 880, y2: 120, cpx: 740, cpy: 30,  color: 'purple', weight: 2 }
);

// === 7. 棋盘格小方块阵(原作里那些棋盘状元素) ===
// 5x3 = 15 个小方块,交替黑黄
const checkX = 720, checkY = 380, cell = 18;
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 3; j++) {
    const isInk = (i + j) % 2 === 0;
    SHAPE_DATA.push({
      type: 'square',
      x: checkX + i * cell,
      y: checkY + j * cell,
      size: cell - 2,
      color: isInk ? 'ink' : 'yellow',
      filled: true
    });
  }
}

// === 8. 谱线状网格(画面下方几条平行细线,像乐谱) ===
SHAPE_DATA.push(
  { type: 'line', x: 110, y: 640, len: 360, angle: 0, color: 'ink', weight: 0.6 },
  { type: 'line', x: 110, y: 655, len: 360, angle: 0, color: 'ink', weight: 0.6 },
  { type: 'line', x: 110, y: 670, len: 360, angle: 0, color: 'ink', weight: 0.6 }
);
