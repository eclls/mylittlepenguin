// ═══════════════════════════════════════════════════════
//  APP.JS — MyLittlePenguin — Main Controller
// ═══════════════════════════════════════════════════════

// ─── STATE ───────────────────────────────────────────
let APP = {
  user:        null,   // Supabase user object
  profile:     null,   // DB profile row
  days:        0,
  currentPage: 'banquise',
  inputMode:   'date', // 'date' | 'days'
  selectedAvatar: '🐧',
  selectedFriendId: null,
  selectedFriendName: null,
  notifEnabled:   true,
  banquisePub:    true,
};

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  generateStars();
  setTodayAsMaxDate();
  initDateInputListeners();
  initKillBtn();
  initLogout();
  initFriends();
  initAvatarPicker();
  boot();
});

async function boot() {
  // Show splash for at least 2s
  await sleep(2000);

  try {
    // Try to restore session
    const user = await sbSignIn();
    if (user) {
      APP.user = user;
      const profile = await sbGetProfile(user.id);
      APP.profile   = profile;
      APP.notifEnabled = profile.notif_enabled;
      APP.banquisePub  = profile.banquise_public;
      APP.selectedAvatar = profile.avatar || '🐧';
      goToApp();
    } else {
      goToOnboarding();
    }
  } catch (e) {
    // Supabase not configured yet — fallback to localStorage demo mode
    const savedProfile = localStorage.getItem('mlp_profile');
    if (savedProfile) {
      APP.profile = JSON.parse(savedProfile);
      goToApp();
    } else {
      goToOnboarding();
    }
  }
}

// ─── NAVIGATION (SCREENS) ────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToOnboarding() {
  showScreen('onboarding');
  document.getElementById('ob-step-1').classList.remove('hidden');
  document.getElementById('ob-step-2').classList.add('hidden');
}

function goToApp() {
  computeDays();
  updateBanquise();
  updateProfil();
  loadFriends();
  loadMessages();
  showScreen('app');
  document.getElementById('app').style.opacity = '1';
  document.getElementById('app').style.pointerEvents = 'all';
}

// ─── PAGE SWITCHING ───────────────────────────────────
function switchPage(pageName) {
  const pages = ['banquise', 'profil', 'amis'];
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    el.classList.remove('active', 'slide-left', 'slide-right');
  });

  const target = document.getElementById(`page-${pageName}`);
  target.classList.add('active');
  APP.currentPage = pageName;

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  if (pageName === 'profil') updateProfil();
  if (pageName === 'amis')   { loadFriends(); loadMessages(); }
}

// ─── ONBOARDING STEP 1: PSEUDO ────────────────────────
document.getElementById('pseudo-next-btn').addEventListener('click', async () => {
  const pseudoInput = document.getElementById('pseudo-input');
  const pseudo = pseudoInput.value.trim();
  const errEl  = document.getElementById('pseudo-error');

  if (pseudo.length < 2) { errEl.textContent = 'Au moins 2 caractères !'; return; }
  if (pseudo.length > 20) { errEl.textContent = 'Maximum 20 caractères.'; return; }
  if (!/^[a-zA-Z0-9_\-éèêàùûôîç ]+$/.test(pseudo)) {
    errEl.textContent = 'Caractères non autorisés.'; return;
  }
  errEl.textContent = '';

  // Check uniqueness (if Supabase configured)
  try {
    const unique = await sbCheckPseudoUnique(pseudo);
    if (!unique) { errEl.textContent = 'Ce pseudo est déjà pris 😬'; return; }
  } catch (e) { /* offline mode, skip */ }

  // Store temporarily
  APP._tempPseudo = pseudo;

  // Update speech bubble
  document.getElementById('ob-speech-text').innerHTML = `Top, ${pseudo} !<br/>Maintenant, la date 📅`;

  // Go to step 2
  document.getElementById('ob-step-1').classList.add('hidden');
  const step2 = document.getElementById('ob-step-2');
  step2.classList.remove('hidden');
  step2.classList.add('slide-enter');
});

// ─── ONBOARDING STEP 2: DATE/DAYS ─────────────────────
function switchInputMode(mode) {
  APP.inputMode = mode;
  document.getElementById('date-wrap').classList.toggle('hidden', mode !== 'date');
  document.getElementById('days-wrap').classList.toggle('hidden', mode !== 'days');
  document.getElementById('toggle-date').classList.toggle('active', mode === 'date');
  document.getElementById('toggle-days').classList.toggle('active', mode === 'days');
  updateOBPreview();
}

function initDateInputListeners() {
  document.getElementById('date-input').addEventListener('input', updateOBPreview);
  document.getElementById('days-input').addEventListener('input', updateOBPreview);
}

function updateOBPreview() {
  const prev = document.getElementById('ob-preview');
  let days = 0;
  if (APP.inputMode === 'date') {
    const val = document.getElementById('date-input').value;
    if (!val) { prev.textContent = ''; return; }
    const d = new Date(val);
    const now = new Date();
    now.setHours(0,0,0,0); d.setHours(0,0,0,0);
    days = Math.max(0, Math.floor((now - d) / 86400000));
  } else {
    days = parseInt(document.getElementById('days-input').value) || 0;
  }
  const { requins, orques, pingouins, mouettes } = computeAnimals(days);
  const parts = [];
  if (requins)   parts.push(`${requins} 🦈`);
  if (orques)    parts.push(`${orques} 🐋`);
  if (pingouins) parts.push(`${pingouins} 🐧`);
  if (mouettes)  parts.push(`${mouettes} 🐦`);
  prev.textContent = days === 0
    ? 'Ça commence aujourd\'hui ! 🎉'
    : `${days} jours → ${parts.join(' + ') || '🐣'}`;
}

document.getElementById('date-next-btn').addEventListener('click', async () => {
  const errEl = document.getElementById('date-error');
  let startDate;
  let days = 0;

  if (APP.inputMode === 'date') {
    const val = document.getElementById('date-input').value;
    if (!val) { errEl.textContent = 'Choisis une date !'; return; }
    startDate = val;
    const d = new Date(val);
    const now = new Date(); now.setHours(0,0,0,0); d.setHours(0,0,0,0);
    if (d > now) { errEl.textContent = 'La date ne peut pas être dans le futur !'; return; }
    days = Math.floor((now - d) / 86400000);
  } else {
    days = parseInt(document.getElementById('days-input').value);
    if (isNaN(days) || days < 0) { errEl.textContent = 'Nombre invalide !'; return; }
    const d = new Date();
    d.setDate(d.getDate() - days);
    startDate = d.toISOString().slice(0,10);
  }
  errEl.textContent = '';

  const pseudo = APP._tempPseudo;
  const profile = {
    pseudo,
    start_date: startDate,
    avatar: '🐧',
    notif_enabled: true,
    banquise_public: true,
    last_kill_date: null,
    kills: 0,
  };

  // Try Supabase, fallback localStorage
  try {
    const user = await sbSignUp(pseudo);
    APP.user = user;
    await sbCreateProfile(user.id, pseudo, startDate);
    APP.profile = await sbGetProfile(user.id);
  } catch (e) {
    console.warn('Supabase not configured, using localStorage:', e.message);
    localStorage.setItem('mlp_profile', JSON.stringify(profile));
    APP.profile = profile;
  }

  goToApp();
});

// ─── DAYS COMPUTATION ────────────────────────────────
function computeDays() {
  const p = APP.profile;
  if (!p) return;
  APP.days = daysSince(p.start_date, p.last_kill_date);
}

// ─── BANQUISE UPDATE ─────────────────────────────────
function updateBanquise() {
  computeDays();
  const days = APP.days;

  // Animals on scene
  renderAnimalsOnScene(days);

  // Count display
  renderAnimalCountDisplay(days);

  // Days sign
  document.getElementById('days-count-display').textContent = days;

  // Streak (simplified: days since last kill or start)
  document.getElementById('streak-display').textContent = days;
}

// ─── PROFIL UPDATE ───────────────────────────────────
function updateProfil() {
  if (!APP.profile) return;
  computeDays();
  const days = APP.days;
  const level = getLevel(days);
  const prog  = getLevelProgress(days);
  const { requins, orques, pingouins, mouettes } = computeAnimals(days);

  document.getElementById('profil-username').textContent = APP.profile.pseudo || '—';
  document.getElementById('profil-avatar-display').textContent = APP.profile.avatar || '🐧';
  document.getElementById('level-name-display').textContent = level.name;
  document.getElementById('lp-icon').textContent  = level.icon;
  document.getElementById('lp-current-name').textContent = level.name;
  document.getElementById('lp-fill').style.width  = prog.pct + '%';
  document.getElementById('lp-info').textContent  = prog.remaining > 0
    ? `${prog.remaining} jours avant le prochain niveau`
    : 'Niveau max atteint ! 🏆';

  const nextLevel = LEVELS.find(l => l.min === (level.next || 9999));
  document.getElementById('lp-next-name').textContent = nextLevel ? nextLevel.name : '—';

  document.getElementById('stat-days').textContent     = days;
  document.getElementById('stat-mouettes').textContent  = computeAnimals(days).mouettes;
  document.getElementById('stat-pingouins').textContent = computeAnimals(days).pingouins;
  document.getElementById('stat-orques').textContent    = computeAnimals(days).orques;

  // Toggles
  document.getElementById('notif-toggle').classList.toggle('active', APP.notifEnabled);
  document.getElementById('privacy-toggle').classList.toggle('active', APP.banquisePub);
}

// ─── TOGGLES ─────────────────────────────────────────
function toggleNotif() {
  APP.notifEnabled = !APP.notifEnabled;
  document.getElementById('notif-toggle').classList.toggle('active', APP.notifEnabled);
  if (APP.user) sbUpdateProfile(APP.user.id, { notif_enabled: APP.notifEnabled });
  else updateLocalProfile({ notif_enabled: APP.notifEnabled });
  showToast(APP.notifEnabled ? '🔔 Notifications activées' : '🔕 Notifications désactivées');
}

function togglePrivacy() {
  APP.banquisePub = !APP.banquisePub;
  document.getElementById('privacy-toggle').classList.toggle('active', APP.banquisePub);
  if (APP.user) sbUpdateProfile(APP.user.id, { banquise_public: APP.banquisePub });
  else updateLocalProfile({ banquise_public: APP.banquisePub });
  showToast(APP.banquisePub ? '👁️ Banquise visible' : '🔒 Banquise privée');
}

function updateLocalProfile(updates) {
  APP.profile = { ...APP.profile, ...updates };
  localStorage.setItem('mlp_profile', JSON.stringify(APP.profile));
}

// ─── AVATAR PICKER ───────────────────────────────────
function initAvatarPicker() {
  document.getElementById('avatar-edit-btn').addEventListener('click', () => {
    const picker = document.getElementById('avatar-picker');
    picker.classList.toggle('hidden');
    if (!picker.classList.contains('hidden')) {
      renderAvatarGrid(APP.profile?.avatar || '🐧');
    }
  });

  document.getElementById('avatar-confirm-btn').addEventListener('click', async () => {
    const avatar = APP.selectedAvatar;
    document.getElementById('profil-avatar-display').textContent = avatar;
    document.getElementById('avatar-picker').classList.add('hidden');
    if (APP.user) await sbUpdateProfile(APP.user.id, { avatar });
    else updateLocalProfile({ avatar });
    if (APP.profile) APP.profile.avatar = avatar;
    showToast('Avatar mis à jour ! ' + avatar);
  });
}

window.selectAvatar = function(a) {
  APP.selectedAvatar = a;
  document.querySelectorAll('.avatar-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.avatar === a);
  });
};

// ─── KILL THE PENGUIN ────────────────────────────────
function initKillBtn() {
  document.getElementById('kill-btn').addEventListener('click', () => {
    document.getElementById('kill-modal').classList.remove('hidden');
  });
}

function closeKillModal() {
  document.getElementById('kill-modal').classList.add('hidden');
}

async function confirmKill() {
  closeKillModal();
  const today = new Date().toISOString().slice(0,10);
  const kills = (APP.profile?.kills || 0) + 1;

  if (APP.user) {
    await sbUpdateProfile(APP.user.id, { last_kill_date: today, kills });
    APP.profile = await sbGetProfile(APP.user.id);
  } else {
    updateLocalProfile({ last_kill_date: today, kills });
  }

  // Animate animals disappearing
  const layer = document.getElementById('animals-layer');
  if (layer) {
    layer.style.transition = 'opacity 0.6s';
    layer.style.opacity = '0';
    await sleep(600);
    updateBanquise();
    layer.style.opacity = '1';
  } else {
    updateBanquise();
  }

  showToast('☠️ Pingouin tué ! Demain on recommence…');
}

// ─── LOGOUT ──────────────────────────────────────────
function initLogout() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (confirm('Quitter la banquise ? Tu devras te reconnecter.')) {
      await sbSignOut();
      APP.user = null;
      APP.profile = null;
      goToOnboarding();
    }
  });
}

// ─── FRIENDS ─────────────────────────────────────────
function initFriends() {
  document.getElementById('open-add-friend-btn').addEventListener('click', () => {
    document.getElementById('add-friend-panel').classList.toggle('hidden');
  });
  document.getElementById('cancel-add-btn').addEventListener('click', () => {
    document.getElementById('add-friend-panel').classList.add('hidden');
  });
  document.getElementById('search-friend-btn').addEventListener('click', searchFriend);
}

async function searchFriend() {
  const pseudo  = document.getElementById('search-friend-input').value.trim();
  const resultEl = document.getElementById('search-result');
  if (!pseudo) { resultEl.textContent = 'Écris un pseudo !'; return; }

  resultEl.textContent = 'Recherche…';

  try {
    const found = await sbSearchUser(pseudo);
    if (!found) {
      resultEl.innerHTML = `<span style="color:#f87171">Aucun explorer trouvé 😕</span>`;
      return;
    }
    if (found.id === APP.user?.id) {
      resultEl.innerHTML = `<span style="color:#fbbf24">C'est toi ! 😄</span>`;
      return;
    }
    resultEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
        <span style="font-size:1.4rem">${found.avatar || '🐧'}</span>
        <div>
          <div style="font-weight:800">${found.pseudo}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5)">${getLevel(daysSince(found.start_date, found.last_kill_date)).name}</div>
        </div>
        <button onclick="sendFriendReq('${found.id}')" style="margin-left:auto;padding:8px 14px;border-radius:99px;background:rgba(78,205,196,0.2);border:1px solid rgba(78,205,196,0.4);color:#4ecdc4;font-weight:800;font-family:var(--font-body);font-size:0.82rem;">Ajouter ✓</button>
      </div>
    `;
  } catch (e) {
    resultEl.innerHTML = `<span style="color:#f87171">Supabase non configuré 🔧</span>`;
  }
}

window.sendFriendReq = async function(toId) {
  try {
    await sbSendFriendRequest(APP.user.id, toId);
    showToast('Demande envoyée ! 🐧✉️');
    document.getElementById('add-friend-panel').classList.add('hidden');
  } catch (e) {
    showToast('Erreur : ' + e.message);
  }
};

async function loadFriends() {
  const listEl = document.getElementById('friends-list');
  if (!APP.user) return;

  try {
    const friends = await sbGetFriends(APP.user.id);
    const pending = await sbGetPendingRequests(APP.user.id);

    let html = '';

    // Pending requests
    if (pending.length) {
      html += pending.map(req => `
        <div class="friend-card" style="border-color:rgba(251,191,36,0.3);background:rgba(251,191,36,0.06)">
          <div class="fc-avatar">${req.profile_a?.avatar || '🐧'}</div>
          <div class="fc-info">
            <div class="fc-name">${req.profile_a?.pseudo || '?'}</div>
            <div class="fc-level">Demande en attente ⏳</div>
          </div>
          <div class="fc-actions">
            <button class="fc-btn" onclick="acceptFriend('${req.id}')">Accepter ✓</button>
          </div>
        </div>
      `).join('');
    }

    // Accepted friends
    if (friends.length === 0 && pending.length === 0) {
      listEl.innerHTML = `<div class="empty-friends">
        <div class="ef-penguin">🐧</div>
        <p>Ton expédition est encore solitaire…<br/>Ajoute des amis pour partager l'aventure !</p>
      </div>`;
      return;
    }

    html += friends.map(f => {
      const other = f.user_a === APP.user.id ? f.profile_b : f.profile_a;
      if (!other) return '';
      const friendDays = daysSince(other.start_date, other.last_kill_date);
      const friendLevel = getLevel(friendDays);
      const canSeeIce   = other.banquise_public;
      return `
        <div class="friend-card">
          <div class="fc-avatar">${other.avatar || '🐧'}</div>
          <div class="fc-info">
            <div class="fc-name">${other.pseudo}</div>
            <div class="fc-level">${friendLevel.icon} ${friendLevel.name} • ${friendDays}j</div>
          </div>
          <div class="fc-actions">
            ${canSeeIce ? `<button class="fc-btn" onclick="openMessage('${other.id}','${other.pseudo}')">✉️</button>` : ''}
            <button class="fc-btn danger" onclick="removeFriend('${f.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;
  } catch (e) {
    listEl.innerHTML = `<div class="empty-friends"><p style="color:rgba(255,255,255,0.4)">Connecte Supabase pour voir tes amis 🔧</p></div>`;
  }
}

window.acceptFriend = async function(friendshipId) {
  try {
    await sbAcceptFriend(friendshipId);
    showToast('Ami accepté ! 🐧🎉');
    loadFriends();
  } catch (e) { showToast('Erreur !'); }
};

window.removeFriend = async function(friendshipId) {
  if (!confirm('Retirer cet ami ?')) return;
  try {
    await sbRemoveFriend(friendshipId);
    showToast('Ami retiré');
    loadFriends();
  } catch (e) { showToast('Erreur !'); }
};

window.openMessage = function(toId, toPseudo) {
  APP.selectedFriendId   = toId;
  APP.selectedFriendName = toPseudo;
  const comp = document.getElementById('message-composer');
  comp.style.display = 'flex';
  comp.style.flexDirection = 'column';
  comp.style.gap = '10px';
  document.getElementById('mc-to-label').textContent = `À : ${toPseudo}`;
  document.getElementById('mc-send-btn').onclick = sendMessage;
};

window.sendAnimal = function(animal) {
  const labels = { mouette: '🐦 Mouette offerte !', pingouin: '🐧 Pingouin envoyé !', orque: '🐋 Orque lancée !' };
  if (APP.selectedFriendId && APP.user) {
    sbSendMessage(APP.user.id, APP.selectedFriendId, null, animal)
      .then(() => { showToast(labels[animal]); loadMessages(); })
      .catch(e => showToast('Erreur !'));
  } else {
    showToast('Sélectionne un ami d\'abord !');
  }
};

async function sendMessage() {
  const text = document.getElementById('mc-text').value.trim();
  if (!text) { showToast('Écris quelque chose !'); return; }
  if (!APP.selectedFriendId || !APP.user) { showToast('Sélectionne un ami !'); return; }
  try {
    await sbSendMessage(APP.user.id, APP.selectedFriendId, text, null);
    document.getElementById('mc-text').value = '';
    showToast('Message envoyé ✈️');
    loadMessages();
  } catch (e) { showToast('Erreur !'); }
}

async function loadMessages() {
  const area = document.getElementById('messages-area');
  if (!APP.user) return;
  try {
    const msgs = await sbGetMessages(APP.user.id);
    if (!msgs.length) {
      area.innerHTML = '<div class="empty-messages">Aucun message pour l\'instant 📭</div>';
      return;
    }
    area.innerHTML = msgs.map(m => {
      const animalLabel = m.animal ? { mouette: '🐦 Mouette', pingouin: '🐧 Pingouin', orque: '🐋 Orque' }[m.animal] : '';
      const timeAgo     = formatTimeAgo(new Date(m.created_at));
      return `
        <div class="message-item">
          <div class="mi-avatar">${m.from_profile?.avatar || '🐧'}</div>
          <div class="mi-content">
            <div class="mi-header">
              <span class="mi-from">${m.from_profile?.pseudo || '?'}</span>
              <span class="mi-time">${timeAgo}</span>
            </div>
            <div class="mi-text">${animalLabel ? `<strong>${animalLabel}</strong> ` : ''}${m.text || ''}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    area.innerHTML = '<div class="empty-messages">Configure Supabase pour les messages 🔧</div>';
  }
}

// ─── STARS GENERATOR ─────────────────────────────────
function generateStars() {
  const container = document.getElementById('stars-container');
  if (!container) return;
  for (let i = 0; i < 40; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = rand(1, 3);
    star.style.cssText = `
      width:${size}px; height:${size}px;
      left:${rand(0,100)}%; top:${rand(0,80)}%;
      --dur:${(2 + Math.random() * 4).toFixed(1)}s;
      --delay:${(Math.random() * 4).toFixed(1)}s;
    `;
    container.appendChild(star);
  }
}

// ─── DATE INPUT MAX ───────────────────────────────────
function setTodayAsMaxDate() {
  const today = new Date().toISOString().slice(0,10);
  const di = document.getElementById('date-input');
  if (di) { di.max = today; di.value = today; }
}

// ─── TOAST ───────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ─── HELPERS ─────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatTimeAgo(date) {
  const diff = Date.now() - date;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'à l\'instant';
  if (mins  < 60) return `il y a ${mins}min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

// Expose to HTML
window.switchInputMode   = switchInputMode;
window.closeKillModal    = closeKillModal;
window.confirmKill       = confirmKill;
window.toggleNotif       = toggleNotif;
window.togglePrivacy     = togglePrivacy;
window.switchPage        = switchPage;
window.sendMessage       = sendMessage;
