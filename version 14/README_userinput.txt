Mechanic: User Input
Creative director: Xiaoyu

File: mechanic-userinput.js
Depends on: mechanic-audio.js, main.js (loaded after; guarded by typeof checks)

Overview
--------
This file owns all user input and every visual reaction it triggers.
It is structured in two parts that together form a complete input-to-reaction pipeline.


Part 1 — Input Capture
----------------------
Translates keyboard, drag, scroll, and mouse movement into control signals
that the render loop in main.js reads every frame.

Outputs:
  groupPinned[inst]           Toggle state per instrument (0 or 1).
  dragAssemble                Global continuous assembly strength 0..1.
  window.mouseInfluence(x,y)  API function — returns a local influence object for
                              any point near the cursor, used by other modules.
  window.mousePos             Raw pointer position and velocity { x, y, vx, vy, active }.

Input channels:

  Keyboard 1 / 2 / 3 / 4     Toggle Piano / Violin / Guitar / MusicBox individually.
  Keyboard 5                  Assemble all instruments at once.
  Keyboard 0                  Return to the original Composition VIII (unlock).
  Keyboard L or Space         Lock / unlock the current state.
  Drag (mouse or touch)       Hold and drag to assemble; release to return.
                              Drag velocity is tracked: a fast flick snaps the
                              assembly up ("forte"); a slow drag is gentle ("piano").
  Scroll wheel                Second continuous channel for assembly — useful on
                              laptops with a trackpad two-finger scroll.
  Click on a region           If the click lands inside a known instrument area on
                              the canvas, toggles only that instrument (spatial input).

Design notes:
  - Drag uses a velocity boost so expressive gestures feel musical.
  - The mouse influence field (window.mouseInfluence) is purely computational —
    it does not modify any element directly. Other modules query it to get the
    push direction and strength for nearby shapes or particles.
  - prefers-reduced-motion is respected: drag and mouse-field reactions are
    disabled for users who have enabled that system preference.
  - OS key auto-repeat is suppressed for keyboard toggles to prevent flicker.
  - HUD DOM references are cached on first call to avoid per-frame querySelector.


Part 2 — Shape Reactions
------------------------
Animates individual SVG elements in the background Composition VIII layer
in response to mouse proximity and click events.
Initialises via an internal retry loop — safe to run before main.js finishes,
because it waits until the .composition-bg-svg element is created.

Reacts to:
  window.mousePos (from Part 1) and click events.

Shape-type reactions:

  Circles / ellipses
    Expand and breathe with Perlin-like oscillation.
    An outer ripple ring glows and grows when the cursor is near or a wave passes.

  Lines (converted to Bézier paths at initialisation)
    Bend sideways — the control point deflects perpendicular to the line.
    Stretch along the line axis toward the cursor.
    Spring-damp physics brings them back when the cursor moves away.

  Triangles (polygons with three vertices)
    Spin continuously; spin speed increases when the cursor is close.
    Fill or stroke colour shifts toward warm orange on proximity.

  Rectangles
    Tilt toward or away from the cursor.
    Scale up slightly and "flip" (y-scale oscillates) when a click wave passes.
    Spring-damp physics for all transforms.

Click wave:
    Every click emits an expanding circular wave from the canvas position of the
    click, computed from the screen-to-design-coordinate transform in main.js.
    As the wave front passes each shape, it adds to that shape's reaction strength.
    A short pitched note is also played via Web Audio; the pitch is mapped to the
    horizontal position of the click across a C-major pentatonic scale, and the
    octave shifts based on the vertical position.

Hover wave:
    While the mouse is moving over the canvas, a soft ripple ring is emitted
    every ~0.16 seconds from the cursor position. Opacity scales with mouse speed.

Damping:
    All reactions are damped by the current assembly level (groupAssemble).
    When instruments are fully assembled, background shape reactions fade to ~35%
    strength so they do not compete with the main visual.

External API exposed:
    window.triggerCanvasRipple(screenX, screenY, strength)
      Can be called by other modules to programmatically emit a click wave.


Course Content Used
-------------------
  - p5.js noise() (via perlin-noise.js / smoothPerlin()) for floating motion
  - Web Audio API — AudioContext, OscillatorNode, GainNode (click note synthesis)
  - SVG DOM manipulation — createElementNS, setAttribute, replaceChild
  - requestAnimationFrame render loop with delta-time physics
  - Spring-damper physics for shape return (custom springTo() function)
  - prefers-reduced-motion media query (accessibility)

Implementation Beyond Course Tutorials
---------------------------------------
  - Velocity-sensitive drag maps gesture speed to musical dynamic (forte / piano).
  - The mouse influence field decouples input from visual reaction: this file
    publishes a queryable API (window.mouseInfluence) rather than modifying DOM
    directly, so any module can subscribe without changing input code.
  - Click-to-pitch mapping: canvas x-position → pentatonic scale index,
    y-position → octave shift, giving every click a distinct musical note.
  - Spring-damper physics (springTo) with per-axis velocity state for
    smooth, natural-feeling shape returns.
  - Lazy initialisation with retry loop tolerates loading order uncertainty
    between plain <script> tags.
  - Line elements are replaced with <path> at initialisation so they can be
    animated as quadratic Bézier curves.
