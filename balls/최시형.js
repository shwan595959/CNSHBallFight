import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';

// =====================
// ShockwaveEffect
// =====================
class ShockwaveEffect {
  constructor(x, y) {
    this.x         = x;
    this.y         = y;
    this.timer     = 0;
    this.duration  = 0.3;
    this.maxRadius = 30;
  }
  update() { this.timer += 1 / 60; }
  isDead() { return this.timer >= this.duration; }
  draw(ctx) {
    const t = Math.min(this.timer / this.duration, 1);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.maxRadius * t + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// =====================
// ExplosionEffect
// =====================
class ExplosionEffect {
  constructor(x, y, maxRadius) {
    this.x         = x;
    this.y         = y;
    this.timer     = 0;
    this.duration  = 0.3;
    this.maxRadius = maxRadius;
  }
  update() { this.timer += 1 / 60; }
  isDead() { return this.timer >= this.duration; }
  draw(ctx) {
    const t = Math.min(this.timer / this.duration, 1);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle   = 'rgb(46, 44, 42)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.maxRadius * t + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// =====================
// MiniMine
// =====================
class MiniMine {
  constructor(targetX, targetY, team, owner) {
    // 실제 위치 (충돌 판정용)
    this.x = targetX;
    this.y = targetY;

    // 낙하 시작 위치 (화면 위)
    this.drawX = targetX;
    this.drawY = targetY - 400 - Math.random() * 200;

    this.dropStartY  = this.drawY;
    this.dropTargetX = targetX;
    this.dropTargetY = targetY;

    this.radius        = 10;
    this.team          = team;
    this.owner         = owner;
    this.dead          = false;

    this.phase        = 'dropping';
    this.dropTimer    = 0;
    this.dropDuration = 0.6 + Math.random() * 0.3;

    this.speed         = 200;
    this.explodeRadius = 60;
    this.damage        = 18;

    this.explodeTimer    = 0;
    this.explodeDuration = 0.3;
  }

  getNearestTarget(allBalls) {
  let nearest = null;
  let minDist = Infinity;
  for (const b of allBalls) {
    if (b === this.owner || b.dead) continue; // 팀 체크 제거
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (d < minDist) {
      minDist = d;
      nearest = b;
    }
  }
  return nearest;
}

  update(dt, now, allBalls, effects) {
    if (this.dead) return;

    switch (this.phase) {

      case 'dropping': {
        this.dropTimer += dt / 1000;
        const t    = Math.min(this.dropTimer / this.dropDuration, 1);
        const ease = t * t;

        // drawX/Y만 움직임 (실제 x,y는 착지 후 확정)
        this.drawX = this.dropTargetX;
        this.drawY = this.dropStartY + (this.dropTargetY - this.dropStartY) * ease;

        if (t >= 1) {
          this.x     = this.dropTargetX;
          this.y     = this.dropTargetY;
          this.drawX = this.dropTargetX;
          this.drawY = this.dropTargetY;
          this.phase = 'tracking';
          effects.push(new ShockwaveEffect(this.x, this.y));
          
        }
        break;
      }

      case 'tracking': {
  const target = this.getNearestTarget(allBalls);
  if (target) {
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.radius + target.radius) {
      this.phase        = 'exploding';
      this.explodeTimer = 0;
      this._doExplode(allBalls, effects);
    } else {
      const dtSec = dt / 1000; // ✅ ms → 초 변환
      this.x += (dx / dist) * this.speed * dtSec;
      this.y += (dy / dist) * this.speed * dtSec;
      this.drawX = this.x;
      this.drawY = this.y;
    }
  }
  break;
}

      case 'exploding': {
        this.explodeTimer += dt/1000;
        if (this.explodeTimer >= this.explodeDuration) {
          this.dead = true;
        }
        break;
      }
    }
  }

  _doExplode(allBalls, effects) {
  for (const b of allBalls) {
    if (b === this.owner || b.dead) continue; // 팀 체크 제거
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (d < this.explodeRadius + b.radius) {
      b.takeDamage(this.damage, effects);
      soundManager.playHit();
    }
  }
  effects.push(new ExplosionEffect(this.x, this.y, this.explodeRadius));
}

  draw(ctx) {
    if (this.dead) return;
    if (!isFinite(this.drawX) || !isFinite(this.drawY)) return;

    // 낙하 중 그림자 (착지 위치에 표시)
    if (this.phase === 'dropping') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle   = '#000';
      ctx.beginPath();
      ctx.ellipse(
        this.dropTargetX, this.dropTargetY,
        this.radius * 1.2, this.radius * 0.4,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    // 폭발 중엔 본체 숨김 (ExplosionEffect가 그림)
    if (this.phase === 'exploding') return;

    // 본체
    ctx.save();
    ctx.fillStyle = '#464646';
    ctx.beginPath();
    ctx.arc(this.drawX, this.drawY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // 추격 중 눈
    if (this.phase === 'tracking') {
  // 왼쪽 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(this.drawX - 4, this.drawY - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(this.drawX - 4, this.drawY - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  // 오른쪽 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(this.drawX + 4, this.drawY - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(this.drawX + 4, this.drawY - 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

    ctx.restore();
  }
}

// =====================
// MineLayerBall (메인 공)
// =====================
export class ChoisihyeongBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 225,
      speed : 3,
      radius: 35,
      mass  : 1.5,
      color : '#8e44ad',
      name  : '최시형',
      id,
      image: './assets/image/최시형이미지.png'
    });

    this.skillCooldown = 10000;
    this.lastSkillTime = 0;
    this.mines         = [];

    this._loadSounds();
  }

  update(dt, now, allBalls, effects) {
    super.update(dt, now, allBalls, effects);

    // 미니 공 업데이트
    this.mines = this.mines.filter(m => !m.dead);
    for (const m of this.mines) {
      m.update(dt, now, allBalls, effects);
    }

    // 쿨타임 체크
    if (now - this.lastSkillTime >= this.skillCooldown) {
      this.lastSkillTime = now;
      this._spawnMines();
      soundManager.play("WarpOut")
    }
  }

  _spawnMines() {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const dist  = 60 + Math.random() * 100;
      const tx    = this.x + Math.cos(angle) * dist;
      const ty    = this.y + Math.sin(angle) * dist;

      this.mines.push(new MiniMine(tx, ty, this.team, this));
    }
  }

  draw(ctx, now) {  // ✅ now 파라미터 추가
  for (const m of this.mines) {
    m.draw(ctx);
  }

  super.draw(ctx);

  const elapsed = now - this.lastSkillTime;  // ✅ 같은 단위
  const t = Math.min(elapsed / this.skillCooldown, 1);

  ctx.save();
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(
    this.x, this.y,
    this.radius + 6,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * t
  );
  ctx.stroke();
  ctx.restore();
}

async _loadSounds() {
    await soundManager.load("WarpOut", "./assets/sounds/WarpOut.ogg")
  }

}
