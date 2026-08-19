import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';

export class HwangAInBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp:     180,
      speed:  3.5,
      radius: 30,
      mass:   1,
      color:  '#e07040',
      name:   '황아인',
      id,
      image: './assets/image/황아인이미지.jpg'
    });

    this.cooldown     = 2000;
    this.maxCharge    = 9000;
    this.maxDamage    = 130;
    this.kickDuration = 500;
    this.kickRange    = 110;

    this.phase           = 'cooldown';
    this.cooldownTimer   = 0;
    this.chargeTimer     = 0;
    this.kickTimer       = 0;
    this.hitTargets      = new Set();
    this.kickTargetAngle = 0;

    this.legImg     = new Image();
    this.legImg.src = './assets/image/황아인다리.png';

    this._loadSounds();
  }

  // ─────────────────────────────────────
  // 데미지 (게이지 비례)
  // ─────────────────────────────────────
  getDamage() {
    return (this.chargeTimer / this.maxCharge) * this.maxDamage;
  }

  // ─────────────────────────────────────
  // 발 끝 위치
  // 타겟 방향 기준으로 수직 아래 → 수직 위 스윙
  // ─────────────────────────────────────
  getFootPos() {
  if (this.phase !== 'kicking') return null;

  const r = this.radius;
  const t = Math.min(this.kickTimer / this.kickDuration, 1);

  // 초반에 빠르게, 후반에 천천히 (ease-out)
  const eased    = 1 - Math.pow(1 - t, 3);
  const legAngle = this.kickTargetAngle + Math.PI * (1 - eased);
  const legLen   = r * 1.8;

  return {
    x: this.x + Math.cos(legAngle) * (r + legLen),
    y: this.y + Math.sin(legAngle) * (r + legLen),
  };
}

// 이미지 영역과 공의 충돌 판정
_isHitByLeg(b) {
  if (this.phase !== 'kicking') return false;

  const foot = this.getFootPos();
  if (!foot) return false;

  const dx    = foot.x - this.x;
  const dy    = foot.y - this.y;
  const angle = Math.atan2(dy, dx) + Math.PI / 2;

  const legW = this.radius * 4;
  const legH = legW * (1536 / 1024);

  // 공 중심을 기준으로 로컬 좌표 변환
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  const bx = b.x - this.x;  // 공 중심 기준
  const by = b.y - this.y;

  const localX = cos * bx - sin * by;
  const localY = sin * bx + cos * by;

  // drawImage(img, -legW/2, 0, legW, legH) 기준
  const inX = localX >= -legW / 2 - b.radius && localX <= legW / 2 + b.radius;
  const inY = localY >= -b.radius            && localY <= legH + b.radius;

  return inX && inY;
}


  // ─────────────────────────────────────
  // 업데이트
  // ─────────────────────────────────────
  update(dt, now, allBalls, effects) {
    super.update(dt, now, allBalls, effects);

    switch (this.phase) {

      case 'cooldown':
        this.cooldownTimer += dt;
        if (this.cooldownTimer >= this.cooldown) {
          this.cooldownTimer = 0;
          this.chargeTimer   = 0;
          this.phase         = 'charging';
        }
        break;

      case 'charging': {
        this.chargeTimer = Math.min(this.chargeTimer + dt, this.maxCharge);

        const nearby = allBalls.find(b =>
          b !== this &&
          !b.dead &&
          Math.hypot(this.x - b.x, this.y - b.y) < this.kickRange
        );

        if (nearby) {
          this.kickTargetAngle = Math.atan2(nearby.y - this.y, nearby.x - this.x);
          this.hitTargets      = new Set();
          this.kickTimer       = 0;
          this.phase           = 'kicking';
        }
        break;
      }

      case 'kicking': {
  this.kickTimer += dt;

  for (const b of allBalls) {
    if (b === this || b.dead || this.hitTargets.has(b)) continue;
    if (this._isHitByLeg(b)) {
      soundManager.play("황아인_웃음")
      b.takeDamage(this.getDamage(), effects);
      soundManager.playHit();
      this.hitTargets.add(b);
    }
  }

  if (this.kickTimer >= this.kickDuration) {
    this.chargeTimer   = 0;
    this.phase         = 'cooldown';
    this.cooldownTimer = 0;
  }
  break;
}

    }
  }

  // ─────────────────────────────────────
  // 그리기
  // ─────────────────────────────────────
  draw(ctx) {
    this._drawGauge(ctx);
    this._drawLeg(ctx);
    super.draw(ctx);
  }

  _drawGauge(ctx) {
    if (this.phase === 'cooldown') return;

    const r      = this.radius;
    const ratio  = this.chargeTimer / this.maxCharge;
    const startA = -Math.PI / 2;
    const endA   = startA + Math.PI * 2 * ratio;

    ctx.save();

    // 배경
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 10, 0, Math.PI * 2);
    ctx.stroke();

    // 게이지 (초록 → 빨강)
    ctx.strokeStyle = `hsl(${120 - ratio * 120}, 100%, 50%)`;
    ctx.lineWidth   = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 10, startA, endA);
    ctx.stroke();

    ctx.restore();
  }

  _drawLeg(ctx) {
  if (this.phase !== 'kicking') return;
  if (!this.legImg.complete || this.legImg.naturalWidth === 0) return;

  const foot = this.getFootPos();
  if (!foot) return;

  // 공 중심 → 발 끝 방향 각도
  const dx    = foot.x - this.x;
  const dy    = foot.y - this.y;
  const angle = Math.atan2(dy, dx);

  const legW = this.radius * 8;
  const legH = legW * (1536 / 1024);

  const t = Math.min(this.kickTimer / this.kickDuration, 1);

  ctx.save();
  ctx.globalAlpha = 1 - t;

  // 회전축: 공 중심
  ctx.translate(this.x, this.y);       // 공 중심이 회전축
ctx.rotate(angle + Math.PI / 2);
ctx.drawImage(this.legImg, -legW / 2, -legH, legW, legH);


  ctx.restore();
}

async _loadSounds() {
    await soundManager.load("황아인_웃음", "./assets/sounds/황아인_웃음.mp3")
  }

}
