
export class EliminationBanner {
  constructor(ctx, canvasWidth, canvasHeight) {
    this.ctx          = ctx;
    this.canvasWidth  = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.queue        = []; // 여러 명 탈락 대비
    this.current      = null;
  }

  show(name) {
    this.queue.push(name);
    if (!this.current) this._next();
  }

  _next() {
    if (this.queue.length === 0) { this.current = null; return; }

    const name = this.queue.shift();
    this.current = {
      name,
      x:       -600,        // 시작 위치 (왼쪽 밖)
      targetX: this.canvasWidth / 2, // 멈출 위치 (가운데)
      phase:   'enter',     // enter → hold → exit
      holdTimer: 0,
      holdDuration: 80,     // 가운데 멈추는 시간 (프레임)
      speed: 60,            // 이동 속도
      alpha: 1,
    };
  }

  update() {
    const c = this.current;
    if (!c) return;

    if (c.phase === 'enter') {
      // 왼쪽 → 가운데 빠르게 이동
      c.x += (c.targetX - c.x) * 0.25;
      if (Math.abs(c.x - c.targetX) < 2) {
        c.x = c.targetX;
        c.phase = 'hold';
      }

    } else if (c.phase === 'hold') {
      // 가운데 멈춤
      c.holdTimer++;
      if (c.holdTimer >= c.holdDuration) {
        c.phase = 'exit';
      }

    } else if (c.phase === 'exit') {
      // 가운데 → 오른쪽 밖으로 빠르게 이동
      c.x += c.speed;
      c.speed *= 1.15; // 점점 빨라짐
      if (c.x > this.canvasWidth + 600) {
        this._next(); // 다음 탈락자
      }
    }
  }

  draw() {
    
    const c = this.current;
    if (!c) return;

    const ctx = this.ctx;
    const y   = this.canvasHeight * 0.2; // 화면 위쪽 20% 위치

    ctx.save();

    // 배경 바
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(c.x - this.canvasWidth / 2, y - 55, this.canvasWidth, 90);

    // 테두리 라인
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth   = 3;
    ctx.strokeRect(c.x - this.canvasWidth / 2, y - 55, this.canvasWidth, 90);

    // 텍스트
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // 이름
    ctx.font      = 'bold 52px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`💀 ${c.name} 탈락! 💀`, c.x, y);

    // 그림자 효과
    ctx.shadowColor   = '#ff0000';
    ctx.shadowBlur    = 20;
    ctx.fillStyle     = '#ff4444';
    ctx.font          = 'bold 52px Arial';
    ctx.fillText(`💀 ${c.name} 탈락! 💀`, c.x, y);

    ctx.restore();
  }
}
