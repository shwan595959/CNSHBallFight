import { Ball } from '../core/Ball.js';
import { soundManager } from '../core/SoundManager.js';
import { FloatingText } from '../core/Effects.js'

// =====================
// BasketballEffect (농구공 페이드아웃 이펙트)
// =====================
class BasketballEffect {
  constructor(x, y, radius, image) {
    this.x       = x;
    this.y       = y;
    this.radius  = radius;
    this.image   = image;
    this.alpha   = 0.8;
    this.scale   = 1.0;
    this.dead    = false;
  }

  update() {
    this.scale += 0.05;
    this.alpha -= 0.04;
    if (this.alpha <= 0) this.dead = true;
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const r = this.radius * this.scale;
    ctx.drawImage(this.image, this.x - r, this.y - r, r * 2, r * 2);
    ctx.restore();
  }
}

// =====================
// AfterImage (잔상 이펙트)
// =====================
class AfterImage {
  constructor(x, y, radius, color, alpha, image) {
    this.x      = x;
    this.y      = y;
    this.radius = radius;
    this.color  = color;
    this.alpha  = alpha;
    this.dead   = false;
  }

  update() {
    this.alpha -= 0.02;
    if (this.alpha <= 0) this.dead = true;
  }

  isDead() { return this.dead; }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    ctx.restore();
  }
}

// =====================
// BasketballBall (메인 공)
// =====================
export class ParkMinjunBall extends Ball {
  constructor(x, y, id) {
    super(x, y, {
      hp    : 290,
      speed : 4.0,
      radius: 40,
      mass  : 3.0,
      color : '#e67e22',
      name  : '박민준',
      id,
      image: './assets/image/박민준이미지.jpg'
    });

    // 콤보
    this.combo          = 0;
    this.maxCombo       = 10;
    this.comboInterval  = 3000;   // 3초마다 콤보 +1
    this.lastComboTime  = 0;

    // 기본 수치
    this.baseSpeed      = 4.0;
    this.baseDamage     = 12;

    // 잔상
    this.afterImages        = [];
    this.afterImageTimer    = 0;
    this.afterImageInterval = 80; // ms

    // 페이드아웃 이펙트
    this.basketballEffects  = [];
    this.lastEffectTime     = 0;
    this.effectInterval     = 3000; // 콤보 쌓일 때마다 발생

    // 이미지 로드
    this.image       = new Image();
    this.image.src   = './assets/image/농구공.png';
    this.imageLoaded = false;
    this.image.onload = () => { this.imageLoaded = true; };

    this.appeared = false; // 처음엔 이미지 숨김
this.imageAlpha = 0;   // 이미지 투명도

this._loadSounds();
  }

  get currentSpeed() {
    // 콤보에 비례해서 속도 증가 (콤보 7 → 속도 2배)
    return this.baseSpeed * (1 + (this.combo / this.maxCombo));
  }

  get currentDamage() {
    // 지수적 데미지 증가 (콤보 7 → 약 12.8배)
    return this.baseDamage * Math.pow(2, this.combo * 0.5);
  }

  update(dt, now, allBalls, effects) {
    super.update(dt, now, allBalls, effects);

    // 콤보 증가
    if (now - this.lastComboTime >= this.comboInterval) {
  this.lastComboTime = now;
  if (this.combo < this.maxCombo) {
    this.combo++;
    this.appeared = true; // ✅ 첫 콤보 때 등장

    this.basketballEffects.push(
      new BasketballEffect(this.x, this.y, this.radius, this.image)
    );
    soundManager.play("Upgrade");
  }
}

// 이미지 알파 서서히 증가
if (this.appeared && this.imageAlpha < 1) {
  this.imageAlpha = Math.min(1, this.imageAlpha + 0.01);
}

    // 속도 반영
    this.speed = this.currentSpeed;

    // 잔상 생성 (콤보가 높을수록 자주)
    this.afterImageTimer += dt;
    const interval = this.afterImageInterval * (1 - (this.combo / this.maxCombo) * 0.7);
    if (this.afterImageTimer >= interval) {
      this.afterImageTimer = 0;
      const alpha = 0.15 + (this.combo / this.maxCombo) * 0.35;
      this.afterImages.push(
  new AfterImage(this.x, this.y, this.radius, this.color, alpha, this.image) // ✅ this.image 추가
);
    }

    // 잔상 업데이트
    this.afterImages.forEach(a => a.update());
    this.afterImages = this.afterImages.filter(a => !a.isDead());

    // 페이드아웃 이펙트 업데이트
    this.basketballEffects.forEach(e => e.update());
    this.basketballEffects = this.basketballEffects.filter(e => !e.isDead());

    // 충돌 데미지 처리
    for (const b of allBalls) {
      if (b === this || b.dead) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      if (d < this.radius + b.radius) {
        const key     = `bb_${this.id}_${b.id}`;
        const lastHit = this._hitCooldowns?.[key] ?? -Infinity;
        if (now - lastHit >= 500) {
          if (!this._hitCooldowns) this._hitCooldowns = {};
          this._hitCooldowns[key] = now;

          b.takeDamage(this.currentDamage, effects);
          soundManager.play("SavageBlow");
          

          // 콤보 감소
          if (this.combo > 0) {
            this.combo--;
            // 콤보 감소 시 플로팅 텍스트
            effects.push(new FloatingText(
              this.x, this.y-50,
              `COMBO ${this.combo + 1}→${this.combo}`,
              '#e67e22', 14
            ));
          }
        }
      }
    }
  }

  draw(ctx, now) {
  if (this.dead) return;

  // 1. 잔상 (가장 뒤)
  for (const a of this.afterImages) {
    a.draw(ctx);
  }

  // 2. 페이드아웃 복제본 이펙트
  for (const e of this.basketballEffects) {
    e.draw(ctx);
  }

  // 3. super.draw (이름, 체력바, 본체 이미지 등)
  super.draw(ctx, now); // ✅ 이거 추가

  // 4. 콤보 텍스트
  if (this.combo > 0) {
    ctx.save();
    ctx.font        = `bold ${12 + this.combo * 2}px Arial`;
    ctx.fillStyle   = '#f39c12';
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 3;
    ctx.textAlign   = 'center';
    const text = `🔥 ${this.combo} COMBO`;
    ctx.strokeText(text, this.x, this.y - this.radius + 20);
    ctx.fillText(text, this.x, this.y - this.radius + 20);
    ctx.restore();
  }

  // 5. 콤보 게이지
  let p = 0; if (this.combo < 10) {p = 1} else {p = 0}

  const t = p * Math.min(1, (now - this.lastComboTime) / this.comboInterval); // ✅ 시간 경과 비율
ctx.save();
ctx.strokeStyle = `hsl(${30 - t * 30}, 100%, 50%)`;
ctx.lineWidth   = 4;
ctx.beginPath();
ctx.arc(
  this.x, this.y,
  this.radius + 6,
  -Math.PI / 2,
  -Math.PI / 2 + Math.PI * 2 * t
);
ctx.stroke();
ctx.restore();
}

async _loadSounds() {
    await soundManager.load("Upgrade", "./assets/sounds/Upgrade.mp3")
    await soundManager.load("SavageBlow", "./assets/sounds/SavageBlow.mp3")
  }
}
