// mouse-ripple.js  —— 鼠标靠近,背景里的直线弯过来
//
// 这个文件是 input-mechanic 在视觉上的"显形":
// input-mechanic.js 把鼠标位置算成一个力场(window.mouseInfluence / window.mousePos),
// 这个文件读那个力场,把 composition.svg 里的所有 <line> 实时弯成贝塞尔曲线。
//
// 工作流程:
//   1. 等 composition.svg 加载进 DOM
//   2. 把所有直接子 <line> 元素换成 <path>(初始是退化的二次贝塞尔,看上去仍是直线)
//   3. 每帧:对每条线计算"鼠标离这条线最近的点有多近",
//      离得近就把控制点向鼠标方向偏移,产生弯曲;远了就用 lerp 缓缓弹回去
//
// 设计原则:
//   - 完全独立:不需要改 main.js / input-mechanic.js / 其它任何文件
//   - 解耦:只读 window.mousePos,不直接监听鼠标事件
//   - 节流:画面里有乐器在聚合时,自动停止弯曲(避免视觉太乱)
//   - 平滑回弹:鼠标离开后用线性插值让线慢慢直回去,而不是"啪"地弹回

(function () {
  // ── 可调参数 ──────────────────────────────────────────────
  const RIPPLE_RADIUS_DESIGN = 280;   // 影响半径(画布设计坐标,1800×1260)
  const MAX_BEND             = 90;    // 最大弯曲量(同坐标系)
  const SMOOTHING            = 0.15;  // 弯回 / 弯过去的平滑系数
  const PAUSE_THRESHOLD      = 0.15;  // 有乐器聚合到这个程度以上就暂停弯曲

  const lineItems = [];
  let initialized = false;
  let initRetries = 0;

  // ── 1. 把 <line> 替换成可弯曲的 <path> ──────────────────
  function init() {
    if (initialized) return;

    const bgSvg = document.querySelector('.composition-bg-svg');
    if (!bgSvg) {
      // SVG 还没加载好,稍后重试(main.js 是 async)
      if (++initRetries < 600) return;     // 给 10 秒(60fps × 600)
      initialized = true;                  // 放弃
      return;
    }

    initialized = true;
    const NS = 'http://www.w3.org/2000/svg';

    // 只取 SVG 的直接子 <line>,不挖嵌套(嵌套 <line> 通常是图例 / 装饰组)
    const lines = Array.from(bgSvg.children).filter(
      el => el.tagName && el.tagName.toLowerCase() === 'line'
    );

    for (const line of lines) {
      const x1 = parseFloat(line.getAttribute('x1'));
      const y1 = parseFloat(line.getAttribute('y1'));
      const x2 = parseFloat(line.getAttribute('x2'));
      const y2 = parseFloat(line.getAttribute('y2'));
      if (!isFinite(x1 + y1 + x2 + y2)) continue;

      const path = document.createElementNS(NS, 'path');

      // 复制除几何属性外的所有属性(stroke / stroke-width / opacity / data-* 等)
      Array.from(line.attributes).forEach(a => {
        if (!['x1', 'y1', 'x2', 'y2'].includes(a.name)) {
          path.setAttribute(a.name, a.value);
        }
      });
      path.setAttribute('fill', 'none');

      // 初始 d 是"退化的二次贝塞尔":控制点在中点 → 看起来还是直线
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      path.setAttribute('d', `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`);

      line.parentNode.replaceChild(path, line);

      lineItems.push({
        el: path,
        x1, y1, x2, y2, midX, midY,
        currentBend: 0
      });
    }
  }

  // ── 2. 屏幕坐标 → 画布设计坐标(1800×1260)─────────────
  function getDesignMouse() {
    if (!window.mousePos || !window.mousePos.active) return null;
    if (typeof getMainArtRect !== 'function')         return null;
    const rect = getMainArtRect();
    return {
      x: (window.mousePos.x - rect.left) / rect.scale,
      y: (window.mousePos.y - rect.top)  / rect.scale
    };
  }

  // ── 3. 主循环 ─────────────────────────────────────────────
  function tick() {
    if (!initialized) init();

    if (initialized && lineItems.length > 0) {
      // 有乐器在聚合时,暂停线条弯曲,让位给粒子动画
      let assembling = false;
      if (typeof groupAssemble !== 'undefined' && typeof INSTRUMENTS !== 'undefined') {
        assembling = INSTRUMENTS.some(i => groupAssemble[i] > PAUSE_THRESHOLD);
      }

      const mouse = assembling ? null : getDesignMouse();

      for (const item of lineItems) {
        let targetBend = 0;

        if (mouse) {
          // 找鼠标到这条线段的"最近点"(不是中点!),
          // 这样长线条的任意一端被鼠标接近,都能正确响应
          const ldx = item.x2 - item.x1;
          const ldy = item.y2 - item.y1;
          const len2 = ldx * ldx + ldy * ldy;
          let t = ((mouse.x - item.x1) * ldx + (mouse.y - item.y1) * ldy) / Math.max(1, len2);
          t = Math.max(0, Math.min(1, t));
          const cpx = item.x1 + t * ldx;
          const cpy = item.y1 + t * ldy;

          const ddx  = mouse.x - cpx;
          const ddy  = mouse.y - cpy;
          const dist = Math.hypot(ddx, ddy);

          if (dist < RIPPLE_RADIUS_DESIGN) {
            // 平方衰减:越靠近力越强,边缘几乎不影响
            const s = 1 - dist / RIPPLE_RADIUS_DESIGN;
            const strength = s * s;

            // 求垂直于线段的方向 + 鼠标在线段哪一侧
            const len  = Math.sqrt(len2) || 1;
            const nx   = -ldy / len;
            const ny   =  ldx / len;
            const sign = Math.sign(ddx * nx + ddy * ny) || 1;

            // 弯向鼠标(像被磁铁吸引)
            targetBend = sign * strength * MAX_BEND;
          }
        }

        // 线性插值:鼠标离开后线条平滑弹回直线状态
        item.currentBend += (targetBend - item.currentBend) * SMOOTHING;

        // 弯曲量小到看不见时跳过 DOM 写入,省性能
        if (Math.abs(item.currentBend) < 0.05 && Math.abs(targetBend) < 0.05) continue;

        // 重新计算控制点位置,更新 path 的 d
        const ldx = item.x2 - item.x1;
        const ldy = item.y2 - item.y1;
        const len = Math.hypot(ldx, ldy) || 1;
        const nx  = -ldy / len;
        const ny  =  ldx / len;
        const cpX = item.midX + nx * item.currentBend;
        const cpY = item.midY + ny * item.currentBend;

        item.el.setAttribute(
          'd',
          `M${item.x1},${item.y1} Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${item.x2},${item.y2}`
        );
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
