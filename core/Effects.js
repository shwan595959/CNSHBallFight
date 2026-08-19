export class Particle {
  constructor(x, y, color, vx, vy, radius = 4, life = 1.0) {
    this.x = x; this.y = y;
    this.color = color;
    this.vx = vx; this.vy = vy;
    this.radius = radius;
    this.life = life;
    this.decay = 0.02 + Math.random() * 0.02;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.93;   this.vy *= 0.93;
    this.life   -= this.decay;
    this.radius *= 0.96;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.1, this.radius), 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
  isDead() { return this.life <= 0 || this.radius < 0.2; }
}

export class LightningEffect {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.life = 1.0;
    this.segs = this.build();
  }
  build() {
    const segs = [];
    let px = this.x1, py = this.y1;
    for (let i = 1; i <= 8; i++) {
      const t  = i / 8;
      const nx = this.x1 + (this.x2 - this.x1) * t + (Math.random() - 0.5) * 36;
      const ny = this.y1 + (this.y2 - this.y1) * t + (Math.random() - 0.5) * 36;
      segs.push([px, py, nx, ny]);
      px = nx; py = ny;
    }
    return segs;
  }
  update() { this.life -= 0.1; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 12;
    this.segs.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.restore();
  }
  isDead() { return this.life <= 0; }
}

export class RingEffect {
  constructor(x, y, color, maxRadius = 80) {
    this.x = x; this.y = y;
    this.color     = color;
    this.radius    = 10;
    this.maxRadius = maxRadius;
    this.life      = 1.0;
  }
  update() {
    this.radius += (this.maxRadius - this.radius) * 0.15;
    this.life   -= 0.04;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha  = Math.max(0, this.life * 0.7);
    ctx.strokeStyle  = this.color;
    ctx.lineWidth    = 3;
    ctx.shadowColor  = this.color;
    ctx.shadowBlur   = 15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  isDead() { return this.life <= 0; }
}

export class FloatingText {
  constructor(x, y, text, color = '#fff', size = 14, life = 1.0) {
    this.x = x; this.y = y;
    this.text  = text;
    this.color = color;
    this.size  = size;
    this.life  = life;
    this.vy    = -1.5;
  }
  update() {
    this.y  += this.vy;
    this.vy *= 0.97;
    this.life -= 0.022;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font        = `bold ${this.size}px Segoe UI`;
    ctx.textAlign   = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth   = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle   = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
  isDead() { return this.life <= 0; }
}

export class shockwaveEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 0;
    this.alpha = 0.8;
    this.dead = false;
  }

  update(dt) {
    this.r += 4;
    this.alpha -= 0.03;
    if (this.alpha <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,255,255,${this.alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}