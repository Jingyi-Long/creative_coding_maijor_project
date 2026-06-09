// perlin-noise.js
// Week 11 Perlin noise mechanic — owned by Zichen Feng
//
// Course concepts used:
// - noise(): creates smooth, continuous random values
// - map(): remaps noise values into movement / size / opacity ranges
// - frameCount: works as the time input for changing noise values
// - noiseSeed(): keeps the Perlin noise behaviour consistent each time
//
// How it is used in this project:
// - controls the smooth floating movement of formed instruments
// - controls the drifting motion and size variation of circular particles
// - controls the subtle breathing glow around each instrument
//
// Beyond class tutorial / implementation additions:
// - This file is separated from main.js to make the Perlin noise mechanic clearer.
// - smoothPerlin() is an extra smoothing helper. It stores previous values to reduce jitter and make floating movement softer.
// - Safe fallback values are added so the animation will not stop if p5.js is still loading or the CDN is blocked.
// - The project applies p5.js noise() to SVG, canvas particles, and glow layers, which goes beyond the basic p5.js canvas examples from class.
//
// Important:
// The core Perlin noise mechanic still comes from p5.js noise(), map(), frameCount, and noiseSeed().


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

function makeRandom(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
