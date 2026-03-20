// ═══════════════════════════════════════════════════════
//  SUPABASE CONFIG — MyLittlePenguin
//  ⚠️  Replace SUPABASE_URL and SUPABASE_ANON_KEY below
//  with your own values from app.supabase.com
// ═══════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://cirdtmjrsgbqbstwrgzx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ss3wVok5B0P29uLUBBhnOg_nfTzrSbW';

// Init client
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── AUTH HELPERS ────────────────────────────────────

async function sbSignUp(pseudo) {
  // Use a fake email derived from pseudo for Supabase auth
  const fakeEmail = `${pseudo.toLowerCase().replace(/\s/g, '_')}@mylittlepenguin.app`;
  const fakePass  = `mlp_${pseudo}_${Math.random().toString(36).slice(2)}`;

  const { data, error } = await sb.auth.signUp({
    email: fakeEmail,
    password: fakePass,
    options: { data: { pseudo } }
  });
  if (error) throw error;

  // Store password locally so user can re-login on same device
  localStorage.setItem('mlp_email', fakeEmail);
  localStorage.setItem('mlp_pass', fakePass);
  localStorage.setItem('mlp_pseudo', pseudo);

  return data.user;
}

async function sbSignIn() {
  const email = localStorage.getItem('mlp_email');
  const pass  = localStorage.getItem('mlp_pass');
  if (!email || !pass) return null;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) return null;
  return data.user;
}

async function sbSignOut() {
  localStorage.removeItem('mlp_email');
  localStorage.removeItem('mlp_pass');
  localStorage.removeItem('mlp_pseudo');
  localStorage.removeItem('mlp_profile');
  await sb.auth.signOut();
}

async function sbGetCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// ─── PROFILE HELPERS ─────────────────────────────────

async function sbCreateProfile(userId, pseudo, startDate) {
  const { error } = await sb.from('profiles').insert({
    id: userId,
    pseudo,
    start_date: startDate,
    avatar: '🐧',
    notif_enabled: true,
    banquise_public: true,
    last_kill_date: null,
    kills: 0,
  });
  if (error) throw error;
}

async function sbGetProfile(userId) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

async function sbUpdateProfile(userId, updates) {
  const { error } = await sb.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}

async function sbCheckPseudoUnique(pseudo) {
  const { data } = await sb.from('profiles').select('id').eq('pseudo', pseudo).limit(1);
  return !data || data.length === 0;
}

// ─── FRIENDS HELPERS ─────────────────────────────────

async function sbSearchUser(pseudo) {
  const { data } = await sb.from('profiles').select('id, pseudo, avatar, start_date, last_kill_date, banquise_public').eq('pseudo', pseudo).limit(1);
  return data && data.length ? data[0] : null;
}

async function sbSendFriendRequest(fromId, toId) {
  // Check not already friends
  const { data: existing } = await sb.from('friendships').select('id')
    .or(`and(user_a.eq.${fromId},user_b.eq.${toId}),and(user_a.eq.${toId},user_b.eq.${fromId})`).limit(1);
  if (existing && existing.length) throw new Error('Déjà amis ou demande en cours');
  const { error } = await sb.from('friendships').insert({ user_a: fromId, user_b: toId, status: 'pending' });
  if (error) throw error;
}

async function sbGetFriends(userId) {
  const { data } = await sb.from('friendships')
    .select(`id, status, user_a, user_b,
      profile_a:profiles!friendships_user_a_fkey(id, pseudo, avatar, start_date, last_kill_date, banquise_public),
      profile_b:profiles!friendships_user_b_fkey(id, pseudo, avatar, start_date, last_kill_date, banquise_public)`)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'accepted');
  return data || [];
}

async function sbGetPendingRequests(userId) {
  const { data } = await sb.from('friendships')
    .select(`id, user_a, profile_a:profiles!friendships_user_a_fkey(pseudo, avatar)`)
    .eq('user_b', userId)
    .eq('status', 'pending');
  return data || [];
}

async function sbAcceptFriend(friendshipId) {
  const { error } = await sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  if (error) throw error;
}

async function sbRemoveFriend(friendshipId) {
  const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

// ─── MESSAGES HELPERS ────────────────────────────────

async function sbSendMessage(fromId, toId, text, animal) {
  const { error } = await sb.from('messages').insert({
    from_id: fromId,
    to_id: toId,
    text: text || null,
    animal: animal || null,
  });
  if (error) throw error;
}

async function sbGetMessages(userId) {
  const { data } = await sb.from('messages')
    .select(`*, from_profile:profiles!messages_from_id_fkey(pseudo, avatar)`)
    .eq('to_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  return data || [];
}

async function sbMarkRead(messageId) {
  await sb.from('messages').update({ read: true }).eq('id', messageId);
}
