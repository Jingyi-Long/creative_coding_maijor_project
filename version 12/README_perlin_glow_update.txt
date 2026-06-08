Perlin glow update

Added:
1. Circle-only layered particle explosion:
   - no line tails / no tadpole-like vertical streaks.
   - near / middle / far circular dot layers.
   - Perlin noise controls particle drift, angle variation and size variation.

2. Subtle breathing glow around formed instruments:
   - appears only after the instrument is mostly formed.
   - drawn below the instruments so it does not cover the main SVG.
   - p5.js noise() controls glow radius and opacity through smoothPerlin().

Course content used:
- p5.js noise()
- map()
- frameCount
- noiseSeed()

Implementation beyond the tutorial:
- Canvas layers combined with SVG/DOM animation.
- smoothPerlin() helper stores previous values to reduce jitter.
- Web Audio API and AnalyserNode in mechanic-audio.js.
