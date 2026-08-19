import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText, shockwaveEffect } from '../core/Effects.js';

export class LimjihuBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 220,
      speed : 2.0,
      radius: 44,
      mass  : 2.0,
      color : '#f39c12',
      name  : '임지후',
      id,
      image : './assets/image/임지후이미지.jpg'
    });

    // 추격 설정
    this.chaseRange    = 400;   // 추격 시작 범위
    this.attackRange   = 80;    // 공격 범위
    this.attackCooldown = 1500; // 2초마다 공격
    this.lastAttackTime = 0;

    // 스킬 상태
    this.isChasing     = false;
    this.target        = null;

    // 이펙트
    this.shockwaves    = [];

    this._loadSounds();
  }

  _getNearestTarget(allBalls) {
    const candidates = allBalls
      .filter(b => b !== this && !b.dead)
      .map(b => ({ b, d: Math.hypot(b.x - this.x, b.y - this.y) }))
      .sort((a, z) => a.d - z.d);

    return candidates.length > 0 ? candidates[0].b : null;
  }

  _attack(target, allBalls, effects, now) {
    const roll = Math.random();

    // ── 1% 확률: 전체 즉사 ──
    if (roll < 0.01) {
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 60,
        '💀 고백 성공!!', '#20a306', 28, 8.0
      ));

      this.shockwaves.push(new shockwaveEffect(this.x, this.y));

      allBalls
        .filter(b => b !== this && !b.dead)
        .forEach(b => {
          b.takeDamage(100000, 0, true);
          effects.push(new FloatingText(
            b.x, b.y - b.radius - 20,
            '💀 패배자', '#e74c3c', 35, 3.5
          ));
        });

      soundManager.play("Jackpot");

    // ── 99% 확률: 단일 타겟 데미지 + 자신 회복 ──
    } else {
      let damage = 10 + Math.floor(Math.random() * 20); // 40~60 데미지
      const heal = 5 + Math.floor(Math.random() * 10); // 20~30 회복

      // ✅ 최시형에게 2배 데미지
      if (target.name === '최시형') {
        damage *= 2;
        effects.push(new FloatingText(
          target.x, target.y - target.radius - 80,
          '대참사!', '#f39c12', 40, 5
        ));
      }

      target.hp = Math.max(0, target.hp - damage);
      if (target.hp <= 0) target.dead = true;

      this.hp = Math.min(this.maxHp, this.hp + heal);

      effects.push(new FloatingText(
        target.x, target.y - target.radius - 20,
        `-${damage} 고백 까임! 💥`, '#e74c3c', 27, 4.5
      ));
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 20,
        `+${heal} 💚`, '#2ecc71', 20
      ));

      this.shockwaves.push(new shockwaveEffect(target.x, target.y));
      soundManager.play("BarrierCrack");
    }

    this.lastAttackTime = now;
  }


  update(dt, now, allBalls, effects) {
    const onCooldown = now - this.lastAttackTime < this.attackCooldown;

    // ✅ 쿨타임 중엔 Ball.js의 랜덤 이동 막기
    this.manualControl = onCooldown;

    // 충격파 업데이트
    this.shockwaves.forEach(s => s.update(dt));
    this.shockwaves = this.shockwaves.filter(s => !s.dead);

    this.target = this._getNearestTarget(allBalls);

    if (onCooldown) {
      this.isChasing = false;
      this.vx = 0;
      this.vy = 0;

    } else if (this.target) {
      const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);

      if (dist <= this.chaseRange) {
        this.isChasing = true;
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const keepDistance = this.radius + this.target.radius + 20;
        const deadZone = 5;

        if (dist > keepDistance + deadZone) {
          this.vx = Math.cos(angle) * this.speed * 1.5;
          this.vy = Math.sin(angle) * this.speed * 1.5;
        } else if (dist < keepDistance - deadZone) {
          this.vx = -Math.cos(angle) * this.speed;
          this.vy = -Math.sin(angle) * this.speed;
        } else {
          this.vx = 0;
          this.vy = 0;
        }
      } else {
        this.isChasing = false;
      }

      const attackDist = this.radius + this.target.radius + 50;
      if (dist <= attackDist) {
        this._attack(this.target, allBalls, effects, now);
      }
    }

    super.update(dt, now, allBalls, effects);

    // ✅ super.update 이후에도 쿨타임이면 강제 정지
    if (onCooldown) {
      this.vx = 0;
      this.vy = 0;
    }
  }




  draw(ctx, now) {
    if (this.dead) return;

    for (const s of this.shockwaves) s.draw(ctx);

    // 추격 중일 때 주황 아우라
    if (this.isChasing) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(now / 150); // 맥박 효과
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(243, 156, 18, ${0.4 + pulse * 0.4})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 공격 범위 표시 (반투명 원)
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();

    // 쿨타임 게이지
    const cooldownProgress = Math.min(1, (now - this.lastAttackTime) / this.attackCooldown);
    if (cooldownProgress < 1) {
      ctx.save();
      ctx.strokeStyle = `hsl(${cooldownProgress * 120}, 100%, 50%)`;
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
    await soundManager.load("BarrierCrack", "./assets/sounds/BarrierCrack.ogg");
    await soundManager.load("Jackpot",  "./assets/sounds/Obtain.ogg");
  }
}
