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
| [Member 2 Name] | [ycon0930](https://github.com/MiiiiinG03) | Time-based |
| [Zichen Feng] | [zfen0688](https://github.com/zf0688) | Perlin noise & randomness |
| [Member 4 Name] | [uid](https://github.com/username4) | User input |

### Audio — own by Jingyi Long
[Description]

### Time-based — own by Yuming Cong
Our project was inspired by Wassily Kandinsky’s belief that painting could function like music through rhythm, emotion, and composition. In Composition VIII, geometric forms, lines, and colours are arranged with a strong sense of visual rhythm. In our group project, I am responsible for designing the time-based changes within the visual system.

I plan to structure the visuals through stages similar to musical progression: introduction, build-up, climax, and resolution. At the beginning, the composition will remain minimal and balanced, with large concentric circles drifting slowly and expanding gently, while diagonal lines move with subtle oscillation. As the visual rhythm develops, circles will pulse more frequently, lines will overlap and shift direction, and triangles will rotate faster to increase visual tension. Additional geometric forms and particles will gradually appear, creating denser layers and more complex movement. During the climax stage, colour contrast and motion intensity will reach their peak before gradually slowing and returning to a calmer composition.

The user will not directly interact with this mechanic, but instead experience the artwork continuously evolving over time.

### Perlin Noise & Randomness — own by Zichen Feng
The audio mechanic plays a music track and uses the p5.sound library's FFT analyser to split the sound into three frequency bands: low, mid, and high. Each band controls a different family of shapes from Composition VIII.
Low frequencies (bass) drive the large black concentric circle in the upper-left corner, making it grow and pulse with the beat. Mid frequencies control the brightness of the yellow and violet discs, so they glow softly when the melody is active. High frequencies trigger quick flashes along the diagonal lines and sharpen the edges of the triangles when cymbals or other high sounds hit.
The user does not need to do anything except press play. Once the track starts, the painting responds to the music in real time, so watching and listening happen together.
This connects to our Part 1 vision because Kandinsky thought of Composition VIII as a kind of visual music. He believed shapes and colours could behave like sounds. Our mechanic brings that idea to life by letting real sound actually move the shapes he painted.

![An image of sketch](readmeImages/sketch.png)

### User Input — own by Member 4 Name
[Description]

---

## Part 3: Putting It Together 
The four mechanics will coexist within a single dynamic abstract canvas, exploring the geometric composition and musicality of Kandinsky’s *Composition VIII*. The Audio mechanic will alter the movement and rhythm of the graphics in response to sound; the Time-based mechanic controls the continuous evolution of the visuals over time; Perlin Noise and random variations create a sense of natural flow in the background and geometric elements; whilst the User Input mechanic allows the audience to interact with the visuals via the mouse, influencing the graphical changes. A unified set of geometric elements, colour palette and abstract visual language ties the entire work together, transforming it into a digital art experience characterised by rhythm, interactivity and immersion.
 
## References
placeholder

