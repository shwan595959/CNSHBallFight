import { Ball } from '../core/Ball.js';
import { FloatingText } from '../core/Effects.js';
import { soundManager } from '../core/SoundManager.js';
import { FIELD_W, FIELD_H } from '../game.js';

class KissEffect {
  constructor(ox, oy, tx, ty) {
    this.ox = ox; this.oy = oy;
    this.tx = tx; this.ty = ty;

    this.x = ox;
    this.y = oy;

    this.phase = 'move';  // move → kiss → return
    this.timer = 0;
    this.dead  = false;

    this.moveDuration   = 400;
    this.kissDuration   = 500;
    this.returnDuration = 400;

    // 💋 마크
    this.kissMarkTimer    = 0;
    this.kissMarkDuration = 600;
    this.kissMarkActive   = false;

    this.onKiss = null;
  }

  update(dt) {
    if (this.dead) return;
    this.timer += dt;

    // 💋 마크 타이머
    if (this.kissMarkActive) {
      this.kissMarkTimer += dt;
      if (this.kissMarkTimer >= this.kissMarkDuration) {
        this.kissMarkActive = false;
      }
    }

    if (this.phase === 'move') {
      const t    = Math.min(1, this.timer / this.moveDuration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.x = this.ox + (this.tx - this.ox) * ease;
      this.y = this.oy + (this.ty - this.oy) * ease;

      if (this.timer >= this.moveDuration) {
        this.phase = 'kiss';
        this.timer = 0;

        // 💋 마크 딱 한 번 활성화
        this.kissMarkActive = true;
        this.kissMarkTimer  = 0;

        if (this.onKiss) {
          this.onKiss();
          this.onKiss = null;
        }
      }

    } else if (this.phase === 'kiss') {
      if (this.timer >= this.kissDuration) {
        this.phase = 'return';
        this.timer = 0;
      }

    } else if (this.phase === 'return') {
      const t    = Math.min(1, this.timer / this.returnDuration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.x = this.tx + (this.ox - this.tx) * ease;
      this.y = this.ty + (this.oy - this.ty) * ease;

      if (this.timer >= this.returnDuration) {
        this.dead = true;
      }
    }
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;

    // 이동 궤적
    if (this.phase === 'move' || this.phase === 'return') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ff69b4';
      ctx.lineWidth   = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.ox, this.oy);
      ctx.lineTo(this.tx, this.ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 💋 마크: 닿는 순간 크게 한 번만
    if (this.kissMarkActive) {
      const t       = this.kissMarkTimer / this.kissMarkDuration;
      // 처음엔 크게 팡! 터지고 서서히 사라짐
      const scale   = t < 0.2
        ? 1 + (t / 0.2) * 1.5        // 0 → 2.5배로 빠르게 커짐
        : 2.5 - ((t - 0.2) / 0.8) * 2.0; // 2.5 → 0.5배로 서서히 줄어듦
      const alpha   = t < 0.2 ? 1.0 : 1 - ((t - 0.2) / 0.8);
      const size    = Math.max(0, 60 * scale);

      ctx.save();
      ctx.globalAlpha  = Math.max(0, alpha);
      ctx.font         = `${size}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      // 살짝 그림자로 강조
      ctx.shadowColor  = '#ff1493';
      ctx.shadowBlur   = 20;
      ctx.fillText('💋', this.tx, this.ty - 20);
      ctx.restore();
    }
  }
}


// ── 경고 링 ──────────────────────────────────────────────
class WarningRing {
  constructor(x, y, range) {
    this.x     = x;
    this.y     = y;
    this.range = range;
    this.timer = 0;
    this.dead  = false;
    this.duration = 500;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) this.dead = true;
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;
    const t     = this.timer / this.duration;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha  = alpha * 0.7;
    ctx.strokeStyle  = '#ff69b4';
    ctx.lineWidth    = 3;
    ctx.shadowColor  = '#ff1493';
    ctx.shadowBlur   = 15;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range * (0.8 + t * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ── 메인 공: 키스마녀 ────────────────────────────────────
export class OsuenghunBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 310,
      speed : 2.5,
      radius: 43,
      mass  : 4.0,
      color : '#ff69b4',
      name  : '오승훈',
      id,
      image: "./assets/image/오승훈이미지.jpg"
    });

    this.skillCooldown = 6000;
    this.lastSkillTime = -Infinity;

    // FSM: idle → warning → kiss → cooldown
    this.state      = 'idle';
    this.stateTimer = 0;

    this.warningDuration = 500;
    this.kissDuration    = 1300; // move + kiss + return

    this.kissRange   = 200;
    this.kissTargets = [];  // 정지된 대상들
    this.kissEffects = [];  // KissEffect 목록
    this.warnings    = [];  // WarningRing 목록


    this._loadSounds();
  }

  update(dt, now, allBalls, effects) {
  if (this.dead) return;

  // 하트 파티클
 


  for (const w of this.warnings) w.update(dt);
  this.warnings = this.warnings.filter(w => !w.isDead());

  for (const k of this.kissEffects) k.update(dt);
  this.kissEffects = this.kissEffects.filter(k => !k.isDead());

  this.stateTimer += dt;

  switch (this.state) {

    case 'idle':
      super.update(dt, now, allBalls, effects);
      if (now - this.lastSkillTime >= this.skillCooldown) {
        // ✅ 쿨타임 끝나면 바로 waiting으로
        this.state      = 'waiting';
        this.stateTimer = 0;
      }
      break;

    // ✅ 쿨타임 끝난 후 대상 기다리는 상태
    case 'waiting':
      super.update(dt, now, allBalls, effects);

      const targets = allBalls.filter(b =>
        b !== this && !b.dead &&
        Math.hypot(b.x - this.x, b.y - this.y) <= this.kissRange
      );

      // 대상 생기면 그때 warning 시작
      if (targets.length > 0) {
        this._startWarning(allBalls, effects, now);
      }
      break;

    case 'warning':
      if (this.stateTimer >= this.warningDuration) {
        this._startKiss(allBalls, effects);
      }
      break;

    case 'kiss':
      if (this.kissEffects.length === 0) {
        this._endSkill(now);
      }
      break;

    case 'cooldown':
      super.update(dt, now, allBalls, effects);
      if (this.stateTimer >= 500) {
        this.state      = 'idle';
        this.stateTimer = 0;
      }
      break;
  }
}

// ✅ _startWarning에서 lastSkillTime 리셋 제거
_startWarning(allBalls, effects, now) {
  this.state      = 'warning';
  this.stateTimer = 0;

  this.kissTargets = allBalls.filter(b =>
    b !== this && !b.dead &&
    Math.hypot(b.x - this.x, b.y - this.y) <= this.kissRange
  );

  this.warnings.push(new WarningRing(this.x, this.y, this.kissRange));

  for (const b of this.kissTargets) {
    b.frozen = true;
  }

}


  _startWarning(allBalls, effects, now) {
    this.state      = 'warning';
    this.stateTimer = 0;

    // 범위 내 대상 탐색
    this.kissTargets = allBalls.filter(b =>
      b !== this && !b.dead &&
      Math.hypot(b.x - this.x, b.y - this.y) <= this.kissRange
    );

    if (this.kissTargets.length === 0) {
      // 대상 없으면 스킬 스킵
      this.lastSkillTime = now;
      this.state         = 'idle';
      return;
    }

    // 경고 링
    this.warnings.push(new WarningRing(this.x, this.y, this.kissRange));

    // 대상 정지
    for (const b of this.kissTargets) {
      b.frozen = true;
    }

  }

  _startKiss(allBalls, effects) {
    this.state      = 'kiss';
    this.stateTimer = 0;

    for (const target of this.kissTargets) {
      if (target.dead) continue;

      const ke = new KissEffect(this.x, this.y, target.x, target.y);

      // 키스 닿는 순간 데미지
      ke.onKiss = () => {
        if (!target.dead) {
          const dmg = 80
          target.takeDamage(dmg, effects);
          effects.push(new FloatingText(
            target.x, target.y - target.radius - 10,
            `💋 -${dmg}`, '#ff1493', 22, 2.5
          ));
          soundManager.play('Kiss'); // 사운드 있으면
        }
      };

      this.kissEffects.push(ke);
    }
  }

  _endSkill(now) {
    // 정지 해제
    for (const b of this.kissTargets) {
      b.frozen = false;
    }
    this.kissTargets  = [];
    this.lastSkillTime = now;
    this.state         = 'cooldown';
    this.stateTimer    = 0;
  }

  draw(ctx, now) {
    if (this.dead) return;

    // 범위 표시 (idle 중 은은하게)
    if (this.state === 'idle' || this.state === 'warning') {
      ctx.save();
      ctx.globalAlpha = 0.08 + Math.sin(Date.now() / 400) * 0.04;
      ctx.fillStyle   = '#ff69b4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.kissRange, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha  = 0.25;
      ctx.strokeStyle  = '#ff69b4';
      ctx.lineWidth    = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.kissRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 경고 링
    for (const w of this.warnings) w.draw(ctx);

    // 키스 이펙트
    for (const k of this.kissEffects) k.draw(ctx);

    // 공 본체
    super.draw(ctx, now);

    // 쿨타임 게이지
    const elapsed = now - this.lastSkillTime;
    const prog    = Math.min(1, elapsed / this.skillCooldown);

    if (prog < 1 && this.state === 'idle') {
      ctx.save();
      ctx.strokeStyle = `hsl(${prog * 60 + 300}, 100%, 60%)`;
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(
        this.x, this.y, this.radius + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * prog
      );
      ctx.stroke();
      ctx.restore();
    }
  }
  async _loadSounds() {
    await soundManager.load("Kiss", "./assets/sounds/Kiss.mp3");
  }
}
