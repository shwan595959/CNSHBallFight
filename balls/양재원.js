import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText } from '../core/Effects.js';
import { FIELD_H, FIELD_W } from '../game.js';

// =====================
// SoccerBall (발사되는 축구공 투사체)
// =====================


class SpotlightEffect {
  constructor(targetBall, canvasW, canvasH) {
    this.target = targetBall;
    this.W      = canvasW  ?? FIELD_W;
    this.H      = canvasH  ?? FIELD_H;
    this.dead   = false;

    // 전체 알파 (암흑 배경용)
    this.bgAlpha     = 0;
    this.bgAlphaGoal = 0;

    // 플래시 (발사 순간 번쩍)
    this.flashAlpha  = 0;

    // 깜빡임
    this.blinkTimer  = 0;
    this.isBlinking  = false;

    // 페이즈: 'fadein' | 'sweep' | 'blink' | 'flash' | 'fadeout' | 'dead'
    this.phase       = 'fadein';
    this.phaseTimer  = 0;

    // ── 스포트라이트 2개 ──
    // 각 조명은 캔버스 모서리 근처 고정 위치에서 빔을 쏨
    // aimAngle: 현재 빔이 향하는 각도 (조명 기준)
    // goalAngle: 목표 각도 (공을 향하는 각도)
    this.lights = [
      {
        // 왼쪽 위 조명
        sx: 80, sy: 60,
        aimAngle : Math.PI * 0.8,   // 처음엔 엉뚱한 곳
        goalAngle: 0,                // 나중에 계산
        beamColor: '#fffde0',
        lampColor: '#ffee88',
      },
      {
        // 오른쪽 위 조명
        sx: this.W - 80, sy: 60,
        aimAngle : Math.PI * 0.2,
        goalAngle: 0,
        beamColor: '#e0f0ff',
        lampColor: '#88ccff',
      },
    ];

    this._calcGoalAngles();
  }

  // 공을 향하는 목표 각도 계산
  _calcGoalAngles() {
    for (const l of this.lights) {
      l.goalAngle = Math.atan2(
        this.target.y - l.sy,
        this.target.x - l.sx
      );
    }
  }

  // 각도 차이를 -π ~ π 로 정규화
  _angleDiff(from, to) {
    let d = to - from;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // ── 외부 제어 ──
  startFlash() {
    this.phase      = 'flash';
    this.phaseTimer = 0;
    this.flashAlpha = 1.0;
  }

  update(dt) {
    this.phaseTimer += dt;
    this._calcGoalAngles(); // 공이 움직이면 목표 갱신

    // ── 페이즈별 처리 ──
    if (this.phase === 'fadein') {
      // 암흑 배경 서서히 등장 (0.8초)
      this.bgAlpha = Math.min(0.88, this.phaseTimer / 800);
      if (this.phaseTimer >= 800) {
        this.phase      = 'sweep';
        this.phaseTimer = 0;
      }
    }

    else if (this.phase === 'sweep') {
      // 조명이 공 쪽으로 서서히 회전 (1.5초)
      const progress = Math.min(1, this.phaseTimer / 1500);
      // easeInOut
      const ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      for (const l of this.lights) {
        const diff = this._angleDiff(l.aimAngle, l.goalAngle);
        l.aimAngle = l.goalAngle - diff * (1 - ease);
      }

      if (this.phaseTimer >= 1500) {
        this.phase      = 'blink';
        this.phaseTimer = 0;
        this.isBlinking = true;
      }
    }

   else if (this.phase === 'blink') {
  this.blinkTimer += dt;

  // ✅ 이렇게 수정 - 홀수 구간이면 안보이게
  this.isBlinking = Math.floor(this.blinkTimer / 25) % 2 === 1;

  for (const l of this.lights) {
    l.aimAngle = l.goalAngle;
  }

  if (this.phaseTimer >= 1000) {
    this.phase      = 'flash';
    this.phaseTimer = 0;
    this.flashAlpha = 1.0;
    this.isBlinking = false;
  }
}

    else if (this.phase === 'flash') {
      // 번쩍 후 페이드아웃
      this.flashAlpha = Math.max(0, 1 - this.phaseTimer / 300);
      this.bgAlpha    = Math.max(0, 0.88 - this.phaseTimer / 300);

      if (this.phaseTimer >= 400) {
        this.phase      = 'fadeout';
        this.phaseTimer = 0;
      }
    }

    else if (this.phase === 'fadeout') {
      this.bgAlpha    = 0;
      this.flashAlpha = 0;
      this.dead       = true;
    }
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;

    const W = this.W;
    const H = this.H;

    ctx.save();

    // ── 1. 암흑 배경 ──
    if (this.bgAlpha > 0) {
      ctx.globalAlpha = this.bgAlpha;
      ctx.fillStyle   = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // ── 2. 스포트라이트 빔 ──
    const blinkVisible = !this.isBlinking;

if (blinkVisible) {
  for (const l of this.lights) {
    this._drawBeam(ctx, l);
  }
}

    // ── 3. 번쩍 ──
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.flashAlpha * 0.9;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawBeam(ctx, l) {
    const tx = this.target.x;
    const ty = this.target.y;

    // 빔 끝점 (조명 방향으로 멀리)
    const beamLen = Math.hypot(this.W, this.H);
    const ex = l.sx + Math.cos(l.aimAngle) * beamLen;
    const ey = l.sy + Math.sin(l.aimAngle) * beamLen;

    // 빔 너비
    const beamHalfW = 35;
    const perpX = Math.cos(l.aimAngle + Math.PI / 2);
    const perpY = Math.sin(l.aimAngle + Math.PI / 2);

    // 빔 그라디언트 (조명 → 끝)
    const grad = ctx.createLinearGradient(l.sx, l.sy, ex, ey);
    grad.addColorStop(0,   `rgba(255,255,220, 0.55)`);
    grad.addColorStop(0.4, `rgba(255,255,200, 0.18)`);
    grad.addColorStop(1,   `rgba(255,255,180, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 빔 삼각형
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(l.sx, l.sy);
    ctx.lineTo(ex + perpX * beamHalfW, ey + perpY * beamHalfW);
    ctx.lineTo(ex - perpX * beamHalfW, ey - perpY * beamHalfW);
    ctx.closePath();
    ctx.fill();

    // 빔 중심선 (더 밝게)
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = l.beamColor;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(l.sx, l.sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // 조명 기구 (램프)
    ctx.globalAlpha = 1;
    const lampGrad = ctx.createRadialGradient(l.sx, l.sy, 0, l.sx, l.sy, 28);
    lampGrad.addColorStop(0,   l.lampColor);
    lampGrad.addColorStop(0.5, `rgba(255,255,200,0.4)`);
    lampGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = lampGrad;
    ctx.beginPath();
    ctx.arc(l.sx, l.sy, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 공에 맞춰졌을 때 공 주변 후광
    const aimedX = l.sx + Math.cos(l.aimAngle) * Math.hypot(tx - l.sx, ty - l.sy);
    const aimedY = l.sy + Math.sin(l.aimAngle) * Math.hypot(tx - l.sx, ty - l.sy);
    const distToTarget = Math.hypot(aimedX - tx, aimedY - ty);

    if (distToTarget < 40) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, this.target.radius * 3.5);
      halo.addColorStop(0,   `rgba(255,255,200, 0.5)`);
      halo.addColorStop(0.5, `rgba(255,255,150, 0.2)`);
      halo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(tx, ty, this.target.radius * 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

class SoccerProjectile {
  constructor(x, y, tx, ty) {
    this.x = x;
    this.y = y;
    const dist = Math.hypot(tx - x, ty - y);
    const speed = 25;
    this.vx = ((tx - x) / dist) * speed;
    this.vy = ((ty - y) / dist) * speed;
    this.radius = 28;
    this.damage = 155;
    this.dead = false;
    this.hit  = false;

    this.rotation = 0;

    this.img = new Image();
    this.img.src = './assets/image/축구공.png';

    // 잔상
    this.trail = [];
  }

  update(allBalls, effects) {
    if (this.dead) return;

    // 잔상 저장
    this.trail.push({ x: this.x, y: this.y, alpha: 0.4 });
    if (this.trail.length > 10) this.trail.shift();
    this.trail.forEach(t => t.alpha -= 0.03);

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += 0.2;

    // 충돌 감지
    for (const b of allBalls) {
      if (b.dead) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d < this.radius + b.radius) {
        b.takeDamage(this.damage, effects);
        effects.push(new FloatingText(
          b.x, b.y - b.radius - 10,
          `⚽ ${this.damage}`, '#ffffff', 18, 4.0
        ));
        this.dead = true;
        this.hit  = true;
        break;
      }
    }

    // 화면 밖 제거
    if (this.x < 0 || this.x > FIELD_W || this.y < 0 || this.y > FIELD_H) {
      this.dead = true;
    }
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;

    // 잔상
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(255, 72, 0)';
      ctx.fill();
      ctx.restore();
    }

    // 축구공
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    if (this.img.complete) {
      ctx.drawImage(this.img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// =====================
// DarkOverlay (암흑 오버레이)
// =====================
class DarkOverlay {
  constructor(targetBall) {
    this.alpha      = 0;
    this.target     = 0;
    this.speed      = 0.04;
    this.dead       = false;
    this.targetBall = targetBall; // ✅ 스포트라이트 대상 공
    this.spotRadius = 0;          // 스포트라이트 반지름 (서서히 커짐)
    this.spotTarget = 0;
  }

  fadeIn(spotRadius) {
    this.target     = 0.92;
    this.spotTarget = spotRadius ?? 120; // 기본 120px
  }

  fadeOut() {
    this.target     = 0;
    this.spotTarget = 0;
  }

  update() {
    // 알파 보간
    if (this.alpha < this.target) {
      this.alpha = Math.min(this.target, this.alpha + this.speed);
    } else if (this.alpha > this.target) {
      this.alpha = Math.max(this.target, this.alpha - this.speed);
      if (this.alpha <= 0) this.dead = true;
    }

    // 스포트라이트 반지름 보간
    if (this.spotRadius < this.spotTarget) {
      this.spotRadius = Math.min(this.spotTarget, this.spotRadius + 8);
    } else if (this.spotRadius > this.spotTarget) {
      this.spotRadius = Math.max(this.spotTarget, this.spotRadius - 8);
    }
  }

  isDead() { return this.dead; }

  draw(ctx, W, H) {
    if (this.alpha <= 0) return;

    const cx = this.targetBall?.x ?? W / 2;
    const cy = this.targetBall?.y ?? H / 2;

    ctx.save();

    // 암흑 레이어 + 스포트라이트 구멍 뚫기
    ctx.globalCompositeOperation = 'source-over';

    // 방사형 그라디언트로 스포트라이트 표현
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.spotRadius);
    grad.addColorStop(0,   `rgba(0, 0, 0, 0)`);                         // 중심: 투명
    grad.addColorStop(0.6, `rgba(0, 0, 0, 0)`);                         // 중간: 투명
    grad.addColorStop(1,   `rgba(0, 0, 0, ${this.alpha})`);             // 가장자리: 암흑

    // 전체 암흑
    ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
    ctx.fillRect(0, 0, W, H);

    // 스포트라이트 구멍 (destination-out으로 뚫기)
    ctx.globalCompositeOperation = 'destination-out';
    const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.spotRadius);
    spot.addColorStop(0,   `rgba(0, 0, 0, ${this.alpha})`);  // 중심: 완전히 뚫림
    spot.addColorStop(0.7, `rgba(0, 0, 0, ${this.alpha * 0.6})`); // 부드러운 경계
    spot.addColorStop(1,   `rgba(0, 0, 0, 0)`);              // 끝: 암흑 유지

    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(cx, cy, this.spotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// =====================
// ShockwaveEffect (등장/퇴장 충격파)
// =====================
class ShockwaveEffect {
  constructor(x, y, color) {
    this.x      = x;
    this.y      = y;
    this.radius = 10;
    this.alpha  = 0.8;
    this.color  = color;
    this.dead   = false;
  }

  update() {
    this.radius += 8;
    this.alpha  -= 0.05;
    if (this.alpha <= 0) this.dead = true;
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// =====================
// GhostBall (메인 공)
// =====================
export class YangjaewonBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 225,
      speed : 3.4,
      radius: 38,
      mass  : 2.5,
      color : '#3e3d3e',
      name  : '양재원',
      id,
      image : './assets/image/양재원이미지.png'
    });

    // 스킬 쿨타임
    this.skillCooldown  = 12000;   // 8초마다 발동
    this.lastSkillTime  = 0;
    this.skillDuration  = 3500;   // 암흑 지속 3초

    // 스킬 상태
    this.phase          = 'idle'; // 'idle' | 'vanish' | 'shoot' | 'return'
    this.phaseTimer     = 0;
    this.vanishDuration = 1000;    // 사라지는 데 걸리는 시간
    this.shootDelay     = 2000;   // 암흑 후 발사까지 대기
    this.returnDuration = 1000;    // 복귀 연출 시간

    // 투명도 (사라질 때)
    this.ballAlpha      = 1.0;

    // 투사체
    this.projectiles    = [];

    // 이펙트
    this.shockwaves     = [];

    this.spotlight = null;

    this._loadSounds();
  }

  // 인접한 살아있는 공 중 랜덤 1개
  _getNearestTarget(allBalls) {
    const candidates = allBalls
      .filter(b => b !== this && !b.dead)
      .map(b => ({ b, d: Math.hypot(b.x - this.x, b.y - this.y) }))
      .sort((a, z) => a.d - z.d)
      .slice(0, 5); // 가장 가까운 5명 중 랜덤

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)].b;
  }

  update(dt, now, allBalls, effects) {
    // 스킬 중엔 물리 이동 정지 (무적 포함)
    if (this.phase !== 'idle') {
      this.invincible = true;
    } else {
      this.invincible = false;
    }

    // 스킬 중이 아닐 때만 super.update (이동/충돌)
    if (this.phase === 'idle') {
      super.update(dt, now, allBalls, effects);
    }

    // 오버레이 업데이트
    if (this.spotlight) {
  this.spotlight.update(dt);
  if (this.spotlight.isDead()) this.spotlight = null;
}

    // 충격파 업데이트
    this.shockwaves.forEach(s => s.update());
    this.shockwaves = this.shockwaves.filter(s => !s.isDead());

    // 투사체 업데이트
    const others = allBalls.filter(b => b !== this && !b.dead);
    this.projectiles.forEach(p => p.update(others, effects));
    this.projectiles = this.projectiles.filter(p => !p.isDead());

    // ── 스킬 페이즈 FSM ──
    this.phaseTimer += dt;

    if (this.phase === 'idle') {
      if (now - this.lastSkillTime >= this.skillCooldown) {
        soundManager.play("Blackout")
        this._startVanish(effects);
      }
    }

    else if (this.phase === 'vanish') {
      // 서서히 사라짐
      this.ballAlpha = Math.max(0, 1 - this.phaseTimer / this.vanishDuration);
      if (this.phaseTimer >= this.vanishDuration) {
        soundManager.play("Reload")
        this._startShoot(allBalls, effects);
      }
    }

    else if (this.phase === 'shoot') {
      if (this.phaseTimer >= this.shootDelay) {
        soundManager.play("Shot")
        this._doShoot(allBalls, effects);
        this._startReturn(effects);
      }
    }

    else if (this.phase === 'return') {
      // 서서히 나타남
      this.ballAlpha = Math.min(1, this.phaseTimer / this.returnDuration);
      if (this.phaseTimer >= this.returnDuration) {
        this._endSkill(now, effects);
      }
    }
  }

  // ── 페이즈 전환 ──

  _startVanish(effects) {
  this.phase      = 'vanish';
  this.phaseTimer = 0;

  this.spotlight = new SpotlightEffect(this, FIELD_W, FIELD_H);

  this.shockwaves.push(new ShockwaveEffect(this.x, this.y, '#8e44ad'));
}

  _startShoot(allBalls, effects) {
    this.phase      = 'shoot';
    this.phaseTimer = 0;
  }

  _doShoot(allBalls, effects) {
  if (this.spotlight) this.spotlight.startFlash(); // ✅ 번쩍!

  const target = this._getNearestTarget(allBalls);
  if (!target) return;
  this.projectiles.push(new SoccerProjectile(this.x, this.y, target.x, target.y));

    effects.push(new FloatingText(
      this.x, this.y - this.radius - 20,
      '⚽ SHOOT!', '#f1c40f', 20
    ));

    soundManager.play("GhostShoot");
  }

 _startReturn(effects) {
  this.phase      = 'return';
  this.phaseTimer = 0;

  // ✅ fadeOut → startFlash 로 변경 (또는 그냥 null 처리)
  if (this.spotlight) this.spotlight.startFlash();

  this.shockwaves.push(new ShockwaveEffect(this.x, this.y, '#8e44ad'));
  soundManager.play("GhostReturn");
}


  _endSkill(now, effects) {
    this.phase         = 'idle';
    this.phaseTimer    = 0;
    this.ballAlpha     = 1.0;
    this.lastSkillTime = now;

    effects.push(new FloatingText(
      this.x, this.y - this.radius - 20,
      '👻 복귀', '#8e44ad', 16
    ));
  }

  draw(ctx, now) {
  if (this.dead) return;

  if (this.spotlight) this.spotlight.draw(ctx);

  for (const s of this.shockwaves) s.draw(ctx);
  for (const p of this.projectiles) p.draw(ctx);

  if (this.ballAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = this.ballAlpha;
    super.draw(ctx, now);
    ctx.restore();
  }

  // ✅ 쿨타임 원형 게이지
  const elapsed  = now - this.lastSkillTime;  // 마지막 스킬 이후 경과 시간
  const cooldownProgress = this.phase !== 'idle'
    ? 0  // 스킬 중엔 게이지 숨김
    : Math.min(1, elapsed / this.skillCooldown); // 0(쿨타임 시작) → 1(완료)

  if (cooldownProgress < 1) { // 꽉 차면 안그림
    ctx.save();
    ctx.strokeStyle = `hsl(${cooldownProgress * 120}, 100%, 50%)`; // 빨강 → 초록
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
}


  async _loadSounds() {
    await soundManager.load("Blackout", "./assets/sounds/Blackout.mp3");
    await soundManager.load("Reload",  "./assets/sounds/Reload.mp3");
    await soundManager.load("Shot", "./assets/sounds/Shot.ogg");
  }
}
