// audio-mechanic.js — Jingyi 负责(音频)
// 升级版:用一个 4/4 拍的小型音乐生成器替代单一脉冲,听不见但视觉上"在打节拍"。
// 四个声部:
//   kick  底鼓,落在 1 和 3 拍,驱动整幅画的亮度脉动
//   snare 军鼓,落在 2 和 4 拍,触发圆形高光
//   hihat 高帽,8 分音符,触发线条粗细微抖动
//   bass  低音,缓慢起伏的低频包络
// 真机替换:把 generateBeat() 换成 p5.sound 的 FFT/Amplitude 即可,接口不变。

const BPM = 100;
const BEAT_SEC = 60 / BPM;          // 一拍多长,这里是 0.6 秒
const SUBDIV = 8;                   // 每拍切 8 份用于 hihat 触发判断
let lastBeatIndex = -1;
let kickEnergy = 0, snareEnergy = 0, hihatEnergy = 0;

// 生成"假频谱":kick / snare / hihat / bass 各自的瞬时强度
function generateBeat(t) {
  // 当前在小节内的拍位(0~3.99...)
  const beatPos = (t / BEAT_SEC) % 4;
  const subIndex = Math.floor((t / (BEAT_SEC / SUBDIV)) % (4 * SUBDIV));

  // 触发判断:这一帧是否跨过了某个 8 分音符
  const beatTriggered = subIndex !== lastBeatIndex;
  if (beatTriggered) {
    const beatInBar = Math.floor(beatPos);
    const subInBeat = subIndex % SUBDIV;

    // 1 和 3 拍的正拍触发 kick
    if (subInBeat === 0 && (beatInBar === 0 || beatInBar === 2)) {
      kickEnergy = 1.0;
    }
    // 2 和 4 拍的正拍触发 snare
    if (subInBeat === 0 && (beatInBar === 1 || beatInBar === 3)) {
      snareEnergy = 1.0;
    }
    // 每个 8 分音符触发 hihat
    if (subInBeat % 2 === 0) {
      hihatEnergy = 0.8;
    }
    lastBeatIndex = subIndex;
  }

  // 衰减(像真实鼓声的 envelope)
  kickEnergy  = Math.max(0, kickEnergy  - 0.04);
  snareEnergy = Math.max(0, snareEnergy - 0.06);
  hihatEnergy = Math.max(0, hihatEnergy - 0.10);

  // bass:缓慢正弦,周期 8 拍
  const bass = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / (BEAT_SEC * 8)));

  return { kick: kickEnergy, snare: snareEnergy, hihat: hihatEnergy, bass };
}

function applyAudio(shapes, t) {
  const a = generateBeat(t);

  for (const s of shapes) {
    // bass 驱动整体亮度脉动,kick 在拍点给一记"重音"
    const targetBright = 1.0 + a.bass * 0.35 + a.kick * 0.55;
    s.brightness = lerp(s.brightness, targetBright, 0.18);

    // snare 让所有圆形(尤其是无填充的轮廓圆)粗细抖一下,模拟"高光击打"
    if (s.type === 'circle' && !s.filled) {
      const targetW = 1 + a.snare * 3.5;
      s.weightMul = lerp(s.weightMul, targetW, 0.3);
    }

    // hihat 触发线条与曲线的细微抖动
    if (s.type === 'line' || s.type === 'curve' || s.type === 'arc') {
      const targetW = 1 + a.hihat * 1.6 + a.kick * 1.2;
      s.weightMul = lerp(s.weightMul, targetW, 0.25);
    }
  }

  // 把当前能量挂到 window 上,供 HUD 显示
  window.__audioState = a;
}
