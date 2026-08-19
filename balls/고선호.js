import { Ball, Utils } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText } from '../core/Effects.js';

class WaterPuddle {
  constructor(x, y, isRampage = false, owner = null) {
    this.x        = x;
    this.y        = y;
    this.r        = 10;
    this.maxR     = 120;
    this.alpha    = 0.55;
    this.dead     = false;
    this.timer    = 0;
    this.attackTimer    = 0;
    this.attackInterval = 750;

    this.isRampage = isRampage;
    this.duration  = isRampage ? 1500 : 8000;
    this.exploded  = false;
    this.owner     = owner;

    this.isExploding     = false;
    this.explodeTimer    = 0;
    this.explodeDuration = 200;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  update(dt, allBalls, effects) {
    this.timer += dt;
    this.attackTimer += dt;

    if (this.isExploding) {
      this.explodeTimer += dt;
      const t = this.explodeTimer / this.explodeDuration;

      this.scaleX = 1 - t * 0.8;
      this.scaleY = 1 + t * 3.5;
      this.alpha  = 0.55 * (1 - t);

      // ✅ 애니메이션 끝난 후 데미지
      if (this.explodeTimer >= this.explodeDuration) {
        this._dealExplosionDamage(allBalls, effects);
        this.dead = true;
      }
      return;
    }

    if (this.r < this.maxR) {
      const progress  = this.r / this.maxR;
      const expandSpd = 4.5 * (1 - progress) + 0.2;
      this.r = Math.min(this.maxR, this.r + expandSpd);
    }

    if (this.isRampage && this.timer >= this.duration && !this.exploded) {
      this._explode(effects);
      return;
    }

    if (!this.isRampage && this.timer >= this.duration) {
      this.alpha -= 0.015;
      if (this.alpha <= 0) this.dead = true;
    }
  }

  // ✅ 애니메이션 + 사운드만
  _explode(effects) {
    this.exploded    = true;
    this.isExploding = true;

    effects.push(new FloatingText(
      this.x, this.y - 20,
      '💧💥', '#00cfff', 28
    ));

    soundManager.play('WaterExplode');
  }

  // ✅ 데미지는 여기서만, 고선호 제외
  _dealExplosionDamage(allBalls, effects) {
    const explosionR = this.r * 1.5;

    for (const b of allBalls) {
      if (b.dead) continue;
      if (b === this.owner) continue; // ✅ 고선호 본인 제외

      const dist = Math.hypot(b.x - this.x, b.y - this.y);
      if (dist < explosionR + b.radius) {
        b.takeDamage(45, effects);
        effects.push(new FloatingText(
          b.x, b.y - 30,
          '💥 -45', '#00cfff', 18
        ));
      }
    }
  }

  canAttack() {
    if (this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-this.x, -this.y);

    const innerColor = this.isRampage
      ? 'rgba(0, 180, 255, 0.8)'
      : 'rgba(0, 120, 255, 0.6)';
    const midColor = this.isRampage
      ? 'rgba(0, 120, 220, 0.5)'
      : 'rgba(0, 80,  200, 0.4)';

    const grad = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.r
    );
    grad.addColorStop(0,   innerColor);
    grad.addColorStop(0.7, midColor);
    grad.addColorStop(1,   'rgba(0, 60, 180, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.r, this.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.isRampage
      ? `rgba(0, 220, 255, ${0.6 + 0.4 * Math.sin(this.timer / 150)})`
      : 'rgba(100, 180, 255, 0.6)';
    ctx.lineWidth = this.isRampage ? 3 : 2;
    ctx.stroke();

    if (this.isRampage && !this.isExploding) {
      const lifeRatio = 1 - this.timer / this.duration;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = `rgba(255, 80, 80, ${lifeRatio})`;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(
        this.x, this.y - this.r * 0.1,
        this.r * 0.3,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * lifeRatio
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  contains(ball) {
    if (this.isExploding) return false;
    const dx = (ball.x - this.x) / this.r;
    const dy = (ball.y - this.y) / (this.r * 0.5);
    return dx * dx + dy * dy <= 1;
  }
}

export class KoSunhoBall extends Ball {
  constructor(x, y) {
    super(x, y, {
      radius: 45,
      hp:     330,
      speed:  2.0,
      mass:   5.3,
      color:  '#4fc3f7',
      name:   '고선호',
      image: './assets/image/고선호이미지.jpg',
    });

    this.baseSpeed = 2.0;

    this.puddles             = [];
    this.puddleTimer         = 0;
    this.puddleInterval      = 14000;
    this.puddleQueue         = 0;
    this.puddleDelay         = 0;
    this.puddleDelayInterval = 800;

    this.isRampage        = false;
    this.rampageAnnounced = false;

    this.rampagePuddleTimer    = 0;
    this.rampagePuddleInterval = 1200;

    this._loadSounds();
  }

  _checkRampage(now, effects) {
    if (this.isRampage) return;
    if (this.hp / this.maxHp > 0.35) return;

    this.isRampage = true;
    this.speed     = this.baseSpeed * 2.2;

    if (!this.rampageAnnounced) {
      this.rampageAnnounced = true;
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 40,
        '💧 폭주!!', '#00cfff', 28
      ));
      soundManager.play('고선호_폭주');
    }
  }

  _spawnRampagePuddle(dt) {
    this.rampagePuddleTimer += dt;
    if (this.rampagePuddleTimer < this.rampagePuddleInterval) return;

    this.rampagePuddleTimer = 0;

    const angle = Math.random() * Math.PI * 2;
    const dist  = Utils.randRange(40, 200);
    const px    = this.x + Math.cos(angle) * dist;
    const py    = this.y + Math.sin(angle) * dist;

    this.puddles.push(new WaterPuddle(px, py, true, this)); // ✅ this 전달
    soundManager.play('WaterSplash');
  }

  update(dt, now, allBalls, effects) {
    if (this.dead) return;

    this._checkRampage(now, effects);

    this.puddleTimer += dt;
    if (this.puddleTimer >= this.puddleInterval) {
      this.puddleTimer = 0;
      this.puddleQueue = 3;
      this.puddleDelay = 0;
      soundManager.play('고선호_유기화학');
    }

    if (this.puddleQueue > 0) {
      this.puddleDelay += dt;
      if (this.puddleDelay >= this.puddleDelayInterval) {
        this.puddleDelay = 0;
        this.puddleQueue--;
        const offsetX = Utils.randRange(-80, 80);
        const offsetY = Utils.randRange(-80, 80);
        soundManager.play('WaterSplash');
        this.puddles.push(new WaterPuddle(this.x + offsetX, this.y + offsetY, false, this)); // ✅ this 전달
      }
    }

    if (this.isRampage) {
      this._spawnRampagePuddle(dt);
    }

    for (const p of this.puddles) p.update(dt, allBalls, effects);
    this.puddles = this.puddles.filter(p => !p.dead);

    for (const p of this.puddles) {
      const doAttack = p.canAttack();
      for (const ball of allBalls) {
        if (ball === this || ball.dead) continue; // ✅ 도트 데미지도 고선호 제외
        if (p.contains(ball)) {
          if (doAttack) {
            ball.takeDamage(18, effects);
          }
        }
      }
    }

    super.update(dt, now, allBalls, effects);
  }

  draw(ctx, now) {
    if (this.dead) return;

    for (const p of this.puddles) p.draw(ctx);

    if (this.isRampage) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 120);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8 + pulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + pulse * 0.5})`;
      ctx.lineWidth   = 4;
      ctx.stroke();
      ctx.restore();
    }

    super.draw(ctx, now);
    this._drawPuddleGauge(ctx, now);
  }

  _drawPuddleGauge(ctx, now) {
    const t = this.puddleQueue > 0
      ? 1
      : Math.min(this.puddleTimer / this.puddleInterval, 1);

    ctx.save();

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.2)';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.stroke();

    if (this.puddleQueue > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(now * 0.01);
      ctx.strokeStyle = `rgba(0, 220, 255, ${pulse})`;
    } else {
      ctx.strokeStyle = `hsl(${200 + t * 20}, 100%, ${50 + t * 10}%)`;
    }

    ctx.lineWidth = 4;
    ctx.lineCap   = 'round';
    ctx.beginPath();
    ctx.arc(
      this.x, this.y,
      this.radius + 6,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * t
    );
    ctx.stroke();

    if (this.puddleQueue > 0) {
      ctx.fillStyle = '#0a0a0a';
      ctx.font      = 'bold 20px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(`💧${this.puddleQueue}`, this.x, this.y - this.radius - 30);
    }

    if (this.isRampage) {
      ctx.fillStyle = '#00cfff';
      ctx.font      = 'bold 16px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('💧 폭주 중', this.x, this.y - this.radius - 50);
    }

    ctx.restore();
  }

  async _loadSounds() {
    await soundManager.load('고선호_유기화학', './assets/sounds/고선호_유기화학.mp3');
    await soundManager.load('WaterSplash',    './assets/sounds/WaterSplash.ogg');
    await soundManager.load('고선호_폭주',    './assets/sounds/고선호_폭주.mp3');
    await soundManager.load('WaterExplode',   './assets/sounds/Ex1.ogg');
  }
}
