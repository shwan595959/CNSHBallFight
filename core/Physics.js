export function resolveCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist < 0.001) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // ✅ 겹침 완전 해소
  const overlap   = minDist - dist;
  const totalMass = a.mass + b.mass;
  a.x -= nx * overlap * (b.mass / totalMass);
  a.y -= ny * overlap * (b.mass / totalMass);
  b.x += nx * overlap * (a.mass / totalMass);
  b.y += ny * overlap * (a.mass / totalMass);

  // ✅ 탄성 충돌 (1D 공식, 법선 방향만)
  const aNorm = a.vx * nx + a.vy * ny; // a의 법선 방향 속도
  const bNorm = b.vx * nx + b.vy * ny; // b의 법선 방향 속도

  // 이미 멀어지는 중이면 스킵
  if (aNorm - bNorm > 0) return;

  // 완전 탄성 충돌 공식
  const newANorm = (aNorm * (a.mass - b.mass) + 2 * b.mass * bNorm) / totalMass;
  const newBNorm = (bNorm * (b.mass - a.mass) + 2 * a.mass * aNorm) / totalMass;

  // 법선 방향 속도만 교체 (접선 방향은 그대로)
  a.vx += (newANorm - aNorm) * nx;
  a.vy += (newANorm - aNorm) * ny;
  b.vx += (newBNorm - bNorm) * nx;
  b.vy += (newBNorm - bNorm) * ny;
}
