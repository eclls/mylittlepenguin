// ═══════════════════════════════════════════════════════
//  ANIMALS ENGINE — MyLittlePenguin
//  Converts a day count → animal breakdown + CSS renders
// ═══════════════════════════════════════════════════════

// ─── CONSTANTS ───────────────────────────────────────
const DAYS_PER_MOUETTE  = 1;
const DAYS_PER_PINGOUIN = 30;
const DAYS_PER_ORQUE    = 180;   // 6 * 30
const DAYS_PER_REQUIN   = 360;   // 12 * 30

// ─── LEVELS ──────────────────────────────────────────
const LEVELS = [
  { min: 0,    max: 29,   icon: '🐣', name: 'Poussin Polaire',       next: 30  },
  { min: 30,   max: 59,   icon: '🐦', name: 'Maître des Mouettes',   next: 60  },
  { min: 60,   max: 89,   icon: '🐧', name: 'Pingouin Confirmé',     next: 90  },
  { min: 90,   max: 179,  icon: '🏔️', name: 'Gardien de la Banquise',next: 180 },
  { min: 180,  max: 359,  icon: '🐋', name: 'Dompteur d\'Orques',    next: 360 },
  { min: 360,  max: 719,  icon: '🦈', name: 'Légende des Abysses',   next: 720 },
  { min: 720,  max: 9999, icon: '❄️', name: 'Dieu du Grand Froid',   next: null},
];

function getLevel(days) {
  return LEVELS.find(l => days >= l.min && days <= l.max) || LEVELS[0];
}

function getLevelProgress(days) {
  const level = getLevel(days);
  if (!level.next) return { pct: 100, remaining: 0 };
  const range = level.next - level.min;
  const done  = days - level.min;
  return {
    pct: Math.min(100, Math.round((done / range) * 100)),
    remaining: level.next - days
  };
}

// ─── BREAKDOWN ───────────────────────────────────────
function computeAnimals(days) {
  let remaining = days;
  const requins  = Math.floor(remaining / DAYS_PER_REQUIN);  remaining %= DAYS_PER_REQUIN;
  const orques   = Math.floor(remaining / DAYS_PER_ORQUE);   remaining %= DAYS_PER_ORQUE;
  const pingouins= Math.floor(remaining / DAYS_PER_PINGOUIN);remaining %= DAYS_PER_PINGOUIN;
  const mouettes = remaining;
  return { requins, orques, pingouins, mouettes };
}

// ─── CSS ANIMAL TEMPLATES ────────────────────────────

function createMouetteEl() {
  const el = document.createElement('div');
  el.className = 'mouette-css';
  el.innerHTML = `
    <div class="mouette-wing left"></div>
    <div class="mouette-body"></div>
    <div class="mouette-wing right"></div>
    <div class="mouette-head"></div>
    <div class="mouette-beak"></div>
  `;
  return el;
}

function createPingouinEl(size = 'normal') {
  const el = document.createElement('div');
  const s = size === 'small' ? 22 : 28;
  el.style.cssText = `
    width:${s}px; height:${Math.round(s*1.28)}px;
    background:#1a1a2e; border-radius:50% 50% 40% 40%;
    position:relative; flex-shrink:0;
  `;
  el.innerHTML = `
    <div style="width:${Math.round(s*0.6)}px;height:${Math.round(s*0.8)}px;background:#f5f0e8;border-radius:50%;position:absolute;bottom:${Math.round(s*0.14)}px;left:50%;transform:translateX(-50%)"></div>
    <div style="width:${Math.round(s*0.35)}px;height:${Math.round(s*0.22)}px;background:#ff8c42;border-radius:0 0 50% 50%;position:absolute;top:${Math.round(s*0.32)}px;left:50%;transform:translateX(-50%);clip-path:polygon(10% 0%,90% 0%,100% 100%,0% 100%)"></div>
    <div style="width:${Math.round(s*0.3)}px;height:${Math.round(s*0.3)}px;background:white;border-radius:50%;position:absolute;top:${Math.round(s*0.14)}px;left:${Math.round(s*0.1)}px">
      <div style="width:50%;height:50%;background:#1a1a2e;border-radius:50%;position:absolute;top:25%;left:25%"></div>
    </div>
    <div style="width:${Math.round(s*0.3)}px;height:${Math.round(s*0.3)}px;background:white;border-radius:50%;position:absolute;top:${Math.round(s*0.14)}px;right:${Math.round(s*0.1)}px">
      <div style="width:50%;height:50%;background:#1a1a2e;border-radius:50%;position:absolute;top:25%;left:25%"></div>
    </div>
  `;
  return el;
}

function createOrqueEl() {
  const el = document.createElement('div');
  el.className = 'orque-css';
  el.innerHTML = `
    <div class="orque-fin"></div>
    <div class="orque-body">
      <div class="orque-belly"></div>
      <div class="orque-eye"></div>
    </div>
    <div class="orque-tail"></div>
  `;
  return el;
}

function createRequinEl() {
  const el = document.createElement('div');
  el.className = 'requin-css';
  el.innerHTML = `
    <div class="requin-fin"></div>
    <div class="requin-body">
      <div class="requin-belly"></div>
    </div>
    <div class="requin-tail"></div>
  `;
  return el;
}

// ─── SCENE RENDERING ─────────────────────────────────
// Places animal tokens around the banquise scene

function renderAnimalsOnScene(days) {
  const layer = document.getElementById('animals-layer');
  if (!layer) return;
  layer.innerHTML = '';

  const { requins, orques, pingouins, mouettes } = computeAnimals(days);

  // Build a flat list of tokens to place, cap for perf
  const tokens = [];
  for (let i = 0; i < Math.min(requins,  3); i++) tokens.push({ type: 'requin'  });
  for (let i = 0; i < Math.min(orques,   6); i++) tokens.push({ type: 'orque'   });
  for (let i = 0; i < Math.min(pingouins,10); i++) tokens.push({ type: 'pingouin'});
  for (let i = 0; i < Math.min(mouettes, 20); i++) tokens.push({ type: 'mouette' });

  // Randomised positions avoiding centre (where iceberg is)
  const sceneW = layer.clientWidth || window.innerWidth;
  const sceneH = layer.clientHeight || 310;

  tokens.forEach((t, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'animal-token';

    // Avoid centre zone
    let x, y;
    const zone = idx % 4;
    if (zone === 0) { x = rand(2, 30);  y = rand(5, 55); }
    else if (zone === 1) { x = rand(68, 95); y = rand(5, 55); }
    else if (zone === 2) { x = rand(2, 40);  y = rand(5, 30); }
    else { x = rand(60, 95); y = rand(5, 30); }

    wrapper.style.cssText = `
      left: ${x}%;
      top:  ${y}%;
      --float-dur:    ${(3 + Math.random() * 3).toFixed(1)}s;
      --float-delay:  ${(Math.random() * 3).toFixed(1)}s;
      --rot-start:    ${(-4 + Math.random() * 8).toFixed(0)}deg;
      --rot-mid:      ${(-4 + Math.random() * 8).toFixed(0)}deg;
      --rot-end:      ${(-4 + Math.random() * 8).toFixed(0)}deg;
      --dx1: ${(-6 + Math.random() * 12).toFixed(0)}px;
      --dy1: ${(-8 + Math.random() * 6).toFixed(0)}px;
      --dx2: ${(-6 + Math.random() * 12).toFixed(0)}px;
      --dy2: ${(-4 + Math.random() * 8).toFixed(0)}px;
    `;

    let animalEl;
    switch (t.type) {
      case 'mouette':  animalEl = createMouetteEl();     break;
      case 'pingouin': animalEl = createPingouinEl();    break;
      case 'orque':    animalEl = createOrqueEl();        break;
      case 'requin':   animalEl = createRequinEl();       break;
    }
    wrapper.appendChild(animalEl);
    layer.appendChild(wrapper);
  });
}

// ─── SUMMARY DISPLAY ─────────────────────────────────
function renderAnimalCountDisplay(days) {
  const el = document.getElementById('animal-count-display');
  if (!el) return;
  const { requins, orques, pingouins, mouettes } = computeAnimals(days);

  const items = [
    { icon: '🦈', count: requins,   label: 'Requin'  + (requins  !== 1 ? 's' : '') },
    { icon: '🐋', count: orques,    label: 'Orque'   + (orques   !== 1 ? 's' : '') },
    { icon: '🐧', count: pingouins, label: 'Pingouin'+ (pingouins!== 1 ? 's' : '') },
    { icon: '🐦', count: mouettes,  label: 'Mouette' + (mouettes !== 1 ? 's' : '') },
  ].filter(i => i.count > 0);

  if (items.length === 0) {
    el.innerHTML = '<div style="color:rgba(255,255,255,0.35);font-size:0.85rem;font-weight:600;text-align:center;width:100%;padding:12px 0">Commence ton aventure aujourd\'hui ! 🐧</div>';
    return;
  }

  el.innerHTML = items.map(i => `
    <div class="acd-item">
      <span style="font-size:1.6rem">${i.icon}</span>
      <div>
        <div class="acd-count">${i.count}</div>
        <div class="acd-label">${i.label}</div>
      </div>
    </div>
  `).join('');
}

// ─── AVATAR GRID ─────────────────────────────────────
const AVATAR_OPTIONS = ['🐧','🐦','🐋','🦈','🦭','🐟','❄️','🌊','🏔️','⭐','🎯','🔥'];

function renderAvatarGrid(currentAvatar, onSelect) {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;
  grid.innerHTML = AVATAR_OPTIONS.map(a => `
    <div class="avatar-option ${a === currentAvatar ? 'selected' : ''}" data-avatar="${a}" onclick="selectAvatar('${a}')">
      ${a}
    </div>
  `).join('');
}

// ─── UTIL ────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysSince(dateStr, killDateStr) {
  // If there's a kill date, count from that
  const ref  = killDateStr ? new Date(killDateStr) : new Date(dateStr);
  const now  = new Date();
  now.setHours(0,0,0,0);
  ref.setHours(0,0,0,0);
  return Math.max(0, Math.floor((now - ref) / 86400000));
}
