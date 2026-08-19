import { BALL_REGISTRY } from '../balls/ballRegistry.js';

export class SelectScreen {
  constructor(onStart) {
  this.onStart  = onStart;
  this.selected = new Set();
  this.focused  = null;

  // 기본 전장 크기: 중형
  this.battlefieldSize = { w: 700, h: 500 };

  this.container = document.getElementById('select-screen');
  this.render();
}

  render() {
    this.container.innerHTML = `
      <div id="select-bg"></div>
      <div id="select-wrap">

        <!-- 공지사항 배너 -->
        <div id="notice-banner">
          <div id="notice-left">
            <div id="notice-badge">📢 공지</div>
            <div id="notice-texts">
              <div id="notice-title">대제목</div>
              <div id="notice-subtitle">소제목</div>
              <div id="notice-content">내용</div>
            </div>
          </div>
          <button id="notice-credit-btn">🎬 크레딧</button>
        </div>

        <!-- 크레딧 모달 -->
        <div id="credit-modal" class="hidden">
          <div id="credit-box">
            <div id="credit-title">🎬 크레딧</div>
            <div class="credit-section">
              <div class="credit-section-label">👑 제작자</div>
              <div class="credit-names">이름</div>
            </div>
            <div class="credit-section">
              <div class="credit-section-label">🙏 고마운 분들</div>
              <div class="credit-names">
                이름1<br>
                이름2<br>
                이름3
              </div>
            </div>
            <button id="credit-close-btn">✕ 닫기</button>
          </div>
        </div>


        <!-- 헤더 -->
        <div id="select-header">
          <div id="select-title-wrap">
            <div id="select-title">⚔️ CNSH BALL FIGHT</div>
            <div id="select-subtitle">충곽 속 싸움의 승자는 누가 될 것인가</div>
          </div>
          <div id="select-counter-wrap">
            <div id="select-counter">0</div>
            <div id="select-counter-label">출전</div>
          </div>
        </div>

        <!-- 메인 영역 -->
        <div id="select-main">

          <!-- 왼쪽: 공 버튼 목록 -->
          <div id="ball-list">
            ${BALL_REGISTRY.map(info => `
              <button
                class="ball-btn"
                data-id="${info.id}"
                style="--c: ${info.color};"
              >
                <span class="ball-btn-icon">${info.icon}</span>
                <span class="ball-btn-name" style="color:${info.color};">
                  ${info.name}
                </span>
                <span class="ball-btn-type">${info.type ?? '전투형'}</span>
                <span class="ball-btn-check">✓</span>
              </button>
            `).join('')}
          </div>

          <!-- 오른쪽: 상세 패널 -->
          <div id="detail-panel">
            <div id="detail-empty">
              <div id="detail-empty-icon">👈</div>
              <div id="detail-empty-text">명단에서 인물을 선택하세요</div>
            </div>
            <div id="detail-content" class="hidden"></div>
          </div>

        </div>

       <!-- 하단 -->
<div id="select-footer">
  <button id="select-all-btn">✦ 전체 선택</button>
  <button id="clear-btn">✦ 전체 해제</button>

  <!-- 전장 크기 선택 추가 -->
  <div id="battlefield-select">
    <div id="battlefield-label">🗺️ 전장 크기</div>
    <div id="battlefield-btns">
      <button class="bf-btn" data-w="700" data-h="500">🏟️ 소형<span>700 × 500</span></button>
      <button class="bf-btn selected" data-w="1000" data-h="700">🏟️ 중형<span>1000 × 700</span></button>
      <button class="bf-btn" data-w="1400" data-h="900">🏟️ 대형<span>1400 × 900</span></button>
      <button class="bf-btn" data-w="2100" data-h="1400">🏟️ 초대형<span>2100 × 1400</span></button>
    </div>
  </div>

  <button id="battle-btn" disabled>
    <span id="battle-btn-text">최소 2개를 선택하세요</span>
  </button>
</div>

      </div>
    `;

    // 공 버튼 클릭
    document.querySelectorAll('.ball-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.focusBall(btn.dataset.id);
      });
    });

// 크레딧 버튼
document.getElementById('notice-credit-btn')
  .addEventListener('click', () => {
    document.getElementById('credit-modal').classList.remove('hidden');
  });

document.getElementById('credit-close-btn')
  .addEventListener('click', () => {
    document.getElementById('credit-modal').classList.add('hidden');
  });

// 모달 바깥 클릭 시 닫기
document.getElementById('credit-modal')
  .addEventListener('click', (e) => {
    if (e.target.id === 'credit-modal') {
      document.getElementById('credit-modal').classList.add('hidden');
    }
  });

    
    document.getElementById('select-all-btn')
      .addEventListener('click', () => this.selectAll());
    document.getElementById('clear-btn')
      .addEventListener('click', () => this.clearAll());
    document.getElementById('battle-btn')
      .addEventListener('click', () => this.startBattle());

      document.querySelectorAll('.bf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bf-btn')
      .forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.battlefieldSize = {
      w: parseInt(btn.dataset.w),
      h: parseInt(btn.dataset.h),
    };
    console.log('전장 크기 변경됨:', this.battlefieldSize); // ✅ 추가
  });
});
  }


  
  // 공 버튼 클릭 → 상세 패널 표시
  focusBall(id) {
    this.focused = id;
    const info   = BALL_REGISTRY.find(b => b.id === id);

    // 버튼 활성 표시
    document.querySelectorAll('.ball-btn').forEach(btn => {
      btn.classList.toggle('focused', btn.dataset.id === id);
    });

    // 상세 패널 렌더
    document.getElementById('detail-empty').classList.add('hidden');
    const content = document.getElementById('detail-content');
    content.classList.remove('hidden');
    content.innerHTML = this.buildDetail(info);

    // 출전 버튼 이벤트
    document.getElementById('detail-enroll-btn')
      .addEventListener('click', () => this.toggleEnroll(id));

    this.updateDetailEnrollBtn(id);
  }

  buildDetail(info) {
    const isSelected = this.selected.has(info.id);
    return `
      <!-- 공 헤더 -->
      <div id="detail-header">
        <div id="detail-orb" style="
  background: radial-gradient(circle at 35% 30%,
    ${this.lighten(info.color, 90)},
    ${info.color} 60%,
    ${this.darken(info.color, 40)} 100%);
  box-shadow: 0 0 30px ${info.color}88, 0 0 60px ${info.color}33;
">
  ${info.image
    ? `<img src="${info.image}" alt="${info.name}" id="detail-orb-img"
            onerror="this.style.display='none'; document.getElementById('detail-orb-icon').style.display='block';">`
    : ''
  }
  <span id="detail-orb-icon" style="${info.image ? 'display:none;' : ''}">${info.icon}</span>
</div>
        <div id="detail-title-wrap">
          <div id="detail-name" style="
            color: ${info.color};
            text-shadow: 0 0 16px ${info.color}88;
          ">${info.name}</div>
          <div id="detail-type" style="
            border-color: ${info.color}55;
            color: ${info.color}99;
          ">${info.type ?? '전투형'}</div>
          <div id="detail-desc">${info.description}</div>
        </div>
      </div>

      <!-- 스텟 -->
      <div id="detail-stats">
        <div class="detail-section-title">STATS</div>
        ${this.buildStatBars(info.stats, info.color)}
      </div>

      <!-- 스킬 박스 -->
      <div id="detail-skill-box" style="
        border-color: ${info.color}55;
        background: linear-gradient(135deg, ${info.color}11 0%, transparent 60%);
      ">
        <div class="detail-section-title" style="margin-bottom:10px;">SKILL</div>
        <div id="skill-header">
          <span id="skill-icon">${info.skill.icon}</span>
          <span id="skill-name" style="color:${info.color};">${info.skill.name}</span>
          <span id="skill-cd">쿨타임 ${info.skill.cooldown}s</span>
        </div>
        <div id="skill-divider" style="background:${info.color}44;"></div>
        <div id="skill-desc">${info.skill.description}</div>
        ${info.skill.tags ? `
          <div id="skill-tags">
            ${info.skill.tags.map(t => `
              <span class="skill-tag" style="
                border-color: ${info.color}66;
                color: ${info.color}cc;
                background: ${info.color}11;
              ">${t}</span>
            `).join('')}
          </div>` : ''}
      </div>

      <!-- 출전 버튼 -->
      <button id="detail-enroll-btn" style="
        --ball-color: ${info.color};
        --ball-color-dim: ${info.color}33;
        --ball-color-border: ${info.color}66;
      ">
        <span id="detail-enroll-text"></span>
      </button>
    `;
  }

  buildStatBars(stats, color) {
    const list = [
      { key: 'hp',  label: 'HP',  icon: '❤️',  barColor: '#E74C3C' },
      { key: 'atk', label: 'ATK', icon: '⚔️',  barColor: '#E67E22' },
      { key: 'spd', label: 'SPD', icon: '💨',  barColor: '#3498DB' },
      { key: 'def', label: 'DEF', icon: '🛡️', barColor: '#27AE60' },
    ];
    return list.map(({ key, label, icon, barColor }) => {
      const val = stats[key] ?? 0;
      return `
        <div class="stat-row">
          <div class="stat-label">
            <span class="stat-icon">${icon}</span>
            <span class="stat-name">${label}</span>
          </div>
          <div class="stat-bar-wrap">
            <div class="stat-bar-bg">
              <div class="stat-bar-fill" style="
                width: ${val}%;
                background: linear-gradient(90deg, ${barColor}88, ${barColor});
                box-shadow: 0 0 6px ${barColor}88;
              "></div>
            </div>
            <span class="stat-val">${val}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 출전 버튼 상태 업데이트
  updateDetailEnrollBtn(id) {
    const btn  = document.getElementById('detail-enroll-btn');
    const text = document.getElementById('detail-enroll-text');
    if (!btn) return;

    if (this.selected.has(id)) {
      btn.classList.add('enrolled');
      text.textContent = '✓ 출전 취소';
    } else {
      btn.classList.remove('enrolled');
      text.textContent = '⚔️ 출전 등록';
    }
  }

  // 출전 토글
  toggleEnroll(id) {
    const btn = document.querySelector(`.ball-btn[data-id="${id}"]`);
    if (this.selected.has(id)) {
      this.selected.delete(id);
      btn?.classList.remove('selected');
    } else {
      this.selected.add(id);
      btn?.classList.add('selected');
    }
    this.updateDetailEnrollBtn(id);
    this.updateFooter();
  }

  selectAll() {
    BALL_REGISTRY.forEach(info => {
      this.selected.add(info.id);
      document.querySelector(`.ball-btn[data-id="${info.id}"]`)
        ?.classList.add('selected');
    });
    this.updateDetailEnrollBtn(this.focused);
    this.updateFooter();
  }

  clearAll() {
    this.selected.clear();
    document.querySelectorAll('.ball-btn')
      .forEach(b => b.classList.remove('selected'));
    this.updateDetailEnrollBtn(this.focused);
    this.updateFooter();
  }

  updateFooter() {
    const n   = this.selected.size;
    const btn = document.getElementById('battle-btn');
    const txt = document.getElementById('battle-btn-text');
    document.getElementById('select-counter').textContent = n;
    if (n >= 2) {
      btn.disabled    = false;
      txt.textContent = `⚔️  ${n}개 싸지까기!`;
    } else {
      btn.disabled    = true;
      txt.textContent = n === 1 ? '1개 더 선택하세요' : '최소 2개를 선택하세요';
    }
  }

  startBattle() {
  const selected = BALL_REGISTRY.filter(i => this.selected.has(i.id));
   console.log('startBattle battlefieldSize:', this.battlefieldSize);
  this.container.classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  this.onStart(selected, this.battlefieldSize); // ← battlefieldSize 추가
}

  lighten(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16)         + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff)        + amt);
    return `rgb(${r},${g},${b})`;
  }
  darken(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16)         - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff)        - amt);
    return `rgb(${r},${g},${b})`;
  }
}
