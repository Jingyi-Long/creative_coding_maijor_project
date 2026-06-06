Composition VIII · Canon in D — updated VS Code project

What changed:
1. The five MP3 files have been replaced with the aligned version:
   ensemble.mp3, piano.mp3, violin.mp3, guitar.mp3, musicbox.mp3
2. All five audio files have the same duration: about 218.697 seconds.
3. The project filenames are restored to the exact names used by index.html.
4. main.js includes a small sync guard: ensemble.mp3 is treated as the master timeline, and the four instrument tracks re-sync if browser playback drifts.

How to use:
1. Unzip this folder.
2. Open the whole folder in VS Code.
3. Open index.html with Live Server.
4. Click the page once to start audio.
5. Press 1/2/3/4 to activate separate instruments, 5 for all, 0 to close all, L to lock.
