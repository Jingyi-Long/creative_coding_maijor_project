// time-mechanic.js — Yuming 负责(时间)
// 升级版:实现"引入、发展、高潮、回归"四阶段叙事,60 秒循环。
//   0  ~15s  intro     呼吸缓慢,饱和度低,整体内敛
//   15 ~30s  develop   呼吸加速,饱和度上升,色彩开始张扬
//   30 ~45s  climax    剧烈呼吸,饱和度最高,形状大幅胀缩
//   45 ~60s  return    回归平静,呼吸放慢,饱和度回落
// 同时 alpha 也随阶段变化,配合主循环的拖尾形成尾迹层次。

const PHASES = [
  { name: 'intro',   start: 0,  speed: 0.4, scale: 0.06, alphaBase: 235 },
  { name: 'develop', start: 15, speed: 0.8, scale: 0.10, alphaBase: 220 },
  { name: 'climax',  start: 30, speed: 1.5, scale: 0.18, alphaBase: 200 },
  { name: 'return',  start: 45, speed: 0.5, scale: 0.07, alphaBase: 240 }
];
const CYCLE = 60;

function currentPhase(t) {
  const local = t % CYCLE;
  let cur = PHASES[0];
  for (const p of PHASES) {
    if (local >= p.start) cur = p;
  }
  return { phase: cur, local };
}

// 阶段间做平滑过渡,避免视觉跳变
function smoothedParams(t) {
  const { phase, local } = currentPhase(t);
  // 找下一阶段
  const idx = PHASES.indexOf(phase);
  const next = PHASES[(idx + 1) % PHASES.length];
  const phaseEnd = (idx === PHASES.length - 1) ? CYCLE : next.start;
  const transitionWindow = 3; // 末尾 3 秒过渡到下一阶段
  let blend = 0;
  if (phaseEnd - local < transitionWindow) {
    blend = (transitionWindow - (phaseEnd - local)) / transitionWindow;
  }
  return {
    speed:     lerp(phase.speed,     next.speed,     blend),
    scale:     lerp(phase.scale,     next.scale,     blend),
    alphaBase: lerp(phase.alphaBase, next.alphaBase, blend),
    name:      phase.name
  };
}

function applyTime(shapes, t) {
  const p = smoothedParams(t);

  for (const s of shapes) {
    const breathe = Math.sin(t * p.speed + s.phase);
    s.sizeScale = 1.0 + breathe * p.scale;
    // alpha 的起伏幅度也随阶段变化,climax 时尾迹最明显
    const alphaWave = Math.sin(t * p.speed * 0.7 + s.phase) * (255 - p.alphaBase) * 0.5;
    s.alpha = p.alphaBase + alphaWave;
  }

  window.__timeState = p;
}
