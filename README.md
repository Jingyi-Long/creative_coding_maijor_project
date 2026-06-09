# IDEA9103 Major Project 

## Part 1: Project Overview
An interactive audiovisual reinterpretation of Wassily Kandinsky's Composition VIII (1923), built with p5.js. The static painting is rebuilt from SVG geometry and then brought to life: over a timed sequence the shapes draw themselves in and gain colour, the viewer can gather the composition into four musical instruments, and the whole scene reacts in real time to a synchronised recording of Pachelbel's Canon in D. Four mechanics — Audio, Time-based, Perlin noise & randomness, and User input — each drive a different layer of the same canvas.

## Inspiration
 
Our project draws inspiration from Wassily Kandinsky's **Composition VIII (1923)**, a defining work of geometric abstract art that explores rhythm, emotion, and the relationship between colour and sound through circles, lines, and geometric forms. Kandinsky believed that painting could evoke feelings in the same way as music, and this connection between visual art and sound became the core idea of our project.
 
We transform this static abstract painting into a dynamic interactive artwork where viewers can influence the geometric elements through sound, mouse interaction, and time-based change. We were also inspired by Google Arts & Culture's *Play a Kandinsky* project, as well as generative art and abstract motion graphics, to create an immersive audiovisual experience that combines movement, rhythm, and interaction.
 

![An image of Composition VIII](readmeImages/image.png)
*Wassily Kandinsky, Composition VIII, 1923, oil on canvas, 140 × 201 cm. Solomon R. Guggenheim Museum, New York.*

![Play a Kandinsky interactive interface](readmeImages/playakandinsky.png)
*Google Arts & Culture & Centre Pompidou, Play a Kandinsky, 2021.*

---

## How to Run

1. The project loads local audio (`.mp3`) and SVG files, so it must be **served**, not opened directly as a `file://` page. In VS Code, open the `version 14` folder and run `index.html` with the **Live Server** extension (or any local web server).
2. Wait for the audio to finish loading — the on-screen indicator changes from `audio loading …%` to `♪ click to start canon`.
3. **Click anywhere once** (or press any key, or start dragging). Browsers block audio until a user gesture, so this first interaction starts the synchronised *Canon in D* soundtrack and the timed sequence.
4. The piece is responsive and re-scales when the browser window is resized.

## Interaction Instructions

The work layers four mechanics on one canvas — some run on their own, others respond to you.

**Just watch (Time-based + Audio):**
- After the first interaction, the painting plays through a roughly **98-second timed sequence**: shapes appear as outlines, fill with colour as saturation rises, oscillate at the climax, then fade out and loop.
- The instruments react to the music in real time — each one's **brightness and colour flicker** with its own frequency band of the soundtrack.

**Mouse / trackpad:**
- **Move the mouse** over the painting — nearby shapes respond to the cursor: circles breathe and ripple, lines bend and stretch, triangles spin and warm toward orange, rectangles tilt. Background particles drift away from the cursor and the formed instruments lean toward it.
- **Drag** (hold and move) to gather the composition into the four instruments; **release** to let it return. A fast flick assembles strongly (*forte*); a slow drag is gentle (*piano*).
- **Scroll / two-finger swipe** is a second way to control the same assembly — handy on a trackpad.
- **Click** anywhere to send an expanding ripple across the shapes and play a short note (its pitch follows the horizontal click position on a C-major pentatonic scale, its octave the vertical position). Clicking inside a specific instrument's area toggles just that instrument.

**Keyboard:**
- **1 / 2 / 3 / 4** — show / hide Piano / Violin / Guitar / Music box individually.
- **5** — gather all four instruments at once.
- **0** — return to the original Composition VIII.
- **L** or **Space** — lock / unlock the current state.

*Accessibility: if your system has "reduce motion" enabled, the drag and mouse-proximity reactions are automatically disabled.*


---

## Techniques
 
- **p5.js core:** `noise()`, `noiseSeed()`, seeded randomness, `map()`, `frameCount`, and responsive `windowResized()` / `resizeCanvas()`.
- **Layered rendering:** the original painting (SVG/DOM), a particle canvas, and a glow canvas are stacked so each mechanic owns its own visual layer and does not overwrite the others.
- **Modular structure:** each mechanic lives in its own file and `main.js` brings them together; the mechanic files read/write a small set of shared state (assembly amount, published audio levels, time-reveal values) instead of touching each other directly.
- **Web Audio API (beyond the course):** the five instrument stems are played on a single shared `AudioContext` clock so they stay sample-accurately in sync, and an `AnalyserNode` reads the live frequency spectrum to drive the visuals. The Week 12 tutorial covered `p5.sound`'s `p5.FFT` / `p5.Amplitude`; we used the lower-level Web Audio API instead because `p5.sound`'s `loadSound().loop()` cannot guarantee sample-accurate multi-track synchronisation (see References).
- **Key visual decision:** rather than fading a whole instrument image in as one layer, each instrument SVG is split into many pieces in JavaScript that gather into the final shape, giving a more deliberate "assembling" motion.

---

## Mechanics
### Team Members

| Name | uid | Mechanic |
|------|--------|----------|
| Jingyi Long | [jlon6684](https://github.com/Jingyi-Long) | Audio |
| Yuming Cong | [ycon0930](https://github.com/MiiiiinG03) | Time-based |
| Zichen Feng | [zfen0688](https://github.com/zf0688) | Perlin noise & randomness |
| Xiaoyu Xia | [xxia0518](https://github.com/xxia0518) | User input |

### Audio — owned by Jingyi Long
The audio mechanic plays Pachelbel's *Canon in D* as **five aligned stems** (full ensemble + piano, violin, guitar, music box). All five are loaded through the Web Audio API and started at the same `AudioContext` time, so they behave like stems on one shared timeline and never drift apart. The mix is dynamic: when no instrument is gathered, the ensemble plays as background; as instruments form, the ensemble ducks down and each instrument's own stem fades up.
 
For the audio-reactive visuals, an `AnalyserNode` taps the master output and the live spectrum is split into **four frequency bands** (low → high) mapped to piano / guitar / violin / music box. Because *Canon in D* is gentle and its loudness barely changes, each band's energy is normalised against a slow-moving baseline and amplified by a sensitivity factor, so even small musical swells become visible. The resulting per-instrument level drives a **brightness / saturation / glow flicker** on that instrument, so each one visibly pulses with its own part of the music. This brings Kandinsky's idea — that shapes and colours can behave like sound — to life by letting the real audio move the forms on screen.

### Time-based — owned by Yuming Cong
Our project was inspired by Wassily Kandinsky's belief that **painting could function like music — through rhythm, emotion, and composition.** In Composition VIII, geometric forms, lines, and colours are arranged with a strong sense of visual rhythm. In our group project, I am responsible for designing the time-based visual evolution of the system, using layered alpha compositing across multiple canvas layers to create a continuous sense of depth and presence.

This mechanic is structured through stages analogous to musical progression: **introduction, build-up, climax, and resolution.**

At the beginning, the composition remains minimal and balanced. Geometric outlines emerge one by one across the canvas — sparse, weightless, and without colour — establishing a clear and spacious visual foundation. During the build-up, colour gradually fills each shape while saturation steadily rises, transforming the skeletal composition into a richly hued arrangement. Visual density increases as overlapping forms accumulate and the palette deepens toward full intensity.

During the climax, motion and layering reach their highest intensity. Shapes oscillate in scale with individual rhythms, creating a pulsing, breathing quality across the composition. New geometric elements — curved lines, straight lines, circles, and rotating triangles — emerge and animate with small-amplitude oscillation, while radial bloom gradients expand outward from selected shapes, building a luminous and layered visual field. Colour contrast is at its strongest and the overall composition is most dynamic. Finally, in the resolution stage, bloom and fill colour fade first, dissolving the richness of the scene, followed by the gradual disappearance of all outlines, returning the composition to silence and stillness before the cycle begins again.

The user does not directly interact with this mechanic, but instead experiences the artwork continuously evolving over time.

![An image of sketch](readmeImages/Sketch.jpg)

### Perlin Noise & Randomness — owned by Zichen Feng
This mechanic uses Perlin noise and random numbers to create smooth and organic dynamic effects. Inspired by the rhythm and geometric balance in Kandinsky's "Composition VIII", the circles, lines and particles in the picture will slowly float, rotate and constantly change positions. Compared with completely random movements, Perlin noise can produce more natural and smooth change effects, making the entire picture look more alive and fluid, rather than chaotic. 
The audience will experience this mechanic by observing the constantly changing dynamic environment. Random numbers and random seeds will affect color changes, particle generation, and graphic distribution, making the work continuously evolve and each presentation slightly different. The audience can feel the constantly changing visual rhythm and spatial relationship between geometric elements. 
This mechanic echoes the project concept in Part 1. We aim to transform Kandinsky's originally static abstract paintings into a dynamic and immersive digital art space. Perlin noise and random variations further enhance the sense of movement, rhythm and musicality in the work, allowing the image to flow and change continuously like music.

![An image of sketch](readmeImages/sketch.png)

### User Input — owned by Xiaoyu Xia

The user input mechanic forms a complete input-to-reaction pipeline, translating user interactions — keyboard presses, dragging, scrolling, and cursor movements — into dynamic control signals that shape the entire canvas in real time.
 
### Conceptual Foundation and Visual Design
 
The conceptual foundation of this mechanic is deeply rooted in **Wassily Kandinsky's pioneering theories of synesthesia, "inner necessity," and polymorphic expression** (Kandinsky, 1911; 1926). Kandinsky posited that a singular spiritual artistic core can manifest through diverse visual and auditory forms. Driven by this philosophy, **the choice of Pachelbel's *Canon in D* as the musical centerpiece is highly deliberate**. A canon inherently relies on a singular melodic theme layered and polyphonically varied across different voices, leading to countless historic interpretations worldwide. Reinterpreting this single masterpiece through four distinct instrument stems — each uniquely deconstructed and reconstructed from the painting — perfectly mirrors Kandinsky's belief that different instruments represent different spiritual "colours" of a unified artistic truth.
 
To achieve absolute geometric precision while respecting Kandinsky's visual language, **I personally drafted, vectorised, and exported all of the patterns, shapes, and final instrument silhouettes within Figma** (see Figure 1). Every instrument silhouette and every colour-filled "deconstructed" instrument used by the runtime — across all four mechanics — originated in my Figma workspace. This directly embodies the creative vision of forms being **"born from the painting"**: the abstract elements of *Composition VIII* are deconstructed at their foundational geometric level and organically reassembled into four unique instrument silhouettes, allowing different visual forms to interpret the same underlying musical canon (Benjamin, 1989). The viewer's drag, click, and key inputs then drive these assets between their dispersed painting state and their fully-assembled instrument state in real time.
 
**Figure 1**
*Figma Asset Blueprint of Instrument Deconstruction and Assembly — designed and exported by Xiaoyu Xia*
 
![Figma Asset Blueprint — Xiaoyu Xia's deconstruction of Composition VIII into four playable instruments](figma_design_xiaoyu.png)
 
*Note.* The original artwork *Composition VIII* (top) is systematically deconstructed at its foundational geometric level and reassembled into four playable musical instruments — **Grand Piano**, **Violin**, **Guitar**, and **Kalimba (Music Box)** — together with their matching clean black silhouettes used as final-state targets. All assets shown here were designed in Figma by Xiaoyu Xia, then exported as SVG for direct ingestion into the p5.js runtime.
 
### Interactive Proximity and Shape Reactions
 
When the mouse moves across the canvas, proximity to different geometric shapes triggers distinct visual reactions in the background layer, creating a tangible sense of dynamic abstraction (Snibbe & Levin, 2001):
 
- **Circles / Ellipses:** They expand and breathe with continuous Perlin-like oscillation, emitting a glowing outer ripple ring when the cursor is near or a wave passes (Long et al., 2024, README §User Input).
- **Lines:** Converted to quadratic Bézier paths at initialization, they bend sideways as the control point deflects perpendicularly to the line, stretching along the line axis toward the cursor (Long et al., 2024, README §User Input).
- **Triangles:** They spin continuously, with their rotation speed increasing based on proximity, while their fill or stroke colour shifts toward a warm orange (Long et al., 2024, README §User Input).
- **Rectangles:** They tilt toward or away from the cursor based on its relative position. The closer the cursor is to a shape, the stronger its physical deflection becomes. Custom spring-damper physics with per-axis velocity states are applied via a custom `springTo()` function to ensure all shapes return to their original layout smoothly and naturally when the cursor moves away (Long et al., 2024, README §User Input).
This per-shape mapping also implements Kandinsky's colour–sound synesthetic associations: yellow regions respond with quick, energetic movements (Kandinsky's "trumpet" association), blue regions react slowly and softly (echoing the organ), and red regions produce moderate, balanced responses in between (Long et al., 2024, README §User Input).
 
### The Canvas "Instrument" Click Wave
 
To emphasise the experience of interacting with a musical score, a canvas-click feature transforms the static artwork into a performable instrument based on cross-modal synesthetic mapping (Cytowic, 2002):
 
- Clicking anywhere on the canvas emits an expanding circular ripple wave from that exact position, computed via a screen-to-design coordinate transform.
- As the wave front passes each geometric element, it temporarily adds to that shape's reaction strength, causing elements like rectangles to scale up slightly and "flip" via y-scale oscillation.
- Concurrently, a short pitched note is synthesised via the Web Audio API, where the canvas X-position maps to a specific index on a C-major pentatonic scale, and the Y-position controls the octave shift.
This creates a powerful sensation of literally **"playing" the canvas**: every click ripples across Kandinsky's composition while generating a unique, harmonious note. While the mouse is moving over the canvas, a soft hover wave is additionally emitted every ~0.16 seconds with opacity scaling based on mouse speed (Long et al., 2024, README §User Input).
 
**Figure 2**
*Interactive Click Wave and Visual Resonances on Canvas*
*(Visual Render Note.)* Real-time interaction wave front temporarily amplifies the transformation scale of background items and triggers the custom Web Audio oscillator script.
 
### Comprehensive Input Channels
 
- **Keyboard Toggles:** Pressing **1 / 2 / 3 / 4** toggles the Piano, Violin, Guitar, or Music Box individually. Pressing **5** assembles all instruments simultaneously, **0** unlocks and returns the scene to the original painting, and **L or Space** locks/unlocks the current visual state (Long et al., 2024, README §How to Run).
- **Velocity-Sensitive Drag & Scroll:** Clicking and dragging controls the global continuous assembly strength from 0 to 1. Fast flicks act as a "forte" gesture that snaps the assembly up dramatically, while slow drags provide a gentle, gradual "piano" transition. A continuous scroll-wheel channel is also supported for laptop trackpad gestures (Long et al., 2024, README §How to Run).
- **Spatial Target Input:** If a click lands directly inside a known instrument region on the canvas, it toggles only that specific instrument.
### Technical Optimisations and Considerations
 
The module features a purely computational mouse influence field (`window.mouseInfluence`), publishing a queryable API that completely decouples input tracking from visual rendering so other modules can subscribe without altering input code directly. When instruments are fully assembled, background shape reactions intelligently damp to ~35% strength to prevent visual competition with the main elements. To ensure stability, the code suppresses OS key auto-repeat to eliminate flicker, caches HUD DOM references to avoid per-frame queries, relies on a lazy initialisation retry loop to tolerate script loading orders, and respects accessibility settings by disabling intense motion for users with `prefers-reduced-motion` enabled (Long et al., 2024, README §Techniques).


## Part 3: Putting It Together 
The four mechanics share the same Kandinsky canvas, each controlling a different layer rather than a separate region. Time-based motion sets the underlying rhythm, Perlin noise adds organic variation to positions and colours, audio reshapes the forms through three frequency bands, and user input lets the viewer disturb nearby elements. They influence each other through shared geometric objects, so a single circle can pulse to the bass, drift over time, and still react to the mouse. What holds the piece together is Kandinsky's own logic: one colour palette, the original geometric vocabulary, and his idea of painting as visual music.

### Academic References
 
- **Benjamin, A.** (1989). Deconstruction and art/art and deconstruction. In *What is deconstruction?* (pp. 38–47). Academy Editions.
- **Cytowic, R. E.** (2002). *Synesthesia: A union of the senses* (2nd ed.). MIT Press.
- **Kandinsky, W.** (1946). *Concerning the spiritual in art* (H. Rebay, Trans.). Solomon R. Guggenheim Foundation. (Original work published 1911).
- **Kandinsky, W.** (1979). *Point and line to plane* (H. Dearstyne & H. Rebay, Trans.). Dover Publications. (Original work published 1926).
- **Long, J., Cong, Y., Feng, Z., & Xia, X.** (2024). *IDEA9103 Major Project: Reanimating Kandinsky's Composition VIII* [Source code & README]. GitHub. https://github.com/Jingyi-Long/creative_coding_maijor_project
- **Snibbe, S. S., & Levin, G.** (2001). Interactive dynamic abstraction. *Proceedings of the 14th Annual ACM Symposium on User Interface Software and Technology*, 21–30. https://doi.org/10.1145/502348.502353

## External References
 
- **MDN Web Audio API** — `AudioContext`, `AudioBufferSourceNode`, `AnalyserNode`, `GainNode`: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API> — used for the synchronised multi-stem playback and the live spectrum analysis, which go beyond the `p5.sound` material taught in class.
- **p5.js `p5.FFT` / `p5.Amplitude`** (Week 12 tutorial) — the audio-reactive concept (frequency bands driving visuals) follows this tutorial; we reproduced it with the lower-level Web Audio API.
- **p5.js noiseSeed()**— https://p5js.org/reference/p5/noiseSeed/ — used to keep the Perlin noise movement stable and repeatable across runs.
- **Google Arts & Culture & Centre Pompidou, *Play a Kandinsky*, 2021** — <https://artsandculture.google.com/experiment/play-a-kandinsky/sgF5ivv105ukhA>
- **Robert Hodgin, *Ancient Courses of Fictional Rivers*, 2022** — <https://www.artblocks.io/collection/ancient-courses-of-fictional-rivers-by-robert-hodgin> (trail / accumulation inspiration for the time-based mechanic).
- **Robert Hodgin, Ancient Courses of Fictional Rivers, 2022**, Art Blocks — https://www.artblocks.io/collection/ancient-courses-of-fictional-rivers-by-robert-hodgin — used as inspiration for generative visual movement, layered particle aesthetics, and time-based accumulation.

## AI Usage Statement
We used Claude (Anthropic) to assist with parts of the code.

Yuming Cong used ChatGPT to generate the image of the sketch.

Zichen Feng used ChatGPT to support idea development, code troubleshooting, and wording refinement.
