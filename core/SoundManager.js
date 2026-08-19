export class SoundManager {
  constructor() {
    this.ctx    = null; // ← 일단 null
    this.sounds = {};
    this.decoded = {};
  }

  // 사용자 제스처 후 처음 호출될 때 생성
  _getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  async load(name, url) {
  try {
    this._promises = this._promises || {};
    this._promises[name] = (async () => {
      const res    = await fetch(url);
      const buffer = await res.arrayBuffer();
      // ✅ decode 안 함, buffer만 저장
      this.sounds[name] = buffer;
    })();

    await this._promises[name];
  } catch (e) {
    console.warn(`[SoundManager] ${name} 로드 실패:`, e);
  }
}

async play(name, volume = 1.0) {
  try {
    // ✅ 아직 로딩 중이면 대기
    if (this._promises?.[name]) {
      await this._promises[name];
    }

    const buffer = this.sounds[name];
    if (!buffer) {
      console.warn(`[SoundManager] '${name}' 소리 없음`);
      return;
    }

    // ✅ 사용자 제스처 이후 ctx 생성 보장
    const ctx = this._getCtx();

    // ✅ resume (브라우저가 suspended 시켜놨을 수 있음)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // ✅ decode는 play 시점에 (ctx 확실히 살아있을 때)
    if (!this.decoded[name]) {
      this.decoded[name] = await ctx.decodeAudioData(buffer.slice(0));
    }

    const source = ctx.createBufferSource();
    const gain   = ctx.createGain();
    gain.gain.value = volume;

    source.buffer = this.decoded[name];
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) {
    console.warn(`[SoundManager] '${name}' 재생 실패:`, e);
  }
}


  // ─────────────────────────────────────
  // 코드로 만든 소리들 (재활용 가능)
  // ─────────────────────────────────────

  // 음파 소리 (낮은 진동음)
  playSonic(volume = 0.5) {
  const ctx  = this._getCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type      = 'sine';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.8);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}

playDash(volume = 0.4) {
  const ctx        = this._getCtx();
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data       = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain   = ctx.createGain();

  filter.type            = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value         = 0.5;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

playHit(volume = 0.6) {
  const ctx  = this._getCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type      = 'square';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

playSlow(volume = 0.3) {
  const ctx  = this._getCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type      = 'triangle';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}



}

// 전역 싱글톤으로 사용
export const soundManager = new SoundManager();