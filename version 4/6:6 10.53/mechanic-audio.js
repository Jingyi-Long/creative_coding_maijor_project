// mechanic-audio.js — 【Mechanic: Audio】
// 负责人(creative director):  ______
//
// 这个文件管所有声音:同一时间轴加载、同步启动、动态混音,
// 并通过 AnalyserNode 把声音的频率内容算成 window.audioBands,驱动乐器的亮度/颜色闪动。
// 五条 stem 共用一个 AudioContext 时钟,用同一个 when 同时 start(),靠循环对齐不漂移。
//
// 两个方向:
//   1) 视觉 → 音频:画面聚合度 groupAssemble 控制各轨音量(updateAudioVolumes)。
//   2) 音频 → 视觉:实时频谱分四段对应四个乐器,公开 window.audioBands(updateAudioReactive)。
//      ↑ 这条满足作业要求「用音频的 level / frequency content 驱动 mechanic」。
//
// 跨文件依赖(运行时,均由 main.js / perlin 提供):
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
//  音乐混音设置
//  目的：避免四个乐器 + 背景音乐一起播放时太吵、太糊。
//  逻辑：
//  1. 没有乐器时，ensemble 作为主背景音乐。
//  2. 乐器出现后，ensemble 自动降低，变成很轻的背景垫音。
//  3. 同时出现的乐器越多，每个乐器音量越低，避免叠加后刺耳。
//  4. 最后通过 compressor 轻微压缩，防止突然爆音。
// ============================================================
const AUDIO_MIX = {
  ensembleIdle: 0.42,      // 没有乐器时的背景音乐音量
  ensembleActive: 0.07,    // 乐器组成后，背景音乐降低到这个音量
  instrumentSolo: 0.34,    // 单个乐器最大音量
  instrumentMin: 0.16,     // 四个乐器同时出现时，每个乐器大约降到这个范围
  master: 0.88             // 总音量
};

let masterGain = null;
let compressor = null;

function updateAudioVolumes(maxAssemble) {
  if (!audioStarted || !audioCtx) return;

  // 当前有多少乐器正在出现。不是简单数 1/2/3/4，而是按聚合程度算。
  const activeAmount = INSTRUMENTS.reduce((sum, inst) => sum + groupAssemble[inst], 0);

  // 乐器越多，每个乐器越要自动降音量，避免四个声音叠在一起很聒噪。
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

  // 背景音乐 ducking：乐器越明显，背景越自动降低。
  // 这样不会出现“乐器 + ensemble 一起抢主旋律”的吵闹感。
  if (audioGains.ensemble) {
    const duck = smoothstep(0.08, 0.85, maxAssemble);
    const ensembleTarget = lerp(AUDIO_MIX.ensembleIdle, AUDIO_MIX.ensembleActive, duck);
    audioGains.ensemble.gain.setTargetAtTime(ensembleTarget, audioCtx.currentTime, 0.08);
  }

  if (masterGain) {
    masterGain.gain.setTargetAtTime(AUDIO_MIX.master, audioCtx.currentTime, 0.08);
  }
}

//  音频：同一时间轴加载 / 同时启动
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

  // 每条 stem 先进入自己的 gain，再进入 master/compressor，避免整体爆音。
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

  setupAudioAnalyser();   // 声音启动后挂上分析器,供"音频驱动视觉"使用

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

// ============================================================
//  音频 → 视觉:把声音的"频率内容"算成每个乐器的闪动强度
//  作业要求:用音频的 level / frequency content 驱动 mechanic。
//  课程 Week 12 Part 4 用 p5.FFT.getEnergy("bass"/"treble"...) 取各频段能量;
//  这里因为我们用手动 AudioContext 做五轨同步,改用原生 Web Audio 的 AnalyserNode 取频谱
//  (作用等同 p5.FFT.analyze() / getEnergy(),来源:MDN Web Audio API,属课程之外的技术)。
//  这一层只"读"声音、向外公开 window.audioBands,不改变发声,也不碰别的 mechanic。
// ============================================================
let analyser = null;       // 频谱分析节点
let freqData = null;       // 复用的频谱数据缓冲(每帧填入 0..255 的值)

function setupAudioAnalyser() {
  const ctx = getAudioContext();
  if (analyser) return;                          // 只建一次
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;                        // 2 的幂;频段数 = fftSize/2 = 128
  freqData = new Uint8Array(analyser.frequencyBinCount);
  if (masterGain) masterGain.connect(analyser);  // 只监听混音后的总输出,不影响发声
}

// 频谱按"占整条频谱的比例"切成四段:低 → 高 = 钢琴 / 吉他 / 小提琴 / 八音盒。
// gain 用来补偿高频天生比低频弱的问题,让四个乐器闪得更均衡(自己微调)。
const BAND_RANGES = {
  piano:    { lo: 0.00, hi: 0.12, gain: 1.0 },   // 低频
  guitar:   { lo: 0.12, hi: 0.30, gain: 1.3 },   // 中低频
  violin:   { lo: 0.30, hi: 0.60, gain: 1.8 },   // 中高频
  musicbox: { lo: 0.60, hi: 1.00, gain: 2.6 }    // 高频(最弱,补偿最多)
};

// 每帧调用:把当前频谱压成"每个乐器一个 0..1 的能量值",公开给视觉层读取。
function updateAudioReactive() {
  if (!analyser) { window.audioBands = null; return; }
  analyser.getByteFrequencyData(freqData);       // 当前帧频谱,每个值 0..255
  const binCount = freqData.length;
  const bands = {};
  for (const inst in BAND_RANGES) {
    const range = BAND_RANGES[inst];
    const start = Math.floor(range.lo * binCount);
    const end   = Math.max(start + 1, Math.floor(range.hi * binCount));
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i];
    const avg = (sum / (end - start)) / 255;     // 该频段平均能量,归一化 0..1
    bands[inst] = Math.min(1, avg * range.gain);  // 乘补偿增益并夹到 1 以内
  }
  window.audioBands = bands;
}
