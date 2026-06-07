Composition VIII · Canon in D — version 6 (User Input mechanic)

Creative director for this mechanic: Xiaoyu (User Input)

This version keeps everything from version 5 (same-timeline Web Audio,
fragment gather animation, background particle dissolve) and only upgrades
the User Input mechanic in input-mechanic.js.

What the User Input mechanic now does:
1. Drag            – gather all instruments while dragging; release to return.
2. Click a corner  – clicking (without dragging) toggles only the nearest
                     instrument corner. This is spatial input: the four
                     instruments live in four corners, so a click near a
                     corner pulls that one instrument out / puts it back.
3. Scroll wheel    – fine-tune the overall gather amount step by step.
4. Keys 1/2/3/4    – toggle a single instrument.
5. Key 5           – gather all.
6. Key 0           – return to the original Composition VIII.
7. L or Space      – lock / unlock (locked = stays gathered after release).

Interface kept identical to version 5 so the other mechanics are untouched:
- groupPinned (object)   read by main.js render()
- dragAssemble (number)  read by main.js render()
- locked (boolean)
- updateHud()            called every frame by main.js
- startAudio()           from mechanic-audio.js, triggered on first input

Open this folder in VS Code and run index.html with Live Server.
Click the page once to start audio.
