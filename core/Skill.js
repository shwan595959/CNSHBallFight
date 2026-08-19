export class Skill {
  constructor(name, icon, effectFn) {
    this.name     = name;
    this.icon     = icon;
    this.interval = 5000; // 5초 고정
    this.lastUsed = -(Math.random() * 5000);
    this.effectFn = effectFn;
  }

  isReady(now) {
    return now - this.lastUsed >= this.interval;
  }

  getProgress(now) {
    return Math.min(1, Math.max(0, (now - this.lastUsed) / this.interval));
  }

  tryUse(now, caster, allBalls, effects) {
    if (!this.isReady(now)) return false;
    this.lastUsed = now;
    this.effectFn(caster, allBalls, effects);
    return true;
  }
}
