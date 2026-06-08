// perlin-noise.js
// Week 11 Perlin noise file
// This file is separated from main.js so the Perlin noise mechanic is clear.
//
// Course concepts used:
// - noise()
// - map()
// - frameCount
//
// Small implementation fix:
// - This file also includes safe fallback values so the main animation does not stop
//   if p5.js is still loading or the CDN is blocked.

function setup() {
  // The project already uses SVG / HTML / Canvas layers.
  // We only use p5.js for noise() values, so no visible p5 canvas is needed.
  noCanvas();

  // Fixed seed makes the movement stable each time.
  noiseSeed(9106);
}

// Empty draw() keeps p5 running so frameCount updates continuously.
function draw() {}

const perlinChannels = {};

// fallback smooth noise, only used if p5.js noise() is not ready.
// The real project path uses p5.js noise().
function fallbackNoise(x) {
  return (Math.sin(x * 1.7) + Math.sin(x * 0.73 + 2.1) * 0.35 + 1.35) / 2.7;
}

function getFrameValue() {
  if (typeof frameCount === "number") return frameCount;
  return Math.floor(performance.now() / 16.67);
}

function safeMap(value, start1, stop1, start2, stop2) {
  if (typeof map === "function") return map(value, start1, stop1, start2, stop2);
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

// Basic p5 noise value: smooth value from 0 to 1.
function perlinValue(seed, speed) {
  const t = seed + getFrameValue() * speed;
  if (typeof noise === "function") {
    return noise(t);
  }
  return fallbackNoise(t);
}

// Map p5 noise from 0..1 into any visual range.
function perlinMapped(seed, speed, minValue, maxValue) {
  return safeMap(perlinValue(seed, speed), 0, 1, minValue, maxValue);
}

// Smooth Perlin channel.
// This makes instrument floating softer and avoids visual jitter.
function smoothPerlin(id, seed, speed, minValue, maxValue, smoothing) {
  const target = perlinMapped(seed, speed, minValue, maxValue);

  if (perlinChannels[id] === undefined) {
    perlinChannels[id] = target;
  }

  perlinChannels[id] += (target - perlinChannels[id]) * smoothing;
  return perlinChannels[id];
}

// For particle motion.
function particlePerlin(seed, speed, minValue, maxValue) {
  return perlinMapped(seed, speed, minValue, maxValue);
}

function resetPerlinChannels() {
  for (const key in perlinChannels) {
    delete perlinChannels[key];
  }
}

// ============================================================
//  【随机种子部分】 满足作业要求 "Perlin noise AND random seed"
//  - 上面用 noiseSeed(9106) 固定 Perlin 噪声的种子
//  - 下面 makeRandom(seed) 是一个可设种子的伪随机数发生器(LCG),
//    给定相同 seed 每次产生相同序列,用于粒子炸开方向、乐器碎片初始位置等。
//    main.js 里用 makeRandom(20260606)、makeRandom(1000 + i*777) 来生成可复现的随机布局。
// ============================================================
function makeRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
