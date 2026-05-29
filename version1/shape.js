// shape.js — Shape 类定义
// 每个形状持有「基础属性」+「四个 mechanic 各自写入的修饰参数」。
// mechanic 只改参数,绝不直接绘制;最后由 display() 合成绘制。

class Shape {
  constructor(data, scaleX, scaleY) {
    this.type = data.type;

    // 基础属性(只读,永不被 mechanic 改写)
    const avgScale = (scaleX + scaleY) / 2;
    this.baseX = data.x * scaleX;
    this.baseY = data.y * scaleY;
    this.baseSize = (data.size || 0) * avgScale;
    this.baseColor = PALETTE[data.color];
    this.baseLen = (data.len || 0) * scaleX;
    this.baseAngle = data.angle || 0;
    this.filled = data.filled !== false;
    this.baseWeight = data.weight || 2;
    this.baseRotation = data.rotation || 0;

    // arc 专用
    this.arcStart = data.start || 0;
    this.arcStop = data.stop || Math.PI * 2;

    // curve 专用(贝塞尔曲线端点 + 控制点)
    this.x2 = (data.x2 || 0) * scaleX;
    this.y2 = (data.y2 || 0) * scaleY;
    this.cpx = (data.cpx || 0) * scaleX;
    this.cpy = (data.cpy || 0) * scaleY;

    // 大小分级,供 noise mechanic 分层使用
    this.sizeClass = this.classify();

    // Zichen 噪声:位置偏移
    this.offsetX = 0;
    this.offsetY = 0;

    // Yuming 时间:尺寸缩放 + 透明度
    this.sizeScale = 1;
    this.alpha = 255;

    // Jingyi 音频:亮度 + 线条粗细倍数
    this.brightness = 1;
    this.weightMul = 1;

    // Xiaoyu 鼠标:局部反应
    this.rippleR = 0;
    this.rippleAlpha = 0;
    this.rotation = 0;
    this.bend = 0;

    // 每个形状一个相位,错开节奏
    this.phase = Math.random() * Math.PI * 2;
  }

  classify() {
    if (this.type === 'line' || this.type === 'curve') return 'line';
    if (this.baseSize > 80) return 'large';
    if (this.baseSize > 35) return 'medium';
    return 'small';
  }

  // 把基础色按 brightness 提亮,套用 alpha
  litColor() {
    const c = color(this.baseColor);
    const r = Math.min(255, red(c) * this.brightness);
    const g = Math.min(255, green(c) * this.brightness);
    const b = Math.min(255, blue(c) * this.brightness);
    return color(r, g, b, this.alpha);
  }

  display() {
    push();
    const x = this.baseX + this.offsetX;
    const y = this.baseY + this.offsetY;
    translate(x, y);
    const col = this.litColor();

    if (this.type === 'circle') {
      const d = this.baseSize * this.sizeScale;
      if (this.filled) {
        noStroke();
        fill(col);
        ellipse(0, 0, d, d);
      } else {
        noFill();
        stroke(col);
        strokeWeight(this.baseWeight * this.weightMul);
        ellipse(0, 0, d, d);
      }
      // 涟漪
      if (this.rippleAlpha > 1) {
        noFill();
        stroke(red(col), green(col), blue(col), this.rippleAlpha);
        strokeWeight(2);
        ellipse(0, 0, this.rippleR * 2, this.rippleR * 2);
      }

    } else if (this.type === 'triangle') {
      noStroke();
      fill(col);
      rotate(this.baseRotation + this.rotation);
      const s = this.baseSize * this.sizeScale;
      triangle(0, -s * 0.6, -s * 0.55, s * 0.5, s * 0.55, s * 0.5);

    } else if (this.type === 'line') {
      stroke(col);
      strokeWeight(this.baseWeight * this.weightMul);
      rotate(this.baseAngle);
      const half = this.baseLen / 2;
      noFill();
      if (Math.abs(this.bend) > 0.5) {
        beginShape();
        vertex(-half, 0);
        quadraticVertex(0, this.bend, half, 0);
        endShape();
      } else {
        line(-half, 0, half, 0);
      }

    } else if (this.type === 'arc') {
      noFill();
      stroke(col);
      strokeWeight(this.baseWeight * this.weightMul);
      const d = this.baseSize * 2 * this.sizeScale;
      arc(0, 0, d, d, this.arcStart, this.arcStop);

    } else if (this.type === 'curve') {
      // 注意:curve 用绝对坐标,所以先 pop 平移,再画
      pop();
      push();
      noFill();
      stroke(col);
      strokeWeight(this.baseWeight * this.weightMul);
      const x1 = this.baseX + this.offsetX;
      const y1 = this.baseY + this.offsetY;
      const x2 = this.x2 + this.offsetX;
      const y2 = this.y2 + this.offsetY;
      beginShape();
      vertex(x1, y1);
      quadraticVertex(this.cpx, this.cpy + this.bend, x2, y2);
      endShape();

    } else if (this.type === 'square') {
      noStroke();
      fill(col);
      rotate(this.baseRotation + this.rotation);
      const s = this.baseSize * this.sizeScale;
      rectMode(CENTER);
      rect(0, 0, s, s);
    }
    pop();
  }
}
