// mechanic-time.js — 时间机制 v3
(function () {
  const pageStart = performance.now();
  const lineItems = [];
   let inited     = false;
  let clickTime  = null;   // 首次点击画布后才开始计时

  document.getElementById('canvas').addEventListener('pointerdown', () => {
    if (!clickTime) clickTime = performance.now();
  }, { once: true });

  // ── 装饰层 canvas（插在 particle-layer 之前，z-index:2）──────
  const decoCanvas = document.createElement('canvas');
  decoCanvas.id = 'deco-layer';
  decoCanvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;';
  document.getElementById('canvas')
    .insertBefore(decoCanvas, document.getElementById('particle-layer'));
  const decoCtx = decoCanvas.getContext('2d');

  function resizeDeco() {
    decoCanvas.width  = window.innerWidth;
    decoCanvas.height = window.innerHeight;
  }
  resizeDeco();
  window.addEventListener('resize', resizeDeco);

  // ── 工具 ─────────────────────────────────────────────────────
  function ramp(t, t0, t1) {
    return Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  }
  function sr(seed) {                        // 伪随机，固定种子
    const x = Math.sin(seed + 1) * 43758.5453;
    return x - Math.floor(x);
  }

  // ── 生成装饰线数据（40 条，带渐变色）────────────────────────
  const DLINES = [];
  for (let i = 0; i < 40; i++) {
    DLINES.push({
      sx:         80  + sr(i * 13)     * 1640,
      sy:         80  + sr(i * 13 + 1) * 1100,
      angle:      sr(i * 13 + 2) * Math.PI * 2,
      len:        40  + sr(i * 13 + 3) * 100,
      w:          1   + sr(i * 13 + 4) * 2.5,
      hue:        sr(i * 13 + 5) * 360,
      hueSpeed:   25  + sr(i * 13 + 6) * 70,
      revealTime: 3   + sr(i * 13 + 7) * 22,    // 出现时刻 3s~25s
      revealDur:  0.4 + sr(i * 13 + 8) * 1.0
    });
  }

  // ── 背景 SVG 线条初始化（只隐藏 line/polyline，其他形状保持原样）
  function tryInit() {
    if (inited || !backgroundSvg) return;
    inited = true;

    Array.from(backgroundSvg.children).forEach((el, i) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'rect' && el.getAttribute('width') === '1800') return;
      if (tag !== 'line' && tag !== 'polyline') return;  // 非线条跳过，保持原始状态

      lineItems.push({
        el,
        revealStart:    1 + sr(i * 3)       * 4,
        revealDuration: 0.8 + sr(i * 3 + 1) * 1.2
      });
      el.style.opacity = '0';
    });
  }

  // ── 绘制装饰层 ───────────────────────────────────────────────
  function drawDecorations(t) {
    decoCtx.clearRect(0, 0, decoCanvas.width, decoCanvas.height);
    const fade = window.__timeFade || 0;
    if (fade < 0.01) return;

    decoCtx.globalAlpha = 1;
  }

  // ── 主循环 ───────────────────────────────────────────────────
  function tick() {
    // 点击前 t=0（一切为 0），点击后从 0 重新计时
    const t = clickTime ? (performance.now() - clickTime) / 1000 : 0;

    if (!inited) tryInit();

    window.__timeFade = ramp(t, 1, 5);
    window.__timeSat  = ramp(t, 0, 6);

    for (const item of lineItems) {
      if (usedBackgroundElements.some(u => u.el === item.el)) continue;
      item.el.style.opacity = ramp(t, item.revealStart, item.revealStart + item.revealDuration).toFixed(3);
    }

    drawDecorations(t);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();