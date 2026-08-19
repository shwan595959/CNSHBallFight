import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';

export class LeeJunWooBall extends Ball {
  constructor(x, y, id) {
    super(x, y,{
      hp:     280,      // ← 직접 설정
      speed:  4.0,      // ← 직접 설정
      radius: 45,       // ← 직접 설정
      mass:   3.0,      // ← 직접 설정
      color:  '#707070', // ← 직접 설정
      name:   '이준우',
      id,
      image: './assets/image/이준우이미지.jpg'
    });

    // 스킬 수치 (나중에 설정)
    this.skillCooldown   = 8000;  // 쿨타임 (ms)
    this.grappleRange    = 140;   // 범위 반지름 (px)
    this.grappledDamage  = 9;    // 지속 데미지
    this.damageInterval  = 300;   // 데미지 간격 (ms)
    this.grappledDuration = 3000; // 붙잡는 지속시간 (ms)

    // 상태
    this.phase     = 'idle';
    this.phaseTimer = 0;
    this.lastSkillTime = 0;

    // 붙잡힌 공들 관리
    // Map { ball → { timer, lastDamageTime, legs: [legObj, legObj] } }
    this.grappledBalls = new Map();

    // 다리 이미지
    this.legImg = new Image();
    this.legImg.src = './assets/image/준우다리.png';
  }

  update(dt, now, allBalls, effects) {
    super.update(dt, now, allBalls, effects);

    switch (this.phase) {
      case 'idle':
        this._updateIdle(now, allBalls);
        break;
      case 'grapple':
        this._updateGrapple(dt, now, allBalls, effects);
        break;
    }

    // 붙잡힌 공들 업데이트
    this._updateGrappledBalls(dt, now, effects);
  }

  // ─────────────────────────────────────
  // idle: 쿨타임 체크 → 범위 안에 공 있으면 발동
  // ─────────────────────────────────────
  _updateIdle(now, allBalls) {
    if (now - this.lastSkillTime < this.skillCooldown) return;
    this.speed = 6.0
    // 범위 안에 공이 있는지 체크
    const inRange = allBalls.filter(b =>
      b !== this &&
      !b.dead &&
      !this.grappledBalls.has(b) &&
      Math.hypot(this.x - b.x, this.y - b.y) < this.grappleRange
    );

    if (inRange.length > 0) {
      this.lastSkillTime = now;
      this.phase = 'grapple';
    }
  }

  // ─────────────────────────────────────
  // grapple: 범위 안 공 붙잡기
  // ─────────────────────────────────────
  _updateGrapple(dt, now, allBalls, effects) {
  const currentGrappled = this.grappledBalls.size;
  if (currentGrappled >= 2) {
    this.phase = 'idle';
    return;
  }

  const targets = allBalls.filter(b =>
    b !== this &&
    !b.dead &&
    !this.grappledBalls.has(b) &&
    Math.hypot(this.x - b.x, this.y - b.y) < this.grappleRange
  );

  for (const target of targets) {
    if (this.grappledBalls.size >= 2) break;

    this.grappledBalls.set(target, {
      timer         : 0,
      lastDamageTime: now,
      legs          : [
        { offsetAngle: -0.3 },
        { offsetAngle:  0.3 },
      ]
    });

    target.vx    = 0;
    target.vy    = 0;
    target.speed = 0;
    target.grappled = true;
  }

  this.phase = 'idle';
}


  // ─────────────────────────────────────
  // 붙잡힌 공들 지속 데미지 + 시간 체크
  // ─────────────────────────────────────
  _updateGrappledBalls(dt, now, effects) {
  // 붙잡은 공이 있으면 준우도 멈춤
  if (this.grappledBalls.size > 0) {
    this.vx    = 0;   // ← 추가
    this.vy    = 0;   // ← 추가
    this.speed = 0;   // ← 추가
  }

  for (const [ball, data] of this.grappledBalls) {
    if (ball.dead) {
      this._releaseGrapple(ball);
      continue;
    }

    // 잡힌 공도 매 프레임 고정
    ball.vx    = 0;
    ball.vy    = 0;
    ball.speed = 0;

    data.timer += dt;
    if (now - data.lastDamageTime >= this.damageInterval) {
      data.lastDamageTime = now;
      ball.takeDamage(this.grappledDamage, effects);
      soundManager.playHit();
    }

    if (data.timer >= this.grappledDuration) {
      this._releaseGrapple(ball);
    }
  }
}


  // ─────────────────────────────────────
  // 그랩 해제
  // ─────────────────────────────────────
  _releaseGrapple(ball) {
  ball.grappled = false;
  ball.speed    = ball.baseSpeed ?? 3.0;
  this.grappledBalls.delete(ball);

  // 마지막 공 해제 시 준우 속도 복구
  if (this.grappledBalls.size === 0) {
    this.speed = this.baseSpeed ?? 3.0; // ← 추가
  }
}

  // ─────────────────────────────────────
  // 그리기
  // ─────────────────────────────────────
  draw(ctx) {
    // 범위 표시 (쿨타임 끝났을 때만)
    const now = performance.now();
    if (now - this.lastSkillTime >= this.skillCooldown) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.grappleRange, 0, Math.PI * 2);
      ctx.strokeStyle = `${this.color}55`;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 다리 그리기
    this._drawLegs(ctx);

    // 공 본체
    super.draw(ctx);
  }

  // ─────────────────────────────────────
  // 다리 이미지 그리기
  // ─────────────────────────────────────
  _drawLegs(ctx) {
  // 이미지 로드 체크
  if (!this.legImg.complete || this.legImg.naturalWidth === 0) return;

  for (const [ball, data] of this.grappledBalls) {
    const dx    = ball.x - this.x;
    const dy    = ball.y - this.y;
    const angle = Math.atan2(dy, dx); // 나 → 잡힌 공 방향
    const dist  = Math.hypot(dx, dy);

    // 원본 비율 유지 (1024x1536 → 가로로 눕히면 1536x1024)
    // 눕혔을 때 높이를 36px로 고정하면 너비 = 36 * (1536/1024) = 54px
    // 하지만 dist에 맞게 늘릴거라 비율은 무시

    data.legs.forEach((leg, i) => {
      const offsetY = i === 0 ? -20 : 20; // 다리 1: 위, 다리 2: 아래

      ctx.save();

      // 1. 나(이준우볼) 위치로 이동
      ctx.translate(this.x, this.y);

      // 2. 잡힌 공 방향으로 회전
      ctx.rotate(angle);

      // 3. 다리 중간 지점으로 이동
      ctx.translate(dist / 2, offsetY);

      // 4. 세로 이미지를 가로로 눕힘 (90도 회전)
      // 4. 세로 이미지를 가로로 눕힘
ctx.rotate(-Math.PI / 2); // ← Math.PI/2 에서 - 추가

// 원본 비율 유지 (1024x1536)
// 가로로 눕히면 → 너비:높이 = 1536:1024
// legW = dist 기준으로 높이 계산
const legW = dist;
const legH = dist * (1024 / 1536) * 1.3; // ← 비율 유지 (약 0.667)

ctx.drawImage(
  this.legImg,
  -legW / 2, -legH / 2,
  legW, legH
);


      ctx.restore();
    });
  }
}

}
