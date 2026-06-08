Composition VIII · Canon in D — same timeline version

This version uses aligned audio stems:
- ensemble.mp3
- piano.mp3
- violin.mp3
- guitar.mp3
- musicbox.mp3

All five files are exported with the same start point, same total duration, same sample rate, and same stereo format.

main.js has also been updated to use Web Audio API instead of starting five separate <audio> elements independently. This means all five tracks start from the same AudioContext time, like stems placed on one shared timeline in editing software.

Open this folder in VS Code and run index.html with Live Server.
