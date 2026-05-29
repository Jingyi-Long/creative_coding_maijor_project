// noise-mechanic.js — Zichen 负责(Perlin noise & randomness)
// 升级版:按形状大小分层。
//   large  缓慢游动,幅度 8~12px
//   medium 中等游动,幅度 12~18px
//   small  快速漂浮,幅度 15~22px
//   line   几乎不动,幅度 4~6px(直线是结构骨架,过度漂动会让画面失去秩序)

const NOISE_PROFILES = {
  large:  { range: 10, speed: 0.20 },
  medium: { range: 15, speed: 0.32 },
  small:  { range: 20, speed: 0.45 },
  line:   { range: 5,  speed: 0.15 }
};

function applyNoise(shapes, t) {
  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    const profile = NOISE_PROFILES[s.sizeClass] || NOISE_PROFILES.medium;

    // 给每个形状不同的采样起点,避免整齐划一
    const nx = noise(i * 100 + t * profile.speed);
    const ny = noise(i * 100 + 5000 + t * profile.speed);

    s.offsetX = map(nx, 0, 1, -profile.range, profile.range);
    s.offsetY = map(ny, 0, 1, -profile.range, profile.range);
  }
}
