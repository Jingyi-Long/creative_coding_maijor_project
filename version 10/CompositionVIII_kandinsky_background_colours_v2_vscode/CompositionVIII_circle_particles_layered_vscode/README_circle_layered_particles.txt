Circle layered Perlin particles update

What changed:
1. Removed all line/streak/tail drawing from the particle explosion.
2. Particles are now circular dots only.
3. Added three visual particle layers:
   - clearer near dots,
   - softer middle dots,
   - tiny far dust dots.
4. Added subtle circular halo for some near/middle particles.
5. Particle drift and size still use p5.js Perlin noise through particlePerlin().
6. The uploaded visual reference is included as reference_perlin_particles.png.

No other mechanics were intentionally changed.
