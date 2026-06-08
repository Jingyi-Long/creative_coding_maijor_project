CompositionVIII_gather_animation_vscode

This version keeps the updated same-timeline audio system, but changes the visual interaction.

Visual change:
- The original Composition VIII image stays as the first layer.
- Each instrument SVG is split into many separate SVG elements in JavaScript.
- When the user drags or presses 1/2/3/4/5, the elements move from different positions and slowly gather into the final instrument shape.
- This avoids the previous problem where the whole instrument image simply faded in as one layer.

Controls:
- Drag: gather all instruments while dragging; release to return.
- 1: Piano
- 2: Violin
- 3: Guitar
- 4: MusicBox
- 5: Gather all
- 0: Return to original image
- L or Space: lock/unlock

Please open the folder in VS Code and run index.html with Live Server.
