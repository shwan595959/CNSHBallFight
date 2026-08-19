import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText } from '../core/Effects.js';
import { FIELD_H, FIELD_W } from '../game.js';

// ── 투사체 ──
class ZimbabweProjectile {
  constructor(x, y, angle, damage) {  // ✅ damage 외부에서 받음
    this.x = x;
    this.y = y;
    const speed = 12;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.damage = damage;  // ✅ 외부에서 받은 데미지 사용
    this.dead   = false;

    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.3;

    // 잔상
    this.trail = [];
  }

  update(allBalls, effects) {
    if (this.dead) return;

    // 잔상
    this.trail.push({ x: this.x, y: this.y, alpha: 0.4 });
    if (this.trail.length > 8) this.trail.shift();
    this.trail.forEach(t => (t.alpha -= 0.05));

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;

    // 충돌 감지
    const moneyTexts = ['💸 파산!', '💰 강탈!', '🤑 돈벼락!', '📉 폭락!', '💵 인플레!'];
    for (const b of allBalls) {
      if (b.dead) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d < this.radius + b.radius) {
        soundManager.play("Money");
        b.takeDamage(this.damage, effects);
        const txt = moneyTexts[Math.floor(Math.random() * moneyTexts.length)];
        effects.push(new FloatingText(
          b.x, b.y - b.radius - 10,
          txt, '#f1c40f', 20, 3.0
        ));
        this.dead = true;
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
      ctx.arc(t.x, t.y, this.radius * 1, 0, Math.PI * 2);
      ctx.fillStyle = '#85bb65';
      ctx.fill();
      ctx.restore();
    }

    // 짐바브웨 달러 (초록 동전)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // 동전 몸통
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#85bb65';
    ctx.fill();
    ctx.strokeStyle = '#4a7c3f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 달러 기호
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this.radius}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z$', 0, 0);

    ctx.restore();
  }
}

// ── 공 ──
export class ZimbabweBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 230,
      speed : 2.5,
      radius: 36,
      mass  : 2.0,
      color : '#85bb65',
      name  : '이재용',
      id,
      image : './assets/image/이재용임시이미지.png'
    });

    this.skillCooldown = 6500;
    this.lastSkillTime = 0;

    // 제채기 연출
    this.phase      = 'idle';
    this.phaseTimer = 0;
    this.sneezeDuration = 800;
    this.shootDone  = false;

    // 투사체 개수
    this.bulletCount = 12;

    // ✅ 데미지 시스템
    this.baseDamage    = 35;           // 기준 데미지
    this.currentDamage = 35;           // 현재 데미지
    this.minDamage     = 1;           // 최소 데미지
    this.maxDamage     = 100;           // 최대 데미지

    this._loadSounds();

    this.projectiles = [];
  }

  // ✅ 다음 데미지 랜덤 결정 + 상승/하락 텍스트 표시
  _rollNextDamage(effects) {
    const prevDamage   = this.currentDamage;
    this.currentDamage = Math.floor(
      this.minDamage + Math.random() * (this.maxDamage - this.minDamage)
    );

    const diff = this.currentDamage - prevDamage;

    if (diff > 0) {
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 90,
        `📈 데미지 상승! (${this.currentDamage})`, '#e74c3c', 20, 3.0
      ));
    } else if (diff < 0) {
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 90,
        `📉 데미지 하락! (${this.currentDamage})`, '#3498db', 20, 3.0
      ));
    } else {
      effects.push(new FloatingText(
        this.x, this.y - this.radius - 90,
        `➡️ 데미지 유지! (${this.currentDamage})`, '#95a5a6', 18, 3.0
      ));
    }
  }

  update(dt, now, allBalls, effects) {
    // 투사체 업데이트
    const others = allBalls.filter(b => b !== this && !b.dead);
    this.projectiles.forEach(p => p.update(others, effects));
    this.projectiles = this.projectiles.filter(p => !p.isDead());

    this.phaseTimer += dt;

    if (this.phase === 'idle') {
      super.update(dt, now, allBalls, effects);

      if (now - this.lastSkillTime >= this.skillCooldown) {
        this._startSneeze(effects);
      }

    } else if (this.phase === 'sneeze') {
      this.vx = 0;
      this.vy = 0;

      if (this.phaseTimer >= this.sneezeDuration * 0.4 && !this.shootDone) {
        this._doShoot(allBalls, effects, now);
        this.shootDone = true;
      }

      if (this.phaseTimer >= this.sneezeDuration) {
        this._endSkill(now);
      }
    }
  }

  _startSneeze(effects) {
    this.phase      = 'sneeze';
    this.phaseTimer = 0;
    this.shootDone  = false;

    soundManager.play("재채기");

    effects.push(new FloatingText(
      this.x, this.y - this.radius - 30,
      '🤧 에취!!', '#ffffff', 28, 2.5
    ));
  }

  _doShoot(allBalls, effects, now) {
    // ✅ 현재 데미지로 투사체 발사
    for (let i = 0; i < this.bulletCount; i++) {
      const angle = (Math.PI * 2 / this.bulletCount) * i;
      this.projectiles.push(new ZimbabweProjectile(this.x, this.y, angle, this.currentDamage));
    }

    // 반동
    const recoilAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(recoilAngle) * 6;
    this.vy = Math.sin(recoilAngle) * 6;
    // ✅ 발사 후 다음 데미지 결정
    this._rollNextDamage(effects);
  }

  _endSkill(now) {
    this.phase         = 'idle';
    this.phaseTimer    = 0;
    this.lastSkillTime = now;
  }

  draw(ctx, now) {
    if (this.dead) return;

    for (const p of this.projectiles) p.draw(ctx);

    // 제채기 중 흔들림
    ctx.save();
    if (this.phase === 'sneeze') {
      const shake = Math.sin(this.phaseTimer * 0.08) * 4;
      ctx.translate(shake, 0);
    }
    super.draw(ctx, now);
    ctx.restore();

// draw() 안에
ctx.save();
ctx.font         = 'bold 25px Arial';
ctx.textAlign    = 'center';
ctx.textBaseline = 'middle';

// 상승/하락 아이콘 + 텍스트 결정
const diff = this.currentDamage - this.baseDamage;
let dmgIcon, dmgLabel, dmgColor;

if (diff > 0) {
  dmgIcon  = '📈';
  dmgLabel = '데미지 상승!';
  dmgColor = '#e74c3c';
} else if (diff < 0) {
  dmgIcon  = '📉';
  dmgLabel = '데미지 하락!';
  dmgColor = '#3498db';
} else {
  dmgIcon  = '➡️';
  dmgLabel = '데미지 유지!';
  dmgColor = '#95a5a6';
}

ctx.fillStyle = dmgColor;
ctx.fillText(
  `${dmgIcon} ${dmgLabel} 현재: ${this.currentDamage}`,
  this.x, this.y + this.radius - 120
);
ctx.restore();
    // 쿨타임 게이지
    const elapsed = now - this.lastSkillTime;
    const cooldownProgress = this.phase !== 'idle'
      ? 0
      : Math.min(1, elapsed / this.skillCooldown);

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
  }

    async _loadSounds() {
    await soundManager.load("재채기", "./assets/sounds/재채기.mp3");
    await soundManager.load("Money",  "./assets/sounds/Money.mp3");
  }
}
