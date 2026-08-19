import { FloatingText } from './Effects.js';
import { soundManager } from './SoundManager.js';

export const Utils = {
  dist:      (a, b)     => Math.hypot(a.x - b.x, a.y - b.y),
  angle:     (from, to) => Math.atan2(to.y - from.y, to.x - from.x),
  randRange: (min, max) => Math.random() * (max - min) + min,
};

function getCanvasSize() {
  const canvas = document.getElementById('canvas');
  return { W: canvas?.width ?? 700, H: canvas?.height ?? 500 };
}


export class Ball {
  constructor(x, y, cfg) {
    this.x  = x;
    this.y  = y;

    // ✅ 시작 시 랜덤 방향으로 일정 속도
    const angle  = Math.random() * Math.PI * 2;
    const speed  = cfg.speed ?? 2.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius = cfg.radius ?? 20;
    this.mass   = cfg.mass   ?? 1;
    this.maxHp  = cfg.hp     ?? 100;
    this.hp     = this.maxHp;
    this.speed  = speed;
    this.color  = cfg.color  ?? '#ffffff';
    this.name   = cfg.name   ?? 'Ball';
    this.id     = cfg.id;
    this.rank   = null;

    this.kshstun = 0;

    this.frozen    = 0;
    this.stunned   = 0;
    this.slowed    = 0;
    this.burning   = 0;
    this.burnTimer = 0;

    this.stunTimer = 0;

    this.shield    = 0;
    this.maxShield = 0;

    this.dead   = false;
    this.invincible = false;
    this.skills = [];

    if (cfg.image){
        this.img = new Image();
        this.img.src = cfg.image;
    } else {
        this.img = null;
    }
  }

  
  

  applyFrozen(ms)  { this.frozen  = Math.max(this.frozen,  ms); }
  applyStunned(ms) { this.stunned = Math.max(this.stunned, ms); }
  applySlowed(ms)  { this.slowed  = Math.max(this.slowed,  ms); }
  applyBurning(ms) { this.burning = Math.max(this.burning, ms); }

  takeDamage(amount, effects, invincibleRejective=false) {
    if (this.dead) return;
    if (this.invincible && !invincibleRejective) return;
    if (this.shield > 0) {
      const abs = Math.min(this.shield, amount);
      this.shield -= abs;
      amount      -= abs;
      if (effects && abs > 0) {
        effects.push(new FloatingText(
          this.x + Utils.randRange(-8, 8),
          this.y - this.radius - 8,
          `🛡${abs.toFixed(0)}`, '#3b5058'
        ));
      }
    }
    if (amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (effects) {
      effects.push(new FloatingText(
        this.x + Utils.randRange(-8, 8),
        this.y - this.radius - 8,
        `-${amount.toFixed(0)}`, '#FF6B6B'
      ));
    }
    if (this.hp <= 0) {soundManager.play("BarrierBreaker", 2.0); this.dead = true; }
  }

  heal(amount, effects) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (effects) {
      effects.push(new FloatingText(
        this.x + Utils.randRange(-8, 8),
        this.y - this.radius - 8,
        `+${amount.toFixed(0)}`, '#5a9c7b'
      ));
    }
  }

  update(dt, now, allBalls, effects) {
  if (this.dead || this.kshstun) return;

  // 상태이상 타이머
  this.frozen  = Math.max(0, this.frozen  - dt);
  this.stunned = Math.max(0, this.stunned - dt);
  this.slowed  = Math.max(0, this.slowed  - dt);
  this.burning = Math.max(0, this.burning - dt);

  // 화상 도트
  if (this.burning > 0) {
    this.burnTimer += dt;
    if (this.burnTimer >= 1000) {
      this.burnTimer -= 1000;
      this.takeDamage(6, effects);
    }
  } else {
    this.burnTimer = 0;
  }

  // ← stunTimer 줄 삭제 (문법 오류)

  // 스킬
  for (const skill of this.skills) {
    skill.tryUse(now, this, allBalls, effects);
  }

  // 빙결 / 스턴
  if (this.frozen > 0 || this.stunned > 0) {
    this.vx = 0;
    this.vy = 0;
  }

  if (this.frozen === 0 && this.stunned === 0) {
    const curSpd    = Math.hypot(this.vx, this.vy);
    const targetSpd = this.slowed > 0 ? this.speed * 0.4 : this.speed;
    if (curSpd > 0.01) {
      this.vx = (this.vx / curSpd) * targetSpd;
      this.vy = (this.vy / curSpd) * targetSpd;
    } else if (!this.manualControl) {
      const a = Math.random() * Math.PI * 2;
      this.vx = Math.cos(a) * targetSpd;
      this.vy = Math.sin(a) * targetSpd;
    }
  }

  // 위치 업데이트
  this.x += this.vx;
  this.y += this.vy;

  this.wallBounce();
}


  wallBounce() {
  const { W, H } = getCanvasSize();  // ✅ 동적으로 가져오기
  
  if (this.x - this.radius < 0) {
    this.x  = this.radius;
    this.vx = Math.abs(this.vx);
  }
  if (this.x + this.radius > W) {
    this.x  = W - this.radius;
    this.vx = -Math.abs(this.vx);
  }
  if (this.y - this.radius < 0) {
    this.y  = this.radius;
    this.vy = Math.abs(this.vy);
  }
  if (this.y + this.radius > H) {
    this.y  = H - this.radius;
    this.vy = -Math.abs(this.vy);
  }
}

  draw(ctx, now) {
    if (this.dead) return;

    if (this.shield > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(135,206,235,${0.5 + 0.3 * Math.sin(now * 0.006)})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    if      (this.frozen  > 0) { ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 20; }
    else if (this.burning > 0) { ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 20; }
    else if (this.stunned > 0) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20; }

    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 1,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, this.lighten(this.color, 70));
    grad.addColorStop(1, this.color);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    if (this.frozen > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,191,255,0.3)';
      ctx.fill();
    }

  if (this.img && this.img.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.clip(); // 원 밖으로 안 나가게
    ctx.drawImage(
      this.img,
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
    ctx.restore();
  }
    this.drawHPBar(ctx);
    this.drawSkillIcons(ctx, now);

    ctx.fillStyle = '#000000';
    ctx.font      = 'bold 16px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y + this.radius + 22);

    
  }

  drawHPBar(ctx) {
    const bw    = this.radius * 2.6;
    const bh    = 6;
    const bx    = this.x - bw / 2;
    const by    = this.y - this.radius - 18;
    const ratio = this.hp / this.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();

    ctx.fillStyle = ratio > 0.6 ? '#2ECC71' : ratio > 0.3 ? '#F39C12' : '#E74C3C';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * ratio, bh, 3);
    ctx.fill();

    if (this.shield > 0) {
      ctx.fillStyle = 'rgba(135,206,235,0.75)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw * Math.min(1, this.shield / this.maxShield), bh, 3);
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.font      = '15px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.hp)}/${this.maxHp}`, this.x, by - 2);
  }

  drawSkillIcons(ctx, now) {
    const n = this.skills.length;
    this.skills.forEach((skill, i) => {
      const progress = skill.getProgress(now);
      const sx = this.x - (n - 1) * 11 + i * 22;
      const sy = this.y + this.radius + 6;

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = progress >= 1 ? '#FFD700' : '#555';
      ctx.lineWidth   = 2;
      ctx.stroke();

      ctx.font      = '9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillStyle = progress >= 1 ? '#fff' : '#555';
      ctx.fillText(skill.icon, sx, sy + 3);
    });
  }

  lighten(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16)         + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff)        + amt);
    return `rgb(${r},${g},${b})`;
  }

}
