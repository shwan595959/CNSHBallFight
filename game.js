import { SelectScreen }  from './ui/SelectScreen.js';
import { resolveCollision } from './core/Physics.js';
import { RingEffect, Particle, FloatingText } from './core/Effects.js';
import { Utils } from './core/Ball.js';
import { EliminationBanner } from './core/EliBanner.js';
import { soundManager } from './core/SoundManager.js';

export let FIELD_W = 700;
export let FIELD_H = 500;

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 1200;
canvas.height = 800;

function fitGameScreen() {
  const gameScreen = document.getElementById('game-screen');
  if (gameScreen.classList.contains('hidden')) return;

  // ✅ offsetWidth 대신 canvas 크기 기준으로 계산
  const totalW = canvas.width + 40 + 40;  // padding 20px * 2 + 여백
  const totalH = canvas.height + 40 + 40 + 100; // padding + 상단 UI 높이

  const scaleX = window.innerWidth / totalW;
  const scaleY = window.innerHeight / totalH;
  const scale = Math.min(scaleX, scaleY, 1);

  gameScreen.style.transformOrigin = 'top center';
  gameScreen.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitGameScreen);

const BATTLEFIELD_SIZES = {
  small:  { w: 700,  h: 500  },
  medium: { w: 1000, h: 700  },
  large:  { w: 1400, h: 900  },
  xlarge: { w: 2100, h: 1400 },
};

// 기준 크기 (medium) 대비 비율로 스폰 위치 계산
const BASE_W = 1000;
const BASE_H = 700;

const BASE_SPAWN_POSITIONS = [
  [120, 100], [450,  60], [780, 100],
  [ 60, 275], [840, 275],
  [120, 450], [450, 490], [780, 450],
];

function getSpawnPositions(w, h) {
  return BASE_SPAWN_POSITIONS.map(([x, y]) => [
    Math.round(x / BASE_W * w),
    Math.round(y / BASE_H * h),
  ]);
}

class Game {
  constructor() {
    this.balls        = [];
    this.effects      = [];
    this.running      = false;
    this.paused       = false;
    this.animId       = null;
    this.lastTime     = 0;
    this.gameStart    = 0;
    this.rankCounter  = 0;
    this.results      = [];
    this.dmgCooldowns = {};

    this.W = canvas.width;
    this.H = canvas.height;

    this.banner = new EliminationBanner(ctx, this.W, this.H)

    

    this._loadSounds();

    this.bindControls();
    new SelectScreen((selectedInfos, battlefieldSize) => this.start(selectedInfos, battlefieldSize));

    document.getElementById('restart-btn').addEventListener('click', () => {
      document.getElementById('overlay').classList.add('hidden');
      document.getElementById('game-screen').classList.add('hidden');
      document.getElementById('select-screen').classList.remove('hidden');
      new SelectScreen((selectedInfos, battlefieldSize) => this.start(selectedInfos, battlefieldSize));
    });
  }

  bindControls() {
    document.getElementById('pause-btn')
      .addEventListener('click', () => this.togglePause());
    document.getElementById('stop-btn')
      .addEventListener('click', () => this.confirmStop());
    document.getElementById('confirm-yes')
      .addEventListener('click', () => this.forceStop());
    document.getElementById('confirm-no')
      .addEventListener('click', () => this.closeConfirm());
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;

    const btn     = document.getElementById('pause-btn');
    const overlay = document.getElementById('pause-overlay');

    if (this.paused) {
      btn.textContent = '▶ 재개';
      btn.classList.add('paused');
      overlay.classList.remove('hidden');
    } else {
      btn.textContent = '⏸ 일시정지';
      btn.classList.remove('paused');
      overlay.classList.add('hidden');
      this.lastTime = performance.now();
      this.animId   = requestAnimationFrame(t => this.loop(t));
    }
  }



  confirmStop() {
    if (!this.running) return;
    if (!this.paused) this.togglePause();
    document.getElementById('confirm-modal').classList.remove('hidden');
  }

  closeConfirm() {
    document.getElementById('confirm-modal').classList.add('hidden');
    if (this.paused) this.togglePause();
  }

  forceStop() {
    document.getElementById('confirm-modal').classList.add('hidden');
    this.stop();
  }

  stop() {
    this.running = false;
    this.paused  = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    document.getElementById('pause-btn').textContent = '⏸ 일시정지';
    document.getElementById('pause-btn').classList.remove('paused');
    document.getElementById('pause-overlay').classList.add('hidden');

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    new SelectScreen((selectedInfos, battlefieldSize) => this.start(selectedInfos, battlefieldSize));
  }

 start(selectedInfos, battlefieldSize = { w: 700, h: 500 }) {
FIELD_W = battlefieldSize.w;
  FIELD_H = battlefieldSize.h;

  console.log('battlefieldSize 받은 값:', battlefieldSize); // ✅ 추가
  console.log('버튼 클릭된 크기:', battlefieldSize.w, battlefieldSize.h); // ✅ 추가
  this.running = false;
  this.paused  = false;
  if (this.animId) {
    cancelAnimationFrame(this.animId);
    this.animId = null;
  }

  // ✅ canvas 크기 변경
  canvas.width  = battlefieldSize.w;
  canvas.height = battlefieldSize.h;
  this.W = battlefieldSize.w;
  this.H = battlefieldSize.h;

  canvas.style.width  = battlefieldSize.w + 'px';
  canvas.style.height = battlefieldSize.h + 'px';

  // ✅ wrapper 크기도 맞춰줌
  const wrapper = document.getElementById('canvas-wrapper');
  wrapper.style.width  = battlefieldSize.w + 'px';
  wrapper.style.height = battlefieldSize.h + 'px';

  // ✅ banner도 새 크기로 재생성
  this.banner = new EliminationBanner(ctx, this.W, this.H);

  this.balls        = [];
  this.effects      = [];
  this.rankCounter  = 0;
  this.results      = [];
  this.dmgCooldowns = {};
const SPAWN_POSITIONS = getSpawnPositions(this.W, this.H);

selectedInfos.forEach((info, i) => {
  const [x, y] = SPAWN_POSITIONS[i % SPAWN_POSITIONS.length];
  const sx = Math.min(x, this.W - 60);
  const sy = Math.min(y, this.H - 60);
  const ball = new info.Class(sx, sy, i);
  this.balls.push(ball);
});

  this.lastTime  = performance.now();
  this.gameStart = performance.now();

  document.getElementById('game-status').textContent = '⚔️ 세기의 대결이 시작되었다.';
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('pause-btn').textContent = '⏸ 일시정지';
  document.getElementById('pause-btn').classList.remove('paused');
  document.getElementById('pause-overlay').classList.add('hidden');

  this.updateScoreboard();

  this.running = true;
  this.animId  = requestAnimationFrame(t => this.loop(t));

  // ✅ DOM 반영 기다린 후 fitGameScreen 실행
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fitGameScreen();
    });
  });

  console.log(canvas.width, canvas.height)
}



  // ✅ 핵심 수정: 루프 상태를 하나의 플래그로만 제어
  loop(timestamp) {
    // 이 루프가 유효한지 체크 (stop/forceStop 등으로 animId가 바뀌었으면 중단)
    if (!this.running && this.effects.length === 0) return;
    if (this.paused) return;

    const dt  = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;
    const now = timestamp - this.gameStart;

    if (this.running) {
      this.update(dt, now);
    } else {
      // running=false 이후엔 이펙트만 업데이트
      this.effects.forEach(e => e.update());
      this.effects = this.effects.filter(e => !e.isDead());
    }

    this.draw(now);

    // 계속 돌릴지 판단
    if (this.running || this.effects.length > 0) {
      this.animId = requestAnimationFrame(t => this.loop(t));
    } else {
      // 이펙트까지 다 소진 → 완전 종료
      this.animId = null;
    }
  }

  update(dt, now) {
    this.balls.forEach(b => b.update(dt, now, this.balls, this.effects));

    for (let iter = 0; iter < 10; iter++) {
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const a = this.balls[i];
          const b = this.balls[j];
          if (a.dead || b.dead) continue;
          resolveCollision(a, b);
        }
      }
    }

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        if (a.dead || b.dead) continue;

        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < a.radius + b.radius + 1) {
          const key     = `${Math.min(a.id, b.id)}_${Math.max(a.id, b.id)}`;
          const lastHit = this.dmgCooldowns[key] ?? 0;
          if (now - lastHit >= 500) {
            this.dmgCooldowns[key] = now;
          }
        }
      }
    }

    this.balls.forEach(b => {
      if (b.dead && b.rank === null) {
        this.rankCounter++;
        b.rank = this.rankCounter;
        this.results.unshift({ name: b.name, color: b.color, rank: b.rank });
        this.updateScoreboard();

this.banner.show(b.name);

        for (let i = 0; i < 30; i++) {
          this.effects.push(new Particle(
            b.x, b.y, b.color,
            Utils.randRange(-8, 8), Utils.randRange(-8, 8),
            Utils.randRange(4, 10), 1.0
          ));
        }
        this.effects.push(new FloatingText(b.x, b.y, '💀 탈락!', '#FF6B6B', 18, 3));
      }
    });

    this.balls = this.balls.filter(b => !b.dead);

    this.effects.forEach(e => e.update());
    this.effects = this.effects.filter(e => !e.dead);

    // ✅ checkWin은 update 맨 마지막에 호출
    // running을 false로만 바꾸고 루프 제어는 loop()에게 맡김
    this.checkWin();
  }

  checkWin() {
    if (!this.running || this.balls.length > 1) return;
    if (this.gameEnding) return;

    this.gameEnding = true;

    const title = document.getElementById('result-title');
    const sub   = document.getElementById('result-sub');

    if (this.balls.length === 1) {
      const w = this.balls[0];
      title.textContent = `🏆 ${w.name} ㅊㅋㅊㅋ`;
      title.style.color = w.color;
      sub.textContent   = `HP ${Math.ceil(w.hp)} / ${w.maxHp} 남음`;
      for (let i = 0; i < 50; i++) {
        this.effects.push(new Particle(
          w.x, w.y, w.color,
          Utils.randRange(-10, 10), Utils.randRange(-10, 10),
          Utils.randRange(4, 12), 1.2
        ));
      }
    } else {
      title.textContent = '🤝 무승부!';
      title.style.color = '#FFD700';
      sub.textContent   = '어우 접전인데요?';
    }

    // ✅ UI + running 모두 3초 후에
    setTimeout(() => {
      this.running = false;
      this.gameEnding = false;

      document.getElementById('overlay').classList.remove('hidden');
      document.getElementById('game-status').textContent = '종료';
      document.getElementById('pause-btn').textContent = '⏸ 일시정지';
      document.getElementById('pause-btn').classList.remove('paused');
      document.getElementById('pause-overlay').classList.add('hidden');
    }, 2500);
  }

  updateScoreboard() {
    const el = document.getElementById('scoreboard');
    if (!el) return;
    el.innerHTML = this.results.map(r =>
      `<div class="score-item" style="color:${r.color}">
        💀 ${r.rank}위 탈락: ${r.name}
      </div>`
    ).join('');
  }

  draw(now) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.strokeStyle = 'rgba(190, 185, 185, 0.03)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < this.W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }

    this.effects.forEach(e => { if (e instanceof RingEffect) e.draw(ctx); });
    this.balls.forEach(b => b.draw(ctx, now));
    this.effects.forEach(e => { if (!(e instanceof RingEffect)) e.draw(ctx); });

    this.banner.update();
    this.banner.draw();
  }

  async _loadSounds() {
      await soundManager.load("BarrierBreaker", "./assets/sounds/BarrierBreaker.mp3");
  }
}

window.addEventListener('load', () => new Game());
