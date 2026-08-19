import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';

export class HongYunkiBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp:     250,
      speed:  3.0,
      radius: 50,
      mass:   2.0,
      color:  '#707090',
      name:   '홍윤기',
      id,
      image: './assets/image/홍윤기이미지.jpg'
    });

    this.growDelay    = 5000;   // 평상시 유지 시간
    this.growDuration = 1000;   // 자라는 시간
    this.barDuration  = 6000;   // ✅ 막대 유지 시간
    this.shrinkDuration = 1000; // ✅ 줄어드는 시간
    this.maxBarLength = 200;

    this.barDamage      = 15;
    this.barHitCooldown = 600;
    this.barRotSpeed    = 0.125;

    // ✅ 페이즈: hair → growing → bar → shrinking → hair → ...
    this.phase     = 'hair';
    this.birthTime  = null;
    this.phaseStart = null;  // 현재 페이즈 시작 시간
    this.barLength  = 0;
    this.barAngle   = Math.PI / 2;

    this.barHitTimes = new Map();

    this._loadSounds();
  }

  update(dt, now, allBalls, effects) {
    super.update(dt, now, allBalls, effects);
    if (this.birthTime === null) {
      this.birthTime  = now;
      this.phaseStart = now;
    }

    switch (this.phase) {
      case 'hair':      this._updateHair(now);                   break;
      case 'growing':   this._updateGrowing(now);                break;
      case 'bar':       this._updateBar(now, allBalls, effects); break;
      case 'shrinking': this._updateShrinking(now);              break;
    }
  }

  // ─────────────────────────────────────────
  // 페이즈 전환 헬퍼
  // ─────────────────────────────────────────
  _setPhase(phase, now) {
    this.phase      = phase;
    this.phaseStart = now;
  }

  // ─────────────────────────────────────────
  // hair: 평상시 대기
  // ─────────────────────────────────────────
  _updateHair(now) {
    if (now - this.phaseStart >= this.growDelay) {
      this._setPhase('growing', now);
    }
  }

  // ─────────────────────────────────────────
  // growing: 자라남
  // ─────────────────────────────────────────
  _updateGrowing(now) {
    this.barAngle += this.barRotSpeed;

    const t = Math.min((now - this.phaseStart) / this.growDuration, 1);
    this.barLength = this.maxBarLength * this._easeOutCubic(t);

    if (t >= 1) {
      this.barLength = this.maxBarLength;
      this._setPhase('bar', now);
      soundManager.play("홍윤기_야ㅅㅂ")
    }
  }

  // ─────────────────────────────────────────
  // bar: 회전하며 공격
  // ─────────────────────────────────────────
  _updateBar(now, allBalls, effects) {
    this.barAngle += this.barRotSpeed;

    // ✅ 유지 시간 지나면 shrinking으로
    if (now - this.phaseStart >= this.barDuration) {
      this._setPhase('shrinking', now);
      return;
    }

    const segments = this._getBarSegments();

    for (const ball of allBalls) {
      if (ball === this || ball.dead) continue;

      const lastHit = this.barHitTimes.get(ball) ?? 0;
      if (now - lastHit < this.barHitCooldown) continue;

      for (const seg of segments) {
        if (this._segmentCircleCollide(seg, ball)) {
          this.barHitTimes.set(ball, now);
          ball.takeDamage(this.barDamage, effects);
          soundManager.playHit();

          // 충돌 시 방향 반전
          this.barRotSpeed *= -1;
          break;
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // ✅ shrinking: 줄어들며 hair로 복귀
  // ─────────────────────────────────────────
  _updateShrinking(now) {
    this.barAngle += this.barRotSpeed;

    const t = Math.min((now - this.phaseStart) / this.shrinkDuration, 1);
    this.barLength = this.maxBarLength * (1 - this._easeOutCubic(t));

    if (t >= 1) {
      this.barLength = 0;
      soundManager.play("홍윤기_미친새끼들와")
      this._setPhase('hair', now);
      
    }
  }

  // ─────────────────────────────────────────
  // 막대 선분
  // ─────────────────────────────────────────
  _getBarSegments() {
  const r = this.radius;
  const cx = this.x;
  const cy = this.y;

  // ✅ 귀옆 고정 위치 (축)
  const leftPivot  = { x: cx - r * 0.9, y: cy + r * 0.4 };
  const rightPivot = { x: cx + r * 0.9, y: cy + r * 0.4 };

  const cos = Math.cos(this.barAngle);
  const sin = Math.sin(this.barAngle);

  // ✅ 각 축에서 barAngle 방향으로 뻗음
  const leftEnd  = { x: leftPivot.x  + cos * this.barLength, y: leftPivot.y  + sin * this.barLength };
  const rightEnd = { x: rightPivot.x + cos * this.barLength, y: rightPivot.y + sin * this.barLength };

  return [
    { start: leftPivot,  end: leftEnd  },
    { start: rightPivot, end: rightEnd },
  ];
}
  _segmentCircleCollide(seg, ball) {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const fx = seg.start.x - ball.x;
    const fy = seg.start.y - ball.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - (ball.radius + 7) ** 2;

    let disc = b * b - 4 * a * c;
    if (disc < 0) return false;

    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ─────────────────────────────────────────
  // draw
  // ─────────────────────────────────────────
  draw(ctx, now) {
  this._drawGrowTimer(ctx, now);

 

  // 2. 공 본체
  super.draw(ctx, now);

  // 3. 앞머리
  this._drawFrontHair(ctx);

   // 1. 막대 뒷부분 (공 뒤)
  this._drawBarOuter(ctx);
}

// ─────────────────────────────────────────
// 공 표면 ~ 끝 (공 뒤에 그림)
// ─────────────────────────────────────────


  _drawBarOuter(ctx) {
    if (this.barLength <= 0) return;

    const segs = this._getBarSegments();

    ctx.save();

    if (this.phase === 'bar') {
      ctx.shadowColor = '#3b1000';
      ctx.shadowBlur  = 18;
    }

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 14;
    ctx.lineCap     = 'round';

    for (const seg of segs) {
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x,   seg.end.y);
      ctx.stroke();
    }

    if (this.phase === 'bar') {
      for (const seg of segs) {
        ctx.fillStyle  = '#6d0000';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(seg.end.x, seg.end.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }



  _drawFrontHair(ctx) {
  const r  = this.radius;
  const cx = this.x;
  const cy = this.y;

  ctx.save();
  ctx.fillStyle = '#1a1a1a';

  // 윗머리는 항상
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.30, r * 1.05, r * 0.72, 0, Math.PI, 0);
  ctx.fill();

  // ✅ 귀옆 구렛나루도 항상 (막대 시작점 역할)
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.9, cy + r * 0.1, r * 0.18, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + r * 0.9, cy + r * 0.1, r * 0.18, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

  _drawGrowTimer(ctx, now) {
    if (!this.phaseStart) return;

    ctx.save();
    ctx.font         = 'bold 13px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ✅ 페이즈별 타이머 표시
    if (this.phase === 'hair') {
      const remaining = Math.max(0, this.growDelay - (now - this.phaseStart));
      const progress  = 1 - remaining / this.growDelay;

      ctx.strokeStyle = '#4488ff66';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();

      ctx.fillStyle = '#080808';
      ctx.fillText(`${(remaining / 1000).toFixed(1)}s`, this.x, this.y-20 - this.radius - 18);

    } else if (this.phase === 'bar') {
      const remaining = Math.max(0, this.barDuration - (now - this.phaseStart));
      const progress  = 1 - remaining / this.barDuration;

      ctx.strokeStyle = '#ff440066';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();

      ctx.fillStyle = '#ffcc88';
      ctx.fillText(`${(remaining / 1000).toFixed(1)}s`, this.x, this.y - this.radius - 18);
    }

    ctx.restore();
  }
  async _loadSounds() {
    await soundManager.load("홍윤기_미친새끼들와", "./assets/sounds/홍윤기_미친새끼들와.mp3")
    await soundManager.load("홍윤기_야ㅅㅂ", "./assets/sounds/홍윤기_야ㅅㅂ.mp3")
  }
}
