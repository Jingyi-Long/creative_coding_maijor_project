// config.js — Composition VIII 的形状数据，从 v2 SVG 转换而来
// 设计画布 1800×1260，运行时按浏览器窗口比例缩放
//
// 重要：shape.js 需要做以下三处小扩展，才能跑通这份 config：
//   1. 新增 'rect' 类型（和 'square' 类似，但有独立的 w / h，支持 rotation）
//   2. 新增 'polygon' 类型（任意多边形，points 是相对中心的偏移数组）
//   3. 支持 opacity 字段（0..1），作为 baseAlpha 倍率
//
// 其他类型（circle, line, triangle, arc, curve, square）沿用 v1 的实现

const DESIGN_W = 1800;
const DESIGN_H = 1260;

const PALETTE = {
  bg:        '#f3eadb',
  coral:     '#d8a08a',
  paleBlue:  '#9db7c4',
  gold:      '#d7b83f',
  darkGold:  '#bd8f35',
  ink:       '#191314',
  purple:    '#7b4f8d',
  red:       '#bf4f3e',
  darkInk:   '#202020',
  green:     '#7b8b69',
  tan:       '#a9824b',
  cream:     '#f7f0e6',
  brown:     '#7d522f',
  navy:      '#26384f',
  blue:      '#4778a5',
  lavBlue:   '#6f7fa4',
  gray:      '#9a9b92',
  plum:      '#7e6597',
  deepRed:   '#9a332e',
  pink:      '#d9a8b5',
  yellow:    '#d7b83f',
  brightYel: '#e7c531',
  boldRed:   '#bf4f3e',
  deepBlue:  '#26384f',
  cobalt:    '#2f7fa3'
};

const SHAPE_DATA = [];

// === 辅助函数 ===

// SVG <line x1 y1 x2 y2> → v1 line 格式（x, y 是线段中心）
function svgLine(x1, y1, x2, y2, color, weight) {
  return {
    type: 'line',
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    len: Math.hypot(x2 - x1, y2 - y1),
    angle: Math.atan2(y2 - y1, x2 - x1),
    color, weight
  };
}

// 多个顶点 → polygon（中心是质心，points 是相对偏移）
function svgPoly(points, color, opacity = 1, filled = true, weight = 1) {
  let cx = 0, cy = 0;
  for (const [x, y] of points) { cx += x; cy += y; }
  cx /= points.length; cy /= points.length;
  return {
    type: 'polygon',
    x: cx, y: cy,
    points: points.map(([x, y]) => [x - cx, y - cy]),
    color, opacity, filled, weight
  };
}

// 绕 (px, py) 旋转 angle 弧度
function rotPt(x, y, px, py, angle) {
  const dx = x - px, dy = y - py;
  return [px + dx * Math.cos(angle) - dy * Math.sin(angle),
          py + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

// === 1. 背景半透明大色块 ===
SHAPE_DATA.push(
  { type: 'circle', x: 216,  y: 205,  size: 496, color: 'coral',    opacity: 0.30, filled: true },
  { type: 'circle', x: 150,  y: 862,  size: 196, color: 'paleBlue', opacity: 0.50, filled: true },
  { type: 'circle', x: 505,  y: 768,  size: 156, color: 'gold',     opacity: 0.28, filled: true },
  { type: 'circle', x: 505,  y: 768,  size: 120, color: 'coral',    opacity: 0.25, filled: true },
  { type: 'circle', x: 205,  y: 1015, size: 80,  color: 'darkGold', opacity: 0.28, filled: true },
  { type: 'circle', x: 1406, y: 250,  size: 140, color: 'darkGold', opacity: 0.30, filled: true }
);

// === 2. 背景三角形 ===
SHAPE_DATA.push(
  svgPoly([[635,330],[220,640],[660,660]], 'paleBlue', 0.55),
  svgPoly([[780,455],[1115,650],[720,655]], 'tan', 0.55),
  svgPoly([[705,420],[1075,640],[645,705]], 'green', 0.16)
);

// === 3. 粉色方块 ===
SHAPE_DATA.push({
  type: 'rect', x: 952, y: 340, w: 105, h: 90,
  color: 'pink', opacity: 0.55, filled: true, rotation: 0
});

// === 4. 钢琴键盘（绕 300,470 旋转 -9°）===
{
  const ang = -9 * Math.PI / 180;
  const keyColors = ['ink','cream','green','cream','tan','cream','paleBlue','cream','brown'];
  // 9 条立条
  for (let i = 0; i < 9; i++) {
    const [cx, cy] = rotPt(300 + i * 24 + 12, 470 + 120, 300, 470, ang);
    SHAPE_DATA.push({ type: 'rect', x: cx, y: cy, w: 24, h: 240, color: keyColors[i], filled: true, rotation: ang });
  }
  // 上方 5×8 的黑白棋盘格
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 8; row++) {
      const [cx, cy] = rotPt(420 + col * 24 + 12, 470 + row * 22 + 11, 300, 470, ang);
      const isInk = (col + row) % 2 === 0;
      SHAPE_DATA.push({ type: 'rect', x: cx, y: cy, w: 24, h: 22, color: isInk ? 'ink' : 'cream', filled: true, rotation: ang });
    }
  }
}

// === 5. 左上角主圆组（黑 + 紫）===
SHAPE_DATA.push(
  { type: 'circle', x: 216, y: 205, size: 410, color: 'ink',    filled: true },
  { type: 'circle', x: 210, y: 218, size: 210, color: 'purple', filled: true }
);

// 钢琴边的大红圆
SHAPE_DATA.push({ type: 'circle', x: 300, y: 470, size: 168, color: 'red', filled: true });

// === 6. 黑色对角长线(11 条)===
const blackLines = [
  [1040, 58, 545, 1015, 4], [1040, 58, 1012, 1148, 4],
  [820, 150, 1095, 650, 2.5], [258, 1010, 1655, 1045, 3],
  [560, 150, 775, 560, 2], [610, 120, 545, 520, 2],
  [250, 300, 1150, 640, 2], [905, 1015, 1665, 560, 3],
  [965, 1085, 1700, 640, 2], [1025, 985, 1645, 620, 2],
  [700, 1080, 1340, 690, 2]
];
for (const [x1, y1, x2, y2, w] of blackLines) {
  SHAPE_DATA.push(svgLine(x1, y1, x2, y2, 'darkInk', w));
}

// 红线和棕线
SHAPE_DATA.push(
  svgLine(408, 728, 1340, 690, 'red', 4),
  svgLine(560, 648, 1185, 930, 'red', 3),
  svgLine(900, 470, 1500, 1010, 'brown', 4),
  svgLine(862, 505, 1440, 1092, 'brown', 3)
);

// 右上四条平行线
for (let i = 0; i < 4; i++) {
  SHAPE_DATA.push(svgLine(1180, 560 + i * 22, 1792, 150 + i * 22, 'darkInk', 2));
}

// === 7. 右侧 7×2 黑白小棋盘(绕 1350,360 旋转 -34°)===
{
  const ang = -34 * Math.PI / 180;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 7; col++) {
      const [cx, cy] = rotPt(1330 + col * 26 + 13, 360 + row * 26 + 13, 1350, 360, ang);
      const isInk = (col + row) % 2 === 0;
      SHAPE_DATA.push({ type: 'rect', x: cx, y: cy, w: 26, h: 26, color: isInk ? 'ink' : 'cream', filled: true, rotation: ang });
    }
  }
}

// 沿对角散落的 5 个小深方块(每个绕自己左上角旋转 -34°)
{
  const ang = -34 * Math.PI / 180;
  for (const [x0, y0] of [[1260,440],[1352,386],[1444,332],[1536,278],[1628,224]]) {
    const [cx, cy] = rotPt(x0 + 10, y0 + 10, x0, y0, ang);
    SHAPE_DATA.push({ type: 'rect', x: cx, y: cy, w: 20, h: 20, color: 'darkInk', filled: true, rotation: ang });
  }
}

// === 8. 两个小旗子(左右各一)===
SHAPE_DATA.push(
  svgLine(560, 100, 560, 240, 'darkInk', 2),
  svgLine(528, 130, 592, 130, 'darkInk', 2),
  svgLine(534, 152, 586, 152, 'darkInk', 2),
  svgLine(1280, 80, 1280, 220, 'darkInk', 2),
  svgLine(1248, 110, 1312, 110, 'darkInk', 2),
  svgLine(1254, 132, 1306, 132, 'darkInk', 2)
);

// === 9. 二次贝塞尔曲线 ===
SHAPE_DATA.push(
  { type: 'curve', x: 860, y: 300, x2: 1170, y2: 300, cpx: 1015, cpy: 90,  color: 'darkInk', weight: 3 },
  { type: 'curve', x: 840, y: 355, x2: 1195, y2: 360, cpx: 1015, cpy: 150, color: 'darkInk', weight: 2 },
  // 拱形(原 SVG 是两段拼的)
  { type: 'curve', x: 462, y: 452, x2: 548, y2: 378, cpx: 470, cpy: 378, color: 'ink', weight: 11 },
  { type: 'curve', x: 548, y: 378, x2: 632, y2: 430, cpx: 612, cpy: 378, color: 'ink', weight: 11 },
  // 波浪线(两段)
  { type: 'curve', x: 240, y: 575, x2: 392, y2: 592, cpx: 330, cpy: 512, color: 'darkInk', weight: 6 },
  { type: 'curve', x: 392, y: 592, x2: 556, y2: 612, cpx: 454, cpy: 672, color: 'darkInk', weight: 6 },
  // J 形
  { type: 'curve', x: 250, y: 640, x2: 252, y2: 772, cpx: 298, cpy: 706, color: 'darkInk', weight: 6 },
  // 眼眶旁三道红色小弧
  { type: 'curve', x: 905,  y: 470, x2: 998,  y2: 475, cpx: 948,  cpy: 428, color: 'red', weight: 3 },
  { type: 'curve', x: 918,  y: 488, x2: 1010, y2: 492, cpx: 960,  cpy: 446, color: 'red', weight: 3 },
  { type: 'curve', x: 1060, y: 460, x2: 1150, y2: 465, cpx: 1100, cpy: 420, color: 'red', weight: 3 }
);

// === 10. 装饰拱形阵列(三排半圆弧)===
// 上排 y=865
for (const [xs, xe, r] of [[932,1028,48],[1034,1114,40],[1120,1216,48],[1222,1302,40],[1308,1404,48],[1410,1490,40],[1496,1592,48]]) {
  SHAPE_DATA.push({ type: 'arc', x: (xs+xe)/2, y: 865, size: r, start: Math.PI, stop: Math.PI*2, color: 'darkInk', weight: 3 });
}
// 中排 y=805
for (const [xs, xe] of [[402,478],[490,566],[578,654]]) {
  SHAPE_DATA.push({ type: 'arc', x: (xs+xe)/2, y: 805, size: 38, start: Math.PI, stop: Math.PI*2, color: 'darkInk', weight: 3 });
}
// 下排 y=852
for (const [xs, xe] of [[766,834],[838,906],[910,978],[982,1050]]) {
  SHAPE_DATA.push({ type: 'arc', x: (xs+xe)/2, y: 852, size: 34, start: Math.PI, stop: Math.PI*2, color: 'darkInk', weight: 3 });
}

// === 11. 散落的小实心圆 ===
SHAPE_DATA.push(
  { type: 'circle', x: 1469, y: 758, size: 100, color: 'gray',    filled: true },
  { type: 'circle', x: 1357, y: 705, size: 68,  color: 'plum',    filled: true },
  { type: 'circle', x: 844,  y: 296, size: 36,  color: 'red',     filled: true },
  { type: 'circle', x: 1013, y: 127, size: 48,  color: 'lavBlue', filled: true },
  { type: 'circle', x: 150,  y: 862, size: 88,  color: 'gold',    filled: true },
  { type: 'circle', x: 505,  y: 768, size: 76,  color: 'blue',    filled: true },
  { type: 'circle', x: 1568, y: 525, size: 84,  color: 'blue',    filled: true },
  { type: 'circle', x: 475,  y: 118, size: 18,  color: 'red',     filled: true }
);

// === 12. 上方眼睛(同心圆,描边)===
// v1 的 circle 不能同时填色和描边,这里用两个 circle(填色 + 描边)叠加
SHAPE_DATA.push(
  { type: 'circle', x: 893, y: 400, size: 124, color: 'cream',   filled: true },
  { type: 'circle', x: 893, y: 400, size: 124, color: 'darkInk', filled: false, weight: 4 },
  { type: 'circle', x: 893, y: 400, size: 72,  color: 'cream',   filled: true },
  { type: 'circle', x: 893, y: 400, size: 72,  color: 'darkInk', filled: false, weight: 6 },
  // 旁边的小描边圆(原 SVG 是虚线,这里改成细实线)
  { type: 'circle', x: 975, y: 335, size: 64,  color: 'gray',    filled: false, weight: 2 },
  // 上方蓝色小圆
  { type: 'circle', x: 1202, y: 190, size: 44, color: 'blue',    filled: false, weight: 4 },
  { type: 'circle', x: 1202, y: 190, size: 22, color: 'blue',    filled: true }
);

// === 13. 右上四象限饼图 ===
SHAPE_DATA.push(
  svgPoly([[1406,250],[1406,208],[1448,250]], 'green',   1, true),
  svgPoly([[1406,250],[1448,250],[1406,292]], 'paleBlue',1, true),
  svgPoly([[1406,250],[1406,292],[1364,250]], 'gray',    1, true),
  svgPoly([[1406,250],[1364,250],[1406,208]], 'tan',     1, true),
  { type: 'circle', x: 1406, y: 250, size: 84, color: 'darkInk', filled: false, weight: 2 }
);

// 右上方几个小装饰圆
SHAPE_DATA.push(
  { type: 'circle', x: 1730, y: 250, size: 56, color: 'cream',   filled: true },
  { type: 'circle', x: 1730, y: 250, size: 56, color: 'darkInk', filled: false, weight: 2 },
  { type: 'circle', x: 1560, y: 200, size: 32, color: 'red',     opacity: 0.7, filled: true },
  { type: 'circle', x: 1635, y: 245, size: 40, color: 'purple',  filled: false, weight: 3 }
);

// === 14. 下方的「指南针/罗盘」(同心圆 + 周围放射小线)===
SHAPE_DATA.push(
  { type: 'circle', x: 1005, y: 542, size: 124, color: 'cream',   filled: true },
  { type: 'circle', x: 1005, y: 542, size: 124, color: 'darkInk', filled: false, weight: 3 },
  { type: 'circle', x: 1005, y: 542, size: 80,  color: 'cream',   filled: true },
  { type: 'circle', x: 1005, y: 542, size: 80,  color: 'green',   filled: false, weight: 5 },
  { type: 'circle', x: 1005, y: 542, size: 36,  color: 'darkInk', filled: true },
  { type: 'circle', x: 1014, y: 536, size: 12,  color: 'cream',   filled: true },
  // 旁边的小同心圆和环
  { type: 'circle', x: 959,  y: 548, size: 52,  color: 'cream',   filled: true },
  { type: 'circle', x: 959,  y: 548, size: 52,  color: 'navy',    filled: false, weight: 4 },
  { type: 'circle', x: 1035, y: 552, size: 60,  color: 'darkGold',filled: false, weight: 3 },
  { type: 'circle', x: 1057, y: 558, size: 76,  color: 'red',     filled: false, weight: 3 }
);

// 罗盘四周 9 道短小放射线
const radials = [
  [973,548,981,548], [970,557,976,562], [961,562,963,570],
  [952,560,948,567], [946,553,938,556], [946,543,938,540],
  [952,536,948,529], [961,534,963,526], [970,539,976,534]
];
for (const [x1, y1, x2, y2] of radials) {
  SHAPE_DATA.push(svgLine(x1, y1, x2, y2, 'navy', 2));
}

// === 15. 上方三角形群 ===
SHAPE_DATA.push(
  // 大的描边三角(无填充)
  svgPoly([[1010,58],[1080,168],[940,168]], 'darkInk', 1, false, 2),
  // 黄色小尖三角
  svgPoly([[1130,118],[1170,168],[1090,168]], 'gold', 1, true),
  // 下方黄褐三角
  svgPoly([[1418,938],[1488,1052],[1348,1052]], 'darkGold', 1, true),
  // 中央两个小金黄三角
  svgPoly([[740,470],[772,520],[708,520]], 'gold', 0.75, true),
  svgPoly([[540,400],[566,446],[514,446]], 'gold', 0.6,  true)
);

// === 16. 右侧大格子窗(4×4 网格)===
// 外框由 8 条线组成
SHAPE_DATA.push(
  svgLine(1500, 455, 1605, 455, 'darkInk', 2),
  svgLine(1500, 455, 1500, 545, 'darkInk', 2),
  svgLine(1500, 485, 1605, 485, 'darkInk', 2),
  svgLine(1535, 455, 1535, 545, 'darkInk', 2),
  svgLine(1500, 515, 1605, 515, 'darkInk', 2),
  svgLine(1570, 455, 1570, 545, 'darkInk', 2),
  svgLine(1500, 545, 1605, 545, 'darkInk', 2),
  svgLine(1605, 455, 1605, 545, 'darkInk', 2),
  // 窗格里两个小色块
  { type: 'rect', x: 1551, y: 500, w: 30, h: 26, color: 'red',      opacity: 0.7, filled: true, rotation: 0 },
  { type: 'rect', x: 1517, y: 530, w: 32, h: 26, color: 'paleBlue', opacity: 0.6, filled: true, rotation: 0 }
);

// === 17. 右下角小格子窗 ===
SHAPE_DATA.push(
  svgLine(1618, 930, 1688, 930, 'darkInk', 1.5),
  svgLine(1618, 930, 1618, 996, 'darkInk', 1.5),
  svgLine(1618, 952, 1688, 952, 'darkInk', 1.5),
  svgLine(1641, 930, 1641, 996, 'darkInk', 1.5),
  svgLine(1618, 974, 1688, 974, 'darkInk', 1.5),
  svgLine(1664, 930, 1664, 996, 'darkInk', 1.5),
  svgLine(1618, 996, 1688, 996, 'darkInk', 1.5),
  svgLine(1687, 930, 1687, 996, 'darkInk', 1.5),
  { type: 'rect', x: 1629, y: 941, w: 18, h: 18, color: 'red',  opacity: 0.7, filled: true, rotation: 0 },
  { type: 'rect', x: 1652, y: 963, w: 18, h: 18, color: 'blue', opacity: 0.6, filled: true, rotation: 0 },
  { type: 'rect', x: 1676, y: 1011, w: 24, h: 22, color: 'deepRed', filled: true, rotation: 0 }
);

// === 18. 中央 5×3 黑白小棋盘(在罗盘上方,无旋转)===
for (let col = 0; col < 5; col++) {
  for (let row = 0; row < 3; row++) {
    const isInk = (col + row) % 2 === 0;
    SHAPE_DATA.push({
      type: 'rect',
      x: 905 + col * 19 + 9.5, y: 440 + row * 19 + 9.5,
      w: 19, h: 19, color: isInk ? 'ink' : 'cream',
      filled: true, rotation: 0
    });
  }
}

// === 19. 左侧三色小条 ===
SHAPE_DATA.push(
  { type: 'rect', x: 315, y: 736, w: 30, h: 42, color: 'green',    opacity: 0.85, filled: true, rotation: 0 },
  { type: 'rect', x: 345, y: 736, w: 30, h: 42, color: 'darkGold', opacity: 0.85, filled: true, rotation: 0 },
  { type: 'rect', x: 375, y: 736, w: 30, h: 42, color: 'paleBlue', opacity: 0.85, filled: true, rotation: 0 }
);

// 一个孤立的小描边方块
SHAPE_DATA.push({
  type: 'rect', x: 1702, y: 164, w: 28, h: 28,
  color: 'darkInk', filled: false, weight: 3, rotation: 0
});

// === 20. 后加的红蓝黄重音 ===
SHAPE_DATA.push(
  // 上方大黄色三角
  svgPoly([[970,75],[1090,295],[850,295]], 'yellow', 1, true),
  // 中部小亮黄三角
  svgPoly([[1138,460],[1182,520],[1094,520]], 'brightYel', 1, true),
  // 右下大红圆 + 内嵌小黄圆
  { type: 'circle', x: 1500, y: 870, size: 156, color: 'boldRed',   filled: true },
  { type: 'circle', x: 1500, y: 870, size: 72,  color: 'brightYel', filled: true },
  // 右上小红圆
  { type: 'circle', x: 1640, y: 118, size: 56, color: 'boldRed', filled: true },
  // 左下深蓝三角
  svgPoly([[280,940],[380,940],[330,1050]], 'deepBlue', 1, true),
  // 远右蓝色方块
  { type: 'rect', x: 1737, y: 729, w: 58, h: 58, color: 'cobalt', filled: true, rotation: 0 },
  // 黄色同心圆
  { type: 'circle', x: 1670, y: 380, size: 116, color: 'yellow', filled: false, weight: 7 },
  { type: 'circle', x: 1670, y: 380, size: 44,  color: 'yellow', filled: true },
  // 右上粗红斜线
  svgLine(1320, 60,  1700, 380, 'boldRed',  8),
  // 左上粗蓝斜线
  svgLine(80,   380, 780,  80,  'deepBlue', 5),
  // 散点
  { type: 'circle', x: 755,  y: 100,  size: 28, color: 'brightYel', filled: true },
  { type: 'circle', x: 1260, y: 1090, size: 36, color: 'brightYel', filled: true },
  { type: 'circle', x: 660,  y: 980,  size: 26, color: 'yellow',    filled: true },
  { type: 'circle', x: 430,  y: 1080, size: 28, color: 'deepBlue',  filled: true },
  { type: 'circle', x: 80,   y: 600,  size: 40, color: 'cobalt',    filled: true },
  { type: 'circle', x: 1150, y: 80,   size: 20, color: 'boldRed',   filled: true },
  { type: 'circle', x: 115,  y: 1100, size: 32, color: 'boldRed',   filled: true }
);

// 总共大约 180 个形状,SHAPE_DATA.length 可以打印出来确认
