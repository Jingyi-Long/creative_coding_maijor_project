// mechanic-time.js — 【Mechanic: Time-based】（待实现）
// 负责人(creative director):  ______
//
// 作业要求:用 timer 和 event 驱动一个 mechanic。
// 目前项目里还没有真正的「时间驱动」玩法,这个文件就是给你的。
//
// 它能用的「公共状态」(都在 main.js / 其他 mechanic 文件里,运行时可直接读写):
//   - groupPinned[inst]  : 设成 1 让某个乐器聚合出现,设成 0 让它散开 (input-mechanic.js)
//   - dragAssemble       : 0..1 的全局聚合度
//   - INSTRUMENTS        : ['piano','violin','guitar','musicbox']
//   - startAudio()       : 首次发声(注意:浏览器要求先有用户交互才允许播放)
//
// ── 思路示例(任选其一做成你的创意)──────────────────────────
//  A) 定时轮播:每隔几秒自动让一个乐器登场、上一个退场,像一段自动演出。
//  B) 编排序列:按时间轴在 0s/8s/16s... 触发不同的聚合组合(对上音乐段落)。
//  C) 节拍器:用固定间隔的 event 给画面打一个"脉冲"。
//
//  下面是 A) 的可运行骨架,解开注释、调参数即可:
// ============================================================

// let timeMechanicTimer = null;
// let timeStep = 0;
//
// function startTimeMechanic() {
//   if (timeMechanicTimer) return;
//   timeMechanicTimer = setInterval(() => {
//     // 先全部散开
//     INSTRUMENTS.forEach(i => groupPinned[i] = 0);
//     // 再让当前这一个登场
//     const inst = INSTRUMENTS[timeStep % INSTRUMENTS.length];
//     groupPinned[inst] = 1;
//     timeStep++;
//   }, 4000); // 每 4 秒切换一次,自己调
// }
//
// function stopTimeMechanic() {
//   clearInterval(timeMechanicTimer);
//   timeMechanicTimer = null;
// }
//
// // 用一个按键 't' 开关这个自动演出(在 input-mechanic.js 的 keydown 里加一行,
// // 或直接在这里自己加监听):
// // document.addEventListener('keydown', e => {
// //   if (e.key === 't' || e.key === 'T') {
// //     timeMechanicTimer ? stopTimeMechanic() : (startAudio(), startTimeMechanic());
// //   }
// // });
