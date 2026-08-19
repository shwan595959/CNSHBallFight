import { Ball } from '../core/Ball.js';
import { FloatingText, Particle } from '../core/Effects.js';
import { soundManager } from '../core/SoundManager.js';
import { FIELD_H, FIELD_W } from '../game.js';

// ── 계란 투사체 ──────────────────────────────────────────
class AirEgg {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;

    this.z       = 0;
    this.vz      = 10;
    this.gravity = 0.15;
    this.landed  = false;

    this.img = new Image();
    // this.img.src = './assets/image/계란이미지.png';
  }

  update(dt) {
    if (this.dead || this.landed) return;

    this.vz -= this.gravity;
    this.z  += this.vz;

    if (this.z <= 0) {
      this.z      = 0;
      this.landed = true;
    }
  }

  isLanded() { return this.landed; }
  isDead()   { return this.dead;   }

  draw(ctx) {
    if (this.dead) return;

    const drawY     = this.y - this.z;
    const scale     = 1 + this.z / 80;
    const drawR     = 22 * scale;
    const shadowSc  = Math.max(0.2, 1 - this.z / 180);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 22 * shadowSc, 9 * shadowSc, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, drawY);
    if (this.img.complete && this.img.naturalWidth !== 0) {
      ctx.drawImage(this.img, -drawR, -drawR, drawR * 2, drawR * 2);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, drawR * 0.7, drawR, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f5f0dc';
      ctx.fill();
      ctx.strokeStyle = '#d4c9a8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── 계란 깨지는 파편 이펙트 ──────────────────────────────
class EggBreakEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.timer    = 0;
    this.duration = 600;
    this.dead     = false;

    this.shards = Array.from({ length: 12 }, () => ({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      alpha: 1.0,
      size: 4 + Math.random() * 8,
    }));
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) { this.dead = true; return; }

    const progress = this.timer / this.duration;
    for (const s of this.shards) {
      s.x    += s.vx;
      s.y    += s.vy;
      s.vy   += 0.3;
      s.alpha = 1 - progress;
    }
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;
    for (const s of this.shards) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.size, s.size * 1.3, Math.random(), 0, Math.PI * 2);
      ctx.fillStyle = '#f5f0dc';
      ctx.fill();
      ctx.strokeStyle = '#d4c9a8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── 레이저 이펙트 ─────────────────────────────────────────
class LaserEffect {
  constructor(ox, oy, tx, ty) {
    this.ox = ox; this.oy = oy;
    this.tx = tx; this.ty = ty;

    this.phase = 'warning';
    this.timer = 0;
    this.dead  = false;

    this.warningDuration = 3500;
    this.fireDuration    = 300;
    this.explodeDuration = 500;

    this.particles      = [];
    this.warningSounded = false;
    this.fireSounded    = false;

    // fire 진입 콜백 (EggBall에서 주입)
    this.onFire = null;
  }

  update(dt) {
    if (this.dead) return;
    this.timer += dt;

    if (this.phase === 'warning') {
      if (!this.warningSounded) {
        soundManager.play('LockOn', 2.0);
        this.warningSounded = true;
      }

      if (this.timer >= this.warningDuration) {
        this.timer = 0;
        this.phase = 'fire';

        // fire 진입 시점 콜백 호출
        if (this.onFire) {
          this.onFire();
          this.onFire = null; // 1회만
        }

        if (!this.fireSounded) {
          soundManager.play('Laser', 2.0);
          this.fireSounded = true;
        }
      }

    } else if (this.phase === 'fire') {
      if (this.timer >= this.fireDuration) {
        this.timer = 0;
        this.phase = 'explode';
        this._spawnParticles();
      }

    } else if (this.phase === 'explode') {
      for (const p of this.particles) {
        p.x     += p.vx;
        p.y     += p.vy;
        p.vy    += 0.3;
        p.alpha -= dt / this.explodeDuration;
        p.size  *= 0.95;
      }

      if (this.timer >= this.explodeDuration) {
        this.dead = true;
      }
    }
  }

  _spawnParticles() {
    for (let i = 0; i < 24; i++) {
      const angle  = (Math.PI * 2 / 24) * i + Math.random() * 0.3;
      const speed  = 3 + Math.random() * 8;
      const colors = ['#ff4444', '#ff8800', '#ffff00', '#ffffff'];
      this.particles.push({
        x    : this.tx,
        y    : this.ty,
        vx   : Math.cos(angle) * speed,
        vy   : Math.sin(angle) * speed,
        size : 6 + Math.random() * 10,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    this.shockwave = {
      x: this.tx, y: this.ty,
      r: 10, maxR: 80, alpha: 1.0,
    };
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;

    if (this.phase === 'warning') {
      this._drawWarning(ctx);
    } else if (this.phase === 'fire') {
      this._drawLaser(ctx, 1 - this.timer / this.fireDuration);
    } else if (this.phase === 'explode') {
      const laserAlpha = Math.max(0, 1 - this.timer / (this.explodeDuration * 0.3));
      if (laserAlpha > 0) this._drawLaser(ctx, laserAlpha * 0.4);

      if (this.shockwave) {
        const sw = this.shockwave;
        sw.r    += (sw.maxR - sw.r) * 0.15;
        sw.alpha = Math.max(0, 1 - this.timer / this.explodeDuration);

        ctx.save();
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth   = 4 * sw.alpha;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur  = 20;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const p of this.particles) {
        if (p.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const flashAlpha = Math.max(0, 1 - this.timer / (this.explodeDuration * 0.4));
      if (flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = flashAlpha * 0.8;
        const grad = ctx.createRadialGradient(
          this.tx, this.ty, 0,
          this.tx, this.ty, 60
        );
        grad.addColorStop(0,   '#ffffff');
        grad.addColorStop(0.3, '#ff8800');
        grad.addColorStop(1,   'rgba(255,68,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.tx, this.ty, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawWarning(ctx) {
    const blink = Math.floor(this.timer / 25) % 2 === 0;
    if (!blink) return;

    const progress = this.timer / this.warningDuration;

    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -this.timer * 0.1;
    ctx.strokeStyle    = `rgba(255, ${Math.floor(200 * (1 - progress))}, 0, 0.8)`;
    ctx.lineWidth      = 3;
    ctx.shadowColor    = '#ff4400';
    ctx.shadowBlur     = 10;
    ctx.lineCap        = 'round';
    ctx.beginPath();
    ctx.moveTo(this.ox, this.oy);
    ctx.lineTo(this.tx, this.ty);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle   = `rgba(255, 80, 0, ${0.6 + Math.sin(this.timer * 0.01) * 0.4})`;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.arc(this.tx, this.ty, 14 + Math.sin(this.timer * 0.015) * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 18px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.fillText('⚠️', this.tx, this.ty - 28);
    ctx.restore();
  }

  _drawLaser(ctx, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap     = 'round';

    ctx.strokeStyle = 'rgba(255, 50, 0, 0.4)';
    ctx.lineWidth   = 70;
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur  = 80;
    ctx.beginPath();
    ctx.moveTo(this.ox, this.oy);
    ctx.lineTo(this.tx, this.ty);
    ctx.stroke();

    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth   = 60;
    ctx.shadowBlur  = 80;
    ctx.beginPath();
    ctx.moveTo(this.ox, this.oy);
    ctx.lineTo(this.tx, this.ty);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 35;
    ctx.shadowColor = '#ffaaaa';
    ctx.shadowBlur  = 55;
    ctx.beginPath();
    ctx.moveTo(this.ox, this.oy);
    ctx.lineTo(this.tx, this.ty);
    ctx.stroke();

    const flashAlpha = Math.max(0, 1 - (this.timer / this.fireDuration) * 3);
    if (flashAlpha > 0) {
      ctx.globalAlpha = flashAlpha * 0.6;
      const grad = ctx.createRadialGradient(
        this.ox, this.oy, 0,
        this.ox, this.oy, 50
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.ox, this.oy, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── 타일 설정 ─────────────────────────────────────────────
const TILE_TYPES  = ['Fail', 'Fail', 'Heal', 'Survive'];
const TILE_COLORS = {
  Fail   : 'rgba(231, 76,  60,  0.35)',
  Heal   : 'rgba( 46, 204, 113, 0.35)',
  Survive: 'rgba( 52, 152, 219, 0.35)',
};
const TILE_BORDER = {
  Fail   : '#e74c3c',
  Heal   : '#2ecc71',
  Survive: '#3498db',
};
const TILE_LABEL = {
  Fail   : '💀 실패!',
  Heal   : '💚 행운',
  Survive: '🛡️ 생존',
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 메인 공 ───────────────────────────────────────────────
export class KimSooHwanBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 210,
      speed : 2.5,
      radius: 42,
      mass  : 2.8,
      color : '#f5f0dc',
      name  : '김수환',
      id,
      image: './assets/image/김수환이미지2.png'
    });


    this.skillCooldown = 10000;
    this.lastSkillTime = 0;

    this.phase      = 'idle';
    this.phaseTimer = 0;

    this.crackDuration    = 600;
    this.quadrantDuration = 4000;

    this.tiles         = null;
    this.airEgg        = null;
    this.eggBreak      = null;
    this.lasers        = [];
    this.quadrantTimer = 0;

    // 판정 결과 저장 (fire 시점에 적용)
    this._judgeResults = [];
    this._judgeApplied = false;

    this._loadSounds();
  }

  _getQuadrant(bx, by) {
    const cx = FIELD_W / 2;
    const cy = FIELD_H / 2;
    if (bx <  cx && by <  cy) return 0; // 좌상
    if (bx >= cx && by <  cy) return 1; // 우상
    if (bx <  cx && by >= cy) return 2; // 좌하
    return 3;                            // 우하
  }

  // 모든 공 freeze / unfreeze
  _freezeAll(allBalls, frozen) {
    for (const b of allBalls) {
      if (b === this) continue;
      b.kshstun = frozen;
    }
  }

  update(dt, now, allBalls, effects) {
    this.invincible = this.phase !== 'idle';

    // 레이저 업데이트
    this.lasers.forEach(l => l.update(dt));
    this.lasers = this.lasers.filter(l => !l.isDead());

    // 깨지는 이펙트 업데이트
    if (this.eggBreak) {
      this.eggBreak.update(dt);
      if (this.eggBreak.isDead()) this.eggBreak = null;
    }

    this.phaseTimer += dt;

    if (this.phase === 'idle') {
      super.update(dt, now, allBalls, effects);

      if (now - this.lastSkillTime >= this.skillCooldown) {
        this._startThrow(effects);
      }

    } else if (this.phase === 'throw') {
      if (this.airEgg) {
        this.airEgg.update(dt);

        if (this.airEgg.isLanded()) {
          this.eggBreak = new EggBreakEffect(this.airEgg.x, this.airEgg.y);
          this.airEgg   = null;
          this._startCrack(effects);
        }
      }

    } else if (this.phase === 'crack') {
      if (this.phaseTimer >= this.crackDuration) {
        this._startQuadrant(effects);
      }

    } else if (this.phase === 'quadrant') {
      this.quadrantTimer = this.quadrantDuration - this.phaseTimer;
      if (this.phaseTimer >= this.quadrantDuration) {
        this._doJudge(allBalls, effects, now);
      }

    } else if (this.phase === 'laser') {
      // 레이저 전부 끝나면 스킬 종료
      if (this.lasers.length === 0) {
        this._freezeAll(allBalls, false);
        this._endSkill(now);
      }
    }
  }

  _startThrow(effects) {
    this.phase      = 'throw';
    this.phaseTimer = 0;

    this.airEgg = new AirEgg(FIELD_W / 2, FIELD_H / 2);

  }

  _startCrack(effects) {
    this.phase      = 'crack';
    this.phaseTimer = 0;

  }

  _startQuadrant(effects) {
    soundManager.play("Timer", 2.0);
    this.phase      = 'quadrant';
    this.phaseTimer = 0;
    this.tiles      = shuffleArray(TILE_TYPES);

    effects.push(new FloatingText(
      FIELD_W / 2, FIELD_H / 2 - 60,
      '⚠️ 선택의 시간입니다! ⚠️', '#f39c12', 24, 9.0
    ));
  }

  _doJudge(allBalls, effects, now) {
    this.phase      = 'laser';
    this.phaseTimer = 0;

    this._judgeResults = [];
    this._judgeApplied = false;

    const others = allBalls.filter(b => b !== this && !b.dead);

    // 판정 결과 미리 저장 (실제 적용은 fire 시점)
    for (const b of others) {
      const q    = this._getQuadrant(b.x, b.y);
      const type = this.tiles[q];
      this._judgeResults.push({ ball: b, type });
    }

    // Fail 대상에게만 레이저 생성
    for (const { ball, type } of this._judgeResults) {
      if (type === 'Fail') {
        const laser = new LaserEffect(this.x, this.y, ball.x, ball.y);

        // fire 진입 시점에 데미지 + 힐 적용
        laser.onFire = () => this._applyJudge(allBalls, effects);
        this.lasers.push(laser);
      }
    }

    // 레이저 경고 시작과 동시에 모든 공 freeze
    this._freezeAll(allBalls, true);

    // Fail 대상 없으면 바로 판정 적용 후 종료
    if (this.lasers.length === 0) {
      this._applyJudge(allBalls, effects);
      this._freezeAll(allBalls, false);
      this._endSkill(now);
    }
  }

  // 실제 데미지 / 힐 적용 (fire 시점 1회)
  _applyJudge(allBalls, effects) {
    if (this._judgeApplied) return;
    this._judgeApplied = true;

    for (const { ball, type } of this._judgeResults) {
      if (ball.dead) continue;

      if (type === 'Fail') {
        const dmg = Math.floor(ball.maxHp * 0.35);
        ball.takeDamage(dmg, effects);
        effects.push(new FloatingText(
          ball.x, ball.y - ball.radius - 10,
          `💀 FAIL! -${dmg}`, '#e74c3c', 22, 5.0
        ));

      } else if (type === 'Heal') {
        ball.hp = Math.min(ball.maxHp, ball.hp + 20);
        effects.push(new FloatingText(
          ball.x, ball.y - ball.radius - 10,
          '💚 HEAL! +50', '#2ecc71', 22, 5.0
        ));

      } else {
        effects.push(new FloatingText(
          ball.x, ball.y - ball.radius - 10,
          '🛡️ SURVIVE!', '#3498db', 22, 5.0
        ));
      }
    }
  }

  _endSkill(now) {
    this.phase         = 'idle';
    this.phaseTimer    = 0;
    this.lastSkillTime = now;
    this.tiles         = null;
    this._judgeResults = [];
    this._judgeApplied = false;
    this.lasers        = [];
  }

  draw(ctx, now) {
    if (this.dead) return;

    // 사분면 그리기
    if ((this.phase === 'quadrant' || this.phase === 'laser') && this.tiles) {
      this._drawQuadrants(ctx);
    }

    // 레이저
    for (const l of this.lasers) l.draw(ctx);

    // 계란 투사체
    if (this.airEgg) this.airEgg.draw(ctx);

    // 깨지는 이펙트
    if (this.eggBreak) this.eggBreak.draw(ctx);

    // 공 본체
    super.draw(ctx, now);

    // 쿨타임 게이지
    const elapsed          = now - this.lastSkillTime;
    const cooldownProgress = this.phase !== 'idle'
      ? 0
      : Math.min(1, elapsed / this.skillCooldown);

    if (cooldownProgress < 1) {
      ctx.save();
      ctx.strokeStyle = `hsl(${cooldownProgress * 120}, 100%, 50%)`;
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(
        this.x, this.y, this.radius + 6,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * cooldownProgress
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawQuadrants(ctx) {
    const cx = FIELD_W / 2;
    const cy = FIELD_H / 2;

    const quads = [
      { x: 0,  y: 0,  w: cx,           h: cy,           idx: 0 }, // TL
      { x: cx, y: 0,  w: FIELD_W - cx, h: cy,           idx: 1 }, // TR
      { x: 0,  y: cy, w: cx,           h: FIELD_H - cy, idx: 2 }, // BL
      { x: cx, y: cy, w: FIELD_W - cx, h: FIELD_H - cy, idx: 3 }, // BR
    ];

    for (const q of quads) {
      const type = this.tiles[q.idx];

      // 배경
      ctx.fillStyle = TILE_COLORS[type];
      ctx.fillRect(q.x, q.y, q.w, q.h);

      // 테두리
      ctx.strokeStyle = TILE_BORDER[type];
      ctx.lineWidth   = 2;
      ctx.strokeRect(q.x, q.y, q.w, q.h);

      // 라벨
      ctx.save();
      ctx.font         = 'bold 22px Arial';
      ctx.fillStyle    = 'rgba(255,255,255,0.9)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TILE_LABEL[type], q.x + q.w / 2, q.y + q.h / 2);
      ctx.restore();
    }

    // 중앙 십자선
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);        ctx.lineTo(cx, FIELD_H);
    ctx.moveTo(0,  cy);       ctx.lineTo(FIELD_W, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 타이머 바 (quadrant 페이즈만)
    if (this.phase === 'quadrant') {
      const prog = Math.max(0, this.quadrantTimer / this.quadrantDuration);
      const bx   = FIELD_W * 0.2;
      const bw   = FIELD_W * 0.6;
      const by   = FIELD_H - 32;
      const bh   = 14;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = prog > 0.4 ? '#2ecc71' : prog > 0.2 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(bx, by, bw * prog, bh);

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }
  }

    async _loadSounds() {
    await soundManager.load("LockOn", "./assets/sounds/LockOn.mp3");
    await soundManager.load("Laser",  "./assets/sounds/LaserGun.mp3");
    await soundManager.load("Timer", "./assets/sounds/Timer.mp3");
  }
}
