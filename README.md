# 🐧 MyLittlePenguin

Ton compagnon de l'Antarctique — calendrier des pingouins.

---

## 📁 Structure du projet

```
mylittlepenguin/
├── index.html              ← App principale (une seule page)
├── manifest.json           ← PWA manifest (bookmark iOS)
├── supabase-schema.sql     ← Schéma SQL à coller dans Supabase
├── css/
│   └── styles.css          ← Design complet
├── js/
│   ├── supabase-config.js  ← Connexion Supabase + helpers
│   ├── animals.js          ← Moteur des animaux & niveaux
│   └── app.js              ← Logique principale de l'app
└── icons/
    ├── penguin-icon-192.png   ← À créer (192x192)
    ├── penguin-icon-512.png   ← À créer (512x512)
    └── penguin-icon-180.png   ← Apple Touch Icon (180x180)
```

---

## 🚀 Setup — étapes dans l'ordre

### 1. Supabase

1. Crée un compte sur [supabase.com](https://supabase.com) (gratuit)
2. Nouveau projet → note l'**URL** et la **clé anon**
3. Dans *SQL Editor* → colle le contenu de `supabase-schema.sql` → Run
4. Dans *Authentication → Settings* → active **"Confirm email"** = **OFF** (sinon l'inscription ne marche pas sans email)

### 2. Configure `js/supabase-config.js`

Remplace les deux lignes en haut du fichier :

```js
const SUPABASE_URL  = 'https://TONPROJET.supabase.co';
const SUPABASE_ANON = 'ta-cle-anon-publique';
```

### 3. Icônes

Crée 3 images PNG avec un pingouin (tu peux en générer une sur [favicon.io](https://favicon.io) ou avec DALL-E) :
- `icons/penguin-icon-192.png` (192×192)
- `icons/penguin-icon-512.png` (512×512)
- `icons/penguin-icon-180.png` (180×180)

### 4. GitHub Pages

1. Push tous les fichiers sur ton repo GitHub
2. *Settings → Pages → Source → main branch → / (root)*
3. Ton app sera sur `https://tonpseudo.github.io/mylittlepenguin/`

### 5. Bookmark iOS (Add to Home Screen)

1. Ouvre l'URL dans Safari
2. Partager → Sur l'écran d'accueil
3. L'icône pingouin apparaît comme une vraie app 🎉

---

## 🐾 Logique des animaux

| Durée    | Animal  | Équivalence        |
|----------|---------|--------------------|
| 1 jour   | 🐦 Mouette | —                |
| 30 jours | 🐧 Pingouin | = 30 mouettes   |
| 180 jours| 🐋 Orque   | = 6 pingouins    |
| 360 jours| 🦈 Requin  | = 2 orques       |

---

## 🏅 Niveaux

| Jours   | Niveau                     |
|---------|----------------------------|
| 0–29    | 🐣 Poussin Polaire          |
| 30–59   | 🐦 Maître des Mouettes      |
| 60–89   | 🐧 Pingouin Confirmé        |
| 90–179  | 🏔️ Gardien de la Banquise  |
| 180–359 | 🐋 Dompteur d'Orques        |
| 360–719 | 🦈 Légende des Abysses      |
| 720+    | ❄️ Dieu du Grand Froid      |

---

## ☠️ Kill the Penguin

Quand on clique sur "Kill the Penguin" :
- La date de reset = aujourd'hui
- Demain le compteur repart de 0 (+1 mouette)
- Le nombre de kills total est conservé dans le profil

---

## 🔧 Mode hors-ligne / développement

Sans Supabase configuré, l'app fonctionne en **mode localStorage** (données locales uniquement, pas d'amis ni de messages).

---

## 📝 Prochaines étapes suggérées

- [ ] Générer et uploader les icônes pingouins
- [ ] Configurer Supabase (URL + clé)
- [ ] Tester le flow d'onboarding
- [ ] Ajouter des animations de spawn pour les animaux
- [ ] Notifications push (service worker)
