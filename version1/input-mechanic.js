// input-mechanic.js — Xiaoyu 负责(用户输入 / 鼠标)
// 升级版:加入强度衰减、缓动、回弹。
//   圆:在 reach 范围内持续发射涟漪,涟漪自身有 alpha 衰减
//   三角:旋转有缓动和惯性,鼠标离开后慢慢停下
//   直线/曲线:弯曲有缓动,鼠标离开后弹性回归
// 视觉提示:可选地绘制一个跟随鼠标的微妙光环,让观者看到交互范围。

const REACH = 180;        // 鼠标影响半径
const RIPPLE_SPEED = 2.2; // 涟漪扩散速度

function applyInput(shapes, t) {
  for (const s of shapes) {
    const x = s.baseX + s.offsetX;
    const y = s.baseY + s.offsetY;
    const d = dist(mouseX, mouseY, x, y);
    const near = d < REACH;
    const strength = near ? Math.pow(1 - d / REACH, 1.4) : 0;

    if (s.type === 'circle') {
      if (near && strength > 0.1) {
        s.rippleR += RIPPLE_SPEED * (0.4 + strength);
        s.rippleAlpha = strength * 180;
        if (s.rippleR > s.baseSize * 2.2) {
          s.rippleR = 0;
        }
      } else {
        // 离开后涟漪 alpha 快速衰减归零
        s.rippleAlpha = lerp(s.rippleAlpha, 0, 0.15);
        if (s.rippleAlpha < 2) s.rippleR = 0;
      }
    } else if (s.type === 'triangle' || s.type === 'square') {
      const target = strength * Math.PI * 1.2;
      s.rotation = lerp(s.rotation, target, 0.1);
    } else if (s.type === 'line' || s.type === 'curve') {
      const target = strength * 55;
      s.bend = lerp(s.bend, target, 0.1);
    } else if (s.type === 'arc') {
      // 弧形被鼠标靠近时会"颤动"一下尺寸
      const target = strength * 0.15;
      s.weightMul = lerp(s.weightMul, 1 + target * 6, 0.15);
    }
  }
}

// 由 sketch.js 在最顶层调用,绘制鼠标光环作为交互提示
function drawMouseHalo() {
  push();
  noFill();
  // 多层渐隐圆环,营造"影响范围"的视觉提示
  for (let r = REACH; r > 40; r -= 30) {
    const a = map(r, 40, REACH, 25, 4);
    stroke(43, 38, 34, a);
    strokeWeight(0.8);
    ellipse(mouseX, mouseY, r * 2, r * 2);
  }
  pop();
}
