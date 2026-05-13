# IDEA9103 Major Project 

## Project Overview

[Briefly describe what your project is about in 2-3 sentences.]

## Inspiration
Our project draws inspiration from Wassily Kandinsky’s __Composition VIII (1923)__, a defining work of geometric abstract art that explores rhythm, emotion, and the relationship between colour and sound through circles, lines, and geometric forms. Kandinsky believed that painting could evoke feelings similarly to music, and this connection between visual art and sound became the core inspiration for our project.

We aim to transform this static abstract painting into a dynamic interactive artwork where viewers can influence geometric elements through sound, mouse interaction, and time-based changes. We were also inspired by Google Arts & Culture’s Play a Kandinsky project, as well as generative art and abstract motion graphics, to create an immersive audiovisual experience that combines movement, rhythm, and interaction.

![An image of Composition VIII](readmeImages/image.png)
*Wassily Kandinsky, Composition VIII, 1923, oil on canvas, 140 × 201 cm. Solomon R. Guggenheim Museum, New York.*

---

## Part 2: Mechanics
### Team Members

| Name | uid | Mechanic |
|------|--------|----------|
| [Member 1 Name] | [jlon6684](https://github.com/username1) | Audio |
| [Yuming Cong] | [ycon0930](https://github.com/MiiiiinG03) | Time-based |
| [Zichen Feng] | [zfen0688](https://github.com/zf0688) | Perlin noise & randomness |
| [Xiaoyu Xia] | [xxia0518](https://github.com/xxia0518) | User input |

### Audio — own by Jingyi Long
[Description]

### Time-based — own by Yuming Cong
Our project was inspired by Wassily Kandinsky’s belief that **painting could function like music through rhythm, emotion, and composition.** In Composition VIII, geometric forms, lines, and colours are arranged with a strong sense of visual rhythm. In our group project, I am responsible for designing the time-based visual evolution of the system, using alpha blending to support continuous trajectory retention.

This mechanic is structured through stages similar to musical progression: **introduction, build-up, climax, and resolution.**
At the beginning, the composition remains minimal and balanced. Large concentric circles drift slowly and expand gently, while diagonal lines move with subtle oscillation. Trails are short-lived and quickly fade, maintaining a clear and spacious composition.
As the visual rhythm develops, circles pulse more frequently, lines overlap and shift direction, and triangles rotate faster to increase visual tension. Movement becomes more active, and trails last longer, gradually building visual density through overlapping paths. Additional geometric forms and particles also begin to appear, creating more layered and complex movement.
During the climax stage, motion and interaction reach their highest intensity. Trails persist and accumulate, forming a dense layered “memory” of movement, while colour contrast becomes stronger and the overall composition becomes more dynamic.
Finally, in the resolution stage, movement gradually slows and trails begin to fade again, returning the composition to a calmer and more balanced state.

The user will not directly interact with this mechanic, but instead experience the artwork continuously evolving over time.

![An image of sketch](Sketch.jpg)

**References:**
- Ancient Courses of Fictional Rivers, Robert Hodgin, 2022.
https://www.artblocks.io/collection/ancient-courses-of-fictional-rivers-by-robert-hodgin

### Perlin Noise & Randomness — own by Zichen Feng
The audio mechanic plays a music track and uses the p5.sound library's FFT analyser to split the sound into three frequency bands: low, mid, and high. Each band controls a different family of shapes from Composition VIII.
Low frequencies (bass) drive the large black concentric circle in the upper-left corner, making it grow and pulse with the beat. Mid frequencies control the brightness of the yellow and violet discs, so they glow softly when the melody is active. High frequencies trigger quick flashes along the diagonal lines and sharpen the edges of the triangles when cymbals or other high sounds hit.
The user does not need to do anything except press play. Once the track starts, the painting responds to the music in real time, so watching and listening happen together.
This connects to our Part 1 vision because Kandinsky thought of Composition VIII as a kind of visual music. He believed shapes and colours could behave like sounds. Our mechanic brings that idea to life by letting real sound actually move the shapes he painted.

![An image of sketch](readmeImages/sketch.png)

### User Input — own by Xiaoyu Xia

The user input mechanic allows the audience to directly interact with the geometric composition through mouse movement and clicks, inspired by Google Arts & Culture's *Play a Kandinsky* project and Kandinsky's synesthesia colour theory.

When the mouse moves across the canvas, nearby geometric shapes respond to the cursor's proximity. Circles expand outward or produce ripple effects, lines bend or oscillate, and triangles rotate or shift colour. The closer the cursor is to a shape, the stronger the visual response; when the mouse moves away, shapes gradually return to their original state.

Different colour regions react in distinct ways based on Kandinsky's colour-sound associations. Yellow areas respond with quick, energetic movements, reflecting Kandinsky's association of yellow with trumpets. Blue areas react more slowly and softly, echoing the calm of an organ. Red areas produce moderate, balanced responses in between the two.

Additionally, clicking on the canvas sends a ripple wave outward from the click position. As the wave passes through geometric elements, each shape briefly reacts, creating the sensation of "playing" the painting like a musical instrument.

This mechanic is the only one that requires active participation from the viewer, complementing the automatic behaviours of the audio, time-based, and Perlin noise mechanics. It gives the audience a sense of personal agency and transforms the experience from passive observation into direct creative engagement with Kandinsky's visual language.

![Play a Kandinsky interactive interface](readmeImages/playakandinsky.png)
*Google Arts & Culture, Play a Kandinsky, 2021. Users can click on different colour regions of Kandinsky's Yellow-Red-Blue to hear the sounds he associated with each colour and shape.*

**References:**
- Google Arts & Culture & Centre Pompidou, *Play a Kandinsky*, 2021. Available at: https://artsandculture.google.com/experiment/play-a-kandinsky/sgF5ivv105ukhA

## Part 3: Putting It Together 
The four mechanics will coexist within a single dynamic abstract canvas, exploring the geometric composition and musicality of Kandinsky’s *Composition VIII*. The Audio mechanic will alter the movement and rhythm of the graphics in response to sound; the Time-based mechanic controls the continuous evolution of the visuals over time; Perlin Noise and random variations create a sense of natural flow in the background and geometric elements; whilst the User Input mechanic allows the audience to interact with the visuals via the mouse, influencing the graphical changes. A unified set of geometric elements, colour palette and abstract visual language ties the entire work together, transforming it into a digital art experience characterised by rhythm, interactivity and immersion.
 
## References
placeholder

