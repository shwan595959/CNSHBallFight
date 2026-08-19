import { Ball, Utils } from '../core/Ball.js';
import { Skill } from '../core/Skill.js';
import { Particle, RingEffect, FloatingText } from '../core/Effects.js';

// 💚 힐러: 가시 갑옷 - 일정 시간 동안 자신을 공격한 적에게 반사 데미지
export class HealBall extends Ball {
  constructor(x, y, id) {
    super(x, y, { hp: 100, speed: 2.0, radius: 21, mass: 1.1, color: '#00FF7F', name: '힐러', id });
    this.thornActive  = false;
    this.thornTimer   = 0;
    this.thornDuration = 4000; // 4초
    this.regenTimer   = 0;

    this.skills = [
      new Skill('가시 갑옷', '🌿', (caster, allBalls, effects) => {
        caster.thornActive = true;
        caster.thornTimer  = 0;
        caster.heal(20, effects);
        caster.shield    = 40;
        caster.maxShield = 40;
        effects.push(new RingEffect(caster.x, caster.y, '#00FF7F', 70));
        effects.push(new FloatingText(caster.x, caster.y - 30, '🌿 가시 갑옷!', '#00FF7F', 16));
      }),
    ];
  }

  // 데미지 받을 때 반사
  takeDamage(amount, effects, attacker) {
    if (this.thornActive && attacker && !attacker.dead) {
      const reflect = amount * 0.6;
      attacker.takeDamage(reflect, effects);
      if (effects) {
        effects.push(new FloatingText(
          attacker.x, attacker.y - 20,
          `↩${reflect.toFixed(0)}`, '#00FF7F', 13
        ));
      }
    }
    super.takeDamage(amount, effects);
  }

  update(dt, now, allBalls, effects) {
    // 가시 갑옷 타이머
    if (this.thornActive) {
      this.thornTimer += dt;
      if (this.thornTimer >= this.thornDuration) {
        this.thornActive = false;
      }
    }

    // 지속 재생 (3초마다 5 회복)
    this.regenTimer += dt;
    if (this.regenTimer >= 3000) {
      this.regenTimer = 0;
      this.heal(5, effects);
    }

    super.update(dt, now, allBalls, effects);
  }

  draw(ctx, now) {
    // 가시 갑옷 시각화
    if (this.thornActive) {
      const spikes = 8;
      ctx.save();
      ctx.strokeStyle = '#00FF7F';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#00FF7F';
      ctx.shadowBlur  = 10;
      for (let i = 0; i < spikes; i++) {
        const a  = (i / spikes) * Math.PI * 2 + now * 0.002;
        const r1 = this.radius + 6;
        const r2 = this.radius + 16;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
        ctx.lineTo(this.x + Math.cos(a) * r2, this.y + Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }
    super.draw(ctx, now);
  }
}
