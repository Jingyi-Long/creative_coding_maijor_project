// mechanic-audio.js — [Mechanic: Audio]
// Creative director: Jingyi Long
//
// This file owns all sound: same-timeline loading, synchronised start, and dynamic mixing.
// It also uses an AnalyserNode to turn the sound's frequency content into window.audioBands,
// which drives the brightness/colour flicker of the instruments.
// The five stems share one AudioContext clock and are started with the same `when`, so looping
// keeps them aligned without drift.
//
// Two directions:
//   1) Visual -> audio: the assembly amount groupAssemble controls each track's volume (updateAudioVolumes).
//   2) Audio -> visual: the live spectrum is split into four bands for the four instruments,
//      published on window.audioBands (updateAudioReactive).
//      ^ This satisfies the brief's requirement to "drive a mechanic with the audio's level / frequency content".
//
// Cross-file dependencies (provided at runtime by main.js / perlin):
//   INSTRUMENTS, groupAssemble, smoothstep(), lerp()

const AUDIO_KEYS = ['piano', 'violin', 'guitar', 'musicbox', 'ensemble'];

const AUDIO_FILES = {
  piano: 'piano.mp3',
  violin: 'violin.mp3',
  guitar: 'guitar.mp3',
  musicbox: 'musicbox.mp3',
  ensemble: 'ensemble.mp3'
};

let audioStarted = false;
let audioLoaded = false;
let audioStartInProgress = false;
let audioCtx = null;
let audioLoadPromise = null;
let loadedCount = 0;

const audioBuffers = {};
const audioSources = {};
const audioGains = {};

// ============================================================
//  Music mixing setup
//  Goal: avoid the four instruments + background music becoming too loud or muddy when played together.
//  Logic:
//  1. When no instrument is present, the ensemble acts as the main background music.
//  2. Once instruments appear, the ensemble automatically drops to a very quiet background pad.
//  3. The more instruments present at once, the lower each instrument's volume, to avoid a harsh pile-up.
//  4. Finally a compressor lightly compresses the output to prevent sudden peaks.
// ============================================================
const AUDIO_MIX = {
  ensembleIdle: 0.42,      // background music volume when no instrument is present
  ensembleActive: 0.07,    // background music drops to this once instruments have formed
  instrumentSolo: 0.34,    // maximum volume for a single instrument
  instrumentMin: 0.16,     // roughly the floor each instrument drops to when all four are present
  master: 0.88             // master volume
};

let masterGain = null;
let compressor = null;

function updateAudioVolumes(maxAssemble) {
  if (!audioStarted || !audioCtx) return;

  // How many instruments are currently present. Not a simple 1/2/3/4 count, but weighted by assembly amount.
  const activeAmount = INSTRUMENTS.reduce((sum, inst) => sum + groupAssemble[inst], 0);

  // The more instruments, the more each one is automatically turned down, so four sounds stacked together aren't noisy.
  const crowdReducer = 1 / Math.sqrt(Math.max(1, activeAmount));
  const instMaxVolume = Math.max(
    AUDIO_MIX.instrumentMin,
    AUDIO_MIX.instrumentSolo * crowdReducer
  );

  for (const inst of INSTRUMENTS) {
    if (audioGains[inst]) {
      const target = instMaxVolume * groupAssemble[inst];
      audioGains[inst].gain.setTargetAtTime(target, audioCtx.currentTime, 0.06);
    }
  }

  // Background-music ducking: the more prominent the instruments, the more the background ducks down.
  // This avoids the noisy feeling of "instruments + ensemble both fighting for the lead".
  if (audioGains.ensemble) {
    const duck = smoothstep(0.08, 0.85, maxAssemble);
    const ensembleTarget = lerp(AUDIO_MIX.ensembleIdle, AUDIO_MIX.ensembleActive, duck);
    audioGains.ensemble.gain.setTargetAtTime(ensembleTarget, audioCtx.currentTime, 0.08);
  }

  if (masterGain) {
    masterGain.gain.setTargetAtTime(AUDIO_MIX.master, audioCtx.currentTime, 0.08);
  }
}

//  Audio: same-timeline loading / simultaneous start
// ============================================================
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

async function loadAudioBuffers() {
  if (audioLoadPromise) return audioLoadPromise;

  const ctx = getAudioContext();
  loadedCount = 0;
  updateLoadProgress();

  audioLoadPromise = Promise.all(AUDIO_KEYS.map(async key => {
    const res = await fetch(AUDIO_FILES[key]);
    const buf = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    audioBuffers[key] = decoded;
    loadedCount++;
    updateLoadProgress();
  })).then(() => {
    audioLoaded = true;
    updateLoadProgress();
  }).catch(err => {
    console.error('audio load failed:', err);
  });

  return audioLoadPromise;
}

function setupMasterAudioChain() {
  const ctx = getAudioContext();
  if (masterGain && compressor) return;

  masterGain = ctx.createGain();
  masterGain.gain.value = AUDIO_MIX.master;

  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 24;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;

  masterGain.connect(compressor);
  compressor.connect(ctx.destination);
}

function createStemSource(key, when) {
  const ctx = getAudioContext();
  setupMasterAudioChain();

  const src = ctx.createBufferSource();
  src.buffer = audioBuffers[key];
  src.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = key === 'ensemble' ? AUDIO_MIX.ensembleIdle : 0;

  // Each stem goes into its own gain first, then into master/compressor, to avoid overall clipping.
  src.connect(gain).connect(masterGain);
  src.start(when, 0);

  audioSources[key] = src;
  audioGains[key] = gain;
}

async function startAudio() {
  if (audioStarted || audioStartInProgress) return;

  audioStartInProgress = true;
  const ctx = getAudioContext();

  await ctx.resume();
  await loadAudioBuffers();

  const when = ctx.currentTime + 0.06;
  AUDIO_KEYS.forEach(key => createStemSource(key, when));

  setupAudioAnalyser();   // attach the analyser after sound starts, for "audio drives visual"

  audioStarted = true;
  audioStartInProgress = false;
  updateLoadProgress();
}

function updateLoadProgress() {
  const total = AUDIO_KEYS.length;
  const pct = Math.round((loadedCount / total) * 100);
  const el = document.getElementById('audio-progress');
  if (!el) return;

  if (pct >= 100) {
    el.textContent = audioStarted ? '' : '♪ click to start canon';
  } else {
    el.textContent = 'audio loading ' + pct + '%';
  }
}

// -----------------------------------------------------------
// AI acknowledgement (Claude / Anthropic):
// The audio-reactive section below was written with help from Claude — specifically
// the AnalyserNode setup, the 4-band frequency-to-instrument mapping (BAND_RANGES),
// and the slow-baseline + sensitivity normalisation in updateAudioReactive().
// How it works: it taps the master output, reads the live frequency spectrum every
// frame, and publishes a 0..1 energy value per instrument on window.audioBands, which
// the visual layer reads to drive the brightness/saturation flicker.
// (The synchronised multi-stem playback and volume mixing above are our own work.)
// -----------------------------------------------------------
// ============================================================
//  Audio -> visual: turn the sound's "frequency content" into a flicker strength per instrument.
//  Brief requirement: drive a mechanic with the audio's level / frequency content.
//  The Week 12 tutorial (Part 4) used p5.FFT.getEnergy("bass"/"treble"...) to read each band's energy;
//  here, because we use a manual AudioContext for five-stem synchronisation, we use the native
//  Web Audio AnalyserNode to read the spectrum instead
//  (equivalent to p5.FFT.analyze() / getEnergy(); source: MDN Web Audio API; this is outside the course).
//  This layer only "reads" the sound and publishes window.audioBands — it does not change the sound,
//  nor touch any other mechanic.
// ============================================================
let analyser = null;       // spectrum analyser node
let freqData = null;       // reused spectrum buffer (filled each frame with values 0..255)

function setupAudioAnalyser() {
  const ctx = getAudioContext();
  if (analyser) return;                          // create only once
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;                        // power of two; number of bands = fftSize/2 = 128
  analyser.smoothingTimeConstant = 0.7;          // 0..1; smaller = more responsive (default 0.8); too small jitters, too large smears
  freqData = new Uint8Array(analyser.frequencyBinCount);
  if (masterGain) masterGain.connect(analyser);  // only listens to the mixed master output; does not affect playback
}

// Split the spectrum into four bands by proportion of the whole spectrum: low -> high = piano / guitar / violin / music box.
const BAND_RANGES = {
  piano:    { lo: 0.00, hi: 0.12 },   // low frequencies
  guitar:   { lo: 0.12, hi: 0.30 },   // low-mid
  violin:   { lo: 0.30, hi: 0.60 },   // mid-high
  musicbox: { lo: 0.60, hi: 1.00 }    // high frequencies
};

// "Above-baseline" drive: each band tracks a slow baseline (≈ this music's average level),
// and the flicker takes only "how far the current value rises above that baseline", times a sensitivity. Benefits:
//   - A gentle piece (like Canon in D) has very small absolute swings, but multiplied by the sensitivity
//     every little melodic rise and fall is pushed into a visible flicker;
//   - When the music stays steady, current value ≈ baseline -> output 0, automatically returning to dark,
//     instead of the old adaptive window "collapsing" to no flicker during steady passages.
const bandBaseline = {};

// vvv Main knobs vvv
// SENSITIVITY: turn it up for gentle pieces (7~12), down for energetic pieces (2~4). If you can't see the flicker, raise this first.
const SENSITIVITY  = 8.0;
// BASELINE_RATE: how fast the baseline follows. Smaller = slower, better at highlighting longer melodic swells; larger = only reacts to sudden changes.
const BASELINE_RATE = 0.012;
// CONTRAST: contrast curve. >1 makes the flicker more "punchy" (dark stays darker, only peaks show); set to 1 for a continuous soft glow.
const CONTRAST = 1.3;

// Called every frame: compress the current spectrum into "one 0..1 energy value per instrument", published for the visual layer to read.
function updateAudioReactive() {
  if (!analyser) { window.audioBands = null; return; }
  analyser.getByteFrequencyData(freqData);       // current-frame spectrum, each value 0..255
  const binCount = freqData.length;
  const bands = {};
  for (const inst in BAND_RANGES) {
    const range = BAND_RANGES[inst];
    const start = Math.floor(range.lo * binCount);
    const end   = Math.max(start + 1, Math.floor(range.hi * binCount));
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i];
    const avg = (sum / (end - start)) / 255;     // average energy of this band, raw value 0..1

    // Slow baseline: follows the current value very slowly; represents this music's "average level".
    if (bandBaseline[inst] === undefined) bandBaseline[inst] = avg;
    bandBaseline[inst] += (avg - bandBaseline[inst]) * BASELINE_RATE;

    // Take only the part above the baseline, amplify by sensitivity, clamp to 0..1, then apply the contrast curve.
    let level = (avg - bandBaseline[inst]) * SENSITIVITY;
    level = Math.max(0, Math.min(1, level));
    bands[inst] = Math.pow(level, CONTRAST);
  }
  window.audioBands = bands;
}
