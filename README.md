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

## How to Run & Interaction Instructions
 
1. Open the final project folder (`version 10/…`) in VS Code and run **`index.html` with Live Server**. The project loads local audio and SVG files, so it must be **served** (Live Server / a local server), not opened directly as a file.
2. **Click anywhere on the page once.** Browsers block audio until a user gesture, so this first click starts the synchronised soundtrack and the timed intro.
3. **Watch the intro:** the painting's shapes first appear as outlines, then fill with colour as the saturation gradually rises.
4. **Interact:**
   - **Drag the mouse** to gather the shapes into the instruments; **release** to let them return.
   - Press **1 / 2 / 3 / 4** to summon Piano / Violin / Guitar / Music box individually.
   - Press **5** to gather all instruments, **0** to return to the painting.
   - Press **L** or **Space** to lock / unlock the current state.
5. The time-based sequence runs on a roughly **98-second loop** and then resets automatically.
The piece is responsive — it re-scales when the browser window is resized.


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

The user input mechanic allows the audience to directly interact with the geometric composition through mouse movement and clicks, inspired by Google Arts & Culture's *Play a Kandinsky* project and Kandinsky's synesthesia colour theory.

When the mouse moves across the canvas, nearby geometric shapes respond to the cursor's proximity. Circles expand outward or produce ripple effects, lines bend or oscillate, and triangles rotate or shift colour. The closer the cursor is to a shape, the stronger the visual response; when the mouse moves away, shapes gradually return to their original state.

Different colour regions react in distinct ways based on Kandinsky's colour-sound associations. Yellow areas respond with quick, energetic movements, reflecting Kandinsky's association of yellow with trumpets. Blue areas react more slowly and softly, echoing the calm of an organ. Red areas produce moderate, balanced responses in between the two.

Additionally, clicking on the canvas sends a ripple wave outward from the click position. As the wave passes through geometric elements, each shape briefly reacts, creating the sensation of "playing" the painting like a musical instrument.

This mechanic is the only one that requires active participation from the viewer, complementing the automatic behaviours of the audio, time-based, and Perlin noise mechanics. It gives the audience a sense of personal agency and transforms the experience from passive observation into direct creative engagement with Kandinsky's visual language.

![Play a Kandinsky interactive interface](readmeImages/playakandinsky.png)
*Google Arts & Culture, Play a Kandinsky, 2021. Users can click on different colour regions of Kandinsky's Yellow-Red-Blue to hear the sounds he associated with each colour and shape.*

## Part 3: Putting It Together 
The four mechanics share the same Kandinsky canvas, each controlling a different layer rather than a separate region. Time-based motion sets the underlying rhythm, Perlin noise adds organic variation to positions and colours, audio reshapes the forms through three frequency bands, and user input lets the viewer disturb nearby elements. They influence each other through shared geometric objects, so a single circle can pulse to the bass, drift over time, and still react to the mouse. What holds the piece together is Kandinsky's own logic: one colour palette, the original geometric vocabulary, and his idea of painting as visual music.

## External References
 
- **MDN Web Audio API** — `AudioContext`, `AudioBufferSourceNode`, `AnalyserNode`, `GainNode`: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API> — used for the synchronised multi-stem playback and the live spectrum analysis, which go beyond the `p5.sound` material taught in class.
- **p5.js `p5.FFT` / `p5.Amplitude`** (Week 12 tutorial) — the audio-reactive concept (frequency bands driving visuals) follows this tutorial; we reproduced it with the lower-level Web Audio API.
- **Google Arts & Culture & Centre Pompidou, *Play a Kandinsky*, 2021** — <https://artsandculture.google.com/experiment/play-a-kandinsky/sgF5ivv105ukhA>
- **Robert Hodgin, *Ancient Courses of Fictional Rivers*, 2022** — <https://www.artblocks.io/collection/ancient-courses-of-fictional-rivers-by-robert-hodgin> (trail / accumulation inspiration for the time-based mechanic).

## AI Usage Statement
We used Claude (Anthropic) to assist with parts of the code.

Yuming Cong used ChatGPT to generate the image of the sketch.