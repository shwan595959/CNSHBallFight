import { Ball } from '../core/Ball.js';
import { FloatingText, shockwaveEffect } from '../core/Effects.js';
import { soundManager } from '../core/SoundManager.js';

export class KKyeongChanBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp:     420,      // ← 직접 설정
      speed:  2.2,      // ← 직접 설정
      radius: 47,       // ← 직접 설정
      mass:   5.0,      // ← 직접 설정
      color:  '#707070', // ← 직접 설정
      name:   '김경찬',
      id,
      image: './assets/image/김경찬이미지.jpg'
    });

    // 음파 설정
    this.sonicCooldown  = 5000;  // ← 직접 설정 (ms)
    this.sonicRange     = 200;   // ← 직접 설정 (px)
    this.sonicSlowTime  = 1500;  // ← 직접 설정 (ms)
    this.lastSonicTime  = 0;

    // 돌진 설정
    this.dashSpeed      = 12;    // ← 직접 설정
    this.dashDuration   = 400;   // ← 직접 설정 (ms)
    this.dashDamage     = 50;    // ← 직접 설정
    this.dashHitCooldown = 500;
    this.dashHitTimers = new Map();

    // 내부 상태
    this.phase          = 'idle'; // 'idle' | 'sonic' | 'wait' | 'dash'
    this.phaseTimer     = 0;
    this.dashTarget     = null;
    this.dashVx         = 0;
    this.dashVy         = 0;

    // 음파 시각 효과
    this.sonicWaves     = [];

    this._loadSounds();
  }

  update(dt, now, allBalls, effects) {
    if (this.dead) return;

    switch (this.phase) {

      // ── 대기 중: 쿨타임 지나면 음파 발동
      case 'idle': {
        this.phaseTimer += dt;
        if (this.phaseTimer >= this.sonicCooldown) {
          this.phaseTimer = 0;
          this._fireSonic(now, allBalls, effects);
          soundManager.play("김경찬_웃음")
          this.phase = 'wait';
        }
        break;
      }

      // ── 음파 후 2초 대기
      case 'wait': {
        this.phaseTimer += dt;
        if (this.phaseTimer >= 2000) {
          this.phaseTimer = 0;
          this._startDash(allBalls);
          this.phase = 'dash';
        }
        break;
      }

      // ── 돌진 중
      case 'dash': {
  this.phaseTimer += dt;

  for (const b of allBalls) {
    if (b === this || b.dead) continue;
    const d = Math.hypot(this.x - b.x, this.y - b.y);

    if (d < this.radius + b.radius) {
      const lastHit = this.dashHitTimers.get(b.id) ?? 0;
      const now2    = performance.now();

      // 쿨타임 지난 경우에만 데미지
      if (now2 - lastHit >= this.dashHitCooldown) {
        this.dashHitTimers.set(b.id, now2);
        b.takeDamage(this.dashDamage, effects);
        this._fireSonic(now, allBalls, effects)
        soundManager.play("김경찬_아니")
      }
    }
  }

  if (this.phaseTimer >= this.dashDuration) {
    this.phaseTimer = 0;
    this.dashHitTimers.clear(); // 돌진 끝나면 타이머 초기화
    this.speed = 3.0;
    this.phase = 'idle';
  }
  break;
      }}

    // 음파 시각 효과 업데이트
    this.sonicWaves = this.sonicWaves.filter(w => {
      w.r   += 3;
      w.alpha -= 0.02;
      return w.alpha > 0;
    });

    // 돌진 중이면 speed를 dashSpeed로 유지
    if (this.phase === 'dash') {
      this.speed = this.dashSpeed;
      this.vx    = this.dashVx;
      this.vy    = this.dashVy;
    }

    super.update(dt, now, allBalls, effects);
  }

  // 음파 발동
  _fireSonic(now, allBalls, effects) {
    soundManager.playSonic();
    // 범위 내 적 슬로우
    for (const b of allBalls) {
      if (b === this || b.dead) continue;
      const d = Math.hypot(this.x - b.x, this.y - b.y);
      if (d < this.sonicRange) {
        effects.push(new FloatingText(
          b.x, b.y - b.radius - 8,
          '슬로우', '#3f6464'
        ));
      }
    }

    // 음파 시각 효과 생성
    for (let i = 0; i < 3; i++) {
      this.sonicWaves.push({ r: this.radius, alpha: 0.6 + i * 0.1, delay: i * 5 });
    }
  }

  // 가장 가까운 적을 향해 돌진
  _startDash(allBalls) {
    let target = null;
    let minD   = Infinity;
    soundManager.playDash();

    for (const b of allBalls) {
      if (b === this || b.dead) continue;
      const d = Math.hypot(this.x - b.x, this.y - b.y);
      if (d < minD) { minD = d; target = b; }
    }

    if (!target) return;

    const angle  = Math.atan2(target.y - this.y, target.x - this.x);
    this.dashVx  = Math.cos(angle) * this.dashSpeed;
    this.dashVy  = Math.sin(angle) * this.dashSpeed;
    this.speed   = this.dashSpeed;
  }

  draw(ctx, now) {
    if (this.dead) return;

    // 음파 시각 효과
    for (const w of this.sonicWaves) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, w.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,255,255,${w.alpha})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      w.r += 1.5;
    }

    // wait 중 카운트다운 표시
    if (this.phase === 'wait') {
      const remain = ((2000 - this.phaseTimer) / 1000).toFixed(1);
      ctx.fillStyle  = '#000000';
      ctx.font       = 'bold 13px Segoe UI';
      ctx.textAlign  = 'center';
      ctx.fillText(`돌진 ${remain}s`, this.x, this.y-20 - this.radius - 14);
    }
    super.draw(ctx, now);
  }

  async _loadSounds() {
    await soundManager.load("김경찬_웃음", "./assets/sounds/김경찬_웃음.mp3")
    await soundManager.load("김경찬_아니", "./assets/sounds/김경찬_아니.mp3")
  }
}
