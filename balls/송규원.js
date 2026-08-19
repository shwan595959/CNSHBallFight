import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText, shockwaveEffect, Particle } from '../core/Effects.js';
import { FIELD_W, FIELD_H } from '../game.js';


// ────────────────────────────────────────
// 분열 투사체 (착지 후 8방향으로 날아감)
// ────────────────────────────────────────

class RamenProjectile {
  constructor(x, y, vx, vy, ownerId) { // ✅ ownerId 추가
    this.x    = x;
    this.y    = y;
    this.vx   = vx;
    this.vy   = vy;
    this.ownerId = ownerId; // ✅ 저장
    this.radius       = 14;
    this.dead         = false;
    this.distTraveled = 0;
    this.maxDist      = 250;

    this.img = new Image();
    this.img.src = './assets/image/라면.png';
  }

  update(dt, allBalls, effects) {
    if (this.dead) return;

    this.distTraveled += Math.hypot(this.vx, this.vy);
    this.x += this.vx;
    this.y += this.vy;

    if (
  this.distTraveled >= this.maxDist ||
  this.x < 0 || this.x > FIELD_W ||
  this.y < 0 || this.y > FIELD_H
) {
  this._explode(allBalls, effects);
  this.dead = true;
  return;
}

    for (const b of allBalls) {
      if (b.dead) continue;
      if (b.id === this.ownerId) continue; // ✅ 자기 자신 제외
      if (Math.hypot(b.x - this.x, b.y - this.y) < b.radius + this.radius) {
        this._explode(allBalls, effects);
        this.dead = true;
        return;
      }
    }
  }

  _explode(allBalls, effects) {
    const explosionRadius = 135;

    effects.push(new shockwaveEffect(this.x, this.y));

    for (let i = 0; i < 12; i++) {
      effects.push(new Particle(
        this.x, this.y, '#e67e22',
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 2,
        1.0
      ));
    }

    for (const b of allBalls) {
      if (b.dead) continue;
      if (b.id === this.ownerId) continue; // ✅ 폭발 범위 데미지도 자기 제외
      if (Math.hypot(b.x - this.x, b.y - this.y) < explosionRadius + b.radius) {
        b.takeDamage(45, effects);
        soundManager.play("RamenEx")
      }
    }
  }



  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));

    if (this.img.complete) {
      ctx.drawImage(this.img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#e67e22';
      ctx.fill();
    }

    ctx.restore();
  }
}

// ────────────────────────────────────────
// 공중 라면 (포물선 → 착지 → 8분열)
// ────────────────────────────────────────
class AirRamen {
  constructor(x, y, ownerId) {
    this.x    = x;
    this.y    = y;
    this.dead = false;

    // z축 (높이 시뮬레이션)
    this.z        = 0;
    this.vz       = 8;    // 초기 상승 속도
    this.gravity  = 0.1;  // 중력 (낮을수록 느리게 떨어짐)

    this.landed      = false;
    this.projectiles = [];

    this.ownerId = ownerId;

    this.img = new Image();
    this.img.src = './assets/image/라면.png';
  }

  update(dt, allBalls, effects) {
    if (this.dead) return;

    if (!this.landed) {
      // 포물선 이동
      this.vz -= this.gravity;
      this.z  += this.vz;

      // 착지
      if (this.z <= 0) {
        this.z      = 0;
        this.landed = true;

        // 착지 충격파
        effects.push(new shockwaveEffect(this.x, this.y));
        effects.push(new FloatingText(this.x, this.y - 50, '🍜 착지!', '#e67e22', 22));
        soundManager.play('RamenLand');

        // 파티클
        for (let i = 0; i < 16; i++) {
          effects.push(new Particle(
            this.x, this.y, '#e67e22',
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            Math.random() * 6 + 3,
            1.0
          ));
        }

        // 8방향 분열
        const speed = 6;
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i;
          this.projectiles.push(new RamenProjectile(
            this.x, this.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            this.ownerId
          ));
        }
      }

    } else {
      // 투사체 업데이트
      this.projectiles.forEach(p => p.update(dt, allBalls, effects));
      this.projectiles = this.projectiles.filter(p => !p.dead);

      // 투사체 전부 소멸 → 자신도 소멸
      if (this.projectiles.length === 0) this.dead = true;
    }
  }

  draw(ctx) {
    if (this.dead) return;

    if (!this.landed) {
      const drawY = this.y - this.z;
      const scale = 1 + this.z / 80;
      const drawR = 22 * scale;

      // 그림자 (z 높을수록 작아짐)
      const shadowScale = Math.max(0.2, 1 - this.z / 180);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 22 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();
      ctx.restore();

      // 라면 이미지
      ctx.save();
      ctx.translate(this.x, drawY);
      if (this.img.complete) {
        ctx.drawImage(this.img, -drawR, -drawR, drawR * 2, drawR * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, drawR, 0, Math.PI * 2);
        ctx.fillStyle = '#e67e22';
        ctx.fill();
      }
      ctx.restore();

    } else {
      // 착지 후 투사체 그리기
      for (const p of this.projectiles) p.draw(ctx);
    }
  }
}

// ────────────────────────────────────────
// 라면볼
// ────────────────────────────────────────
export class RamenBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 275,
      speed : 2.4,
      radius: 38,
      mass  : 2.0,
      color : '#e67e22',
      name  : '송규원',
      id,
      image : "./assets/image/송규원이미지.jpg"
    });

    this.shootCooldown  = 5000; // 5초마다 발사
    this.lastShootTime  = 0;
    this.airRamens      = [];

    this.isCharging     = false;
    this.chargeStart    = 0;
    this.chargeDuration = 1000; // 발사 1초 전 예고

    this._loadSounds();
  }

  _shoot(now, effects) {
    this.airRamens.push(new AirRamen(this.x, this.y, this.id));
    effects.push(new FloatingText(
      this.x, this.y - this.radius - 30,
      '🍜 라면 발사!', '#e67e22', 22, 5
    ));
    soundManager.play('RamenShoot');
    this.lastShootTime = now;
    this.isCharging    = false;
  }

  update(dt, now, allBalls, effects) {
    // 공중 라면 업데이트
    this.airRamens.forEach(r => r.update(dt, allBalls, effects));
    this.airRamens = this.airRamens.filter(r => !r.dead);

    const elapsed = now - this.lastShootTime;

    // 발사 1초 전 차징 시작
    if (!this.isCharging && elapsed >= this.shootCooldown - this.chargeDuration) {
      this.isCharging  = true;
      this.chargeStart = now;
    }

    // 발사
    if (elapsed >= this.shootCooldown) {
      this._shoot(now, effects);
    }

    super.update(dt, now, allBalls, effects);
  }

  draw(ctx, now) {
    if (this.dead) return;

    // 공중 라면 그리기
    for (const r of this.airRamens) r.draw(ctx);

    // 차징 예고 원
    if (this.isCharging) {
      const progress = (now - this.chargeStart) / this.chargeDuration;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10 + progress * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230, 126, 34, ${0.3 + progress * 0.7})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 쿨타임 게이지
    const cooldownProgress = Math.min(1, (now - this.lastShootTime) / this.shootCooldown);
    if (cooldownProgress < 1) {
      ctx.save();
      ctx.strokeStyle = `hsl(${cooldownProgress * 30}, 100%, 50%)`;
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(
        this.x, this.y,
        this.radius + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * cooldownProgress
      );
      ctx.stroke();
      ctx.restore();
    }

    super.draw(ctx, now);
  }

  async _loadSounds() {
    await soundManager.load('RamenShoot', './assets/sounds/SurgeReady.ogg');
    await soundManager.load('RamenLand',  './assets/sounds/Ex1.ogg');
    await soundManager.load('RamenEx',  './assets/sounds/결정타1.mp3');
  }
}
