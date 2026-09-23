import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gamerid.db');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Import schema by executing the same SQL as runtime (migrate inline)
const schemaSql = fs.readFileSync(new URL('../src/lib/schema.sql', import.meta.url), 'utf8');
db.exec(schemaSql);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$16384$${salt}$${hash}`;
}

/* ---------- Games ---------- */
const games = [
  { slug: 'codm', name: 'Call of Duty: Mobile', name_fa: 'کال آف دیوتی موبایل', genre: 'FPS', accent: '#ffb300', platforms: 'iOS, Android', cover: '/games/codm.jpg' },
  { slug: 'gta-v', name: 'GTA V', name_fa: 'جی‌تی‌ای وی', genre: 'Action', accent: '#4caf50', platforms: 'PC, PS, Xbox', cover: '/games/gta-v.jpg' },
  { slug: 'fortnite', name: 'Fortnite', name_fa: 'فورتنایت', genre: 'Battle Royale', accent: '#9c27b0', platforms: 'PC, PS, Xbox, Mobile', cover: '/games/fortnite.jpg' },
  { slug: 'minecraft', name: 'Minecraft', name_fa: 'ماینکرافت', genre: 'Sandbox', accent: '#8bc34a', platforms: 'PC, Console, Mobile', cover: '/games/minecraft.jpg' },
  { slug: 'cs2', name: 'Counter-Strike 2', name_fa: 'کانتر استرایک ۲', genre: 'FPS', accent: '#ff9800', platforms: 'PC', cover: '/games/cs2.jpg' },
  { slug: 'valorant', name: 'Valorant', name_fa: 'والورانت', genre: 'Tactical FPS', accent: '#ff4655', platforms: 'PC', cover: '/games/valorant.jpg' },
  { slug: 'pubg', name: 'PUBG', name_fa: 'پابجی', genre: 'Battle Royale', accent: '#fbc02d', platforms: 'PC, Mobile, Console', cover: '/games/pubg.jpg' },
  { slug: 'apex-legends', name: 'Apex Legends', name_fa: 'اپکس لجندز', genre: 'Battle Royale', accent: '#e53935', platforms: 'PC, Console', cover: '/games/apex.jpg' },
  { slug: 'rocket-league', name: 'Rocket League', name_fa: 'راکت لیگ', genre: 'Sports', accent: '#00bcd4', platforms: 'PC, Console', cover: '/games/rocket-league.jpg' },
  { slug: 'warzone', name: 'Warzone', name_fa: 'وارزون', genre: 'Battle Royale', accent: '#607d8b', platforms: 'PC, PS, Xbox', cover: '/games/warzone.jpg' },
];

const insertGame = db.prepare(
  'INSERT OR IGNORE INTO games (slug, name, name_fa, genre, cover_path, accent, platforms) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
for (const g of games) insertGame.run(g.slug, g.name, g.name_fa, g.genre, g.cover, g.accent, g.platforms);

/* ---------- Achievements ---------- */
const achievements = [
  { slug: 'first-blood', name: 'FIRST BLOOD', name_fa: 'اولین خون', description: 'Win your first match or get your first elimination.', description_fa: 'اولین برد یا اولین حذف خودت رو ثبت کن.', icon: 'crosshair', xp_reward: 50 },
  { slug: '100-kills', name: '100 KILLS', name_fa: '۱۰۰ کیل', description: 'Reach 100 total kills across your games.', description_fa: 'به ۱۰۰ کیل کلی در بازی‌هات برس.', icon: 'skull', xp_reward: 100 },
  { slug: 'ranked-master', name: 'RANKED MASTER', name_fa: 'استاد رنکد', description: 'Reach Master rank in any ranked mode.', description_fa: 'در هر حالت رنکد به استاد برس.', icon: 'medal', xp_reward: 200 },
  { slug: 'night-owl', name: 'NIGHT OWL', name_fa: 'جلوی خورشید', description: 'Be active on GAMER ID between 00:00 and 05:00.', description_fa: 'بین نیمه‌شب تا ۵ صبح فعال باش.', icon: 'moon', xp_reward: 40 },
  { slug: '100-hours', name: '100 HOURS', name_fa: '۱۰۰ ساعت', description: 'Log 100+ hours across your games.', description_fa: 'بیش از ۱۰۰ ساعت بازی ثبت کن.', icon: 'clock', xp_reward: 150 },
  { slug: 'clutch-king', name: 'CLUTCH KING', name_fa: 'پادشاه کلچ', description: 'Pull off the impossible — submit a clutch proof.', description_fa: 'غیرممکن رو ممکن کن — مدرک کلچ ثبت کن.', icon: 'crown', xp_reward: 180 },
  { slug: 'profile-complete', name: 'PROFILE PRO', name_fa: 'استاد پروفایل', description: 'Complete your profile 100%.', description_fa: 'پروفایلت رو ۱۰۰٪ کامل کن.', icon: 'user-check', xp_reward: 100 },
  { slug: 'first-game', name: 'GAME ON', name_fa: 'شروع بازی', description: 'Add your first game to the profile.', description_fa: 'اولین بازی رو به پروفایلت اضافه کن.', icon: 'gamepad', xp_reward: 25 },
  { slug: 'game-collector', name: 'GAME COLLECTOR', name_fa: 'کلکسیونر بازی', description: 'Add 5 games to your profile.', description_fa: '۵ بازی به پروفایلت اضافه کن.', icon: 'layers', xp_reward: 80 },
  { slug: 'first-post', name: 'FIRST POST', name_fa: 'اولین پست', description: 'Publish your first post in the feed.', description_fa: 'اولین پستت رو در فید منتشر کن.', icon: 'edit', xp_reward: 20 },
  { slug: 'first-clip', name: 'CLIP STAR', name_fa: 'ستاره کلیپ', description: 'Upload your first clip to ClipZone.', description_fa: 'اولین کلیپت رو آپلود کن.', icon: 'video', xp_reward: 60 },
  { slug: 'level-5', name: 'LEVEL 5', name_fa: 'سطح ۵', description: 'Reach level 5.', description_fa: 'به سطح ۵ برس.', icon: 'star', xp_reward: 75 },
  { slug: 'level-10', name: 'LEVEL 10', name_fa: 'سطح ۱۰', description: 'Reach level 10.', description_fa: 'به سطح ۱۰ برس.', icon: 'star', xp_reward: 150 },
  { slug: 'social-butterfly', name: 'SOCIAL BUTTERFLY', name_fa: 'پروانه اجتماعی', description: 'Get 10 followers.', description_fa: 'به ۱۰ دنبال‌کننده برس.', icon: 'users', xp_reward: 90 },
  { slug: 'clan-member', name: 'SQUAD UP', name_fa: 'عضو کلن', description: 'Join your first clan.', description_fa: 'در اولین کلنت عضو شو.', icon: 'shield', xp_reward: 50 },
];

const insertAch = db.prepare(
  'INSERT OR IGNORE INTO achievements (slug, name, name_fa, description, description_fa, icon, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
for (const a of achievements) insertAch.run(a.slug, a.name, a.name_fa, a.description, a.description_fa, a.icon, a.xp_reward);

/* ---------- Challenges ---------- */
const challenges = [
  { slug: 'daily-20-kills', title: 'Get 20 kills in Ranked.', title_fa: 'در رنکد ۲۰ کیل بگیر.', description: 'Play ranked matches and secure 20 eliminations.', description_fa: 'مچ رنکد بازی کن و ۲۰ حذف ثبت کن.', kind: 'daily', xp_reward: 80, proof_required: 1 },
  { slug: 'daily-login-post', title: 'Share what you play today.', title_fa: 'امروز چی بازی می‌کنی رو بنویس.', description: 'Create one feed post about your today gaming session.', description_fa: 'یک پست درباره سیشن امروزت بساز.', kind: 'daily', xp_reward: 40, proof_required: 0 },
  { slug: 'daily-win-squad', title: 'Win 3 matches with a squad.', title_fa: '۳ برد با تیم بیاور.', description: 'Win three matches while playing with squad members.', description_fa: 'سه برد با اعضای تیم کسب کن.', kind: 'daily', xp_reward: 100, proof_required: 1 },
  { slug: 'weekly-5-hours', title: 'Play 5 hours this week.', title_fa: 'این هفته ۵ ساعت بازی کن.', description: 'Log at least 5 hours of gameplay across your games.', description_fa: 'حداقل ۵ ساعت بازی ثبت کن.', kind: 'weekly', xp_reward: 250, proof_required: 1 },
  { slug: 'weekly-clip', title: 'Upload an epic clip.', title_fa: 'یک کلیپ حرفه‌ای آپلود کن.', description: 'Publish at least one clip in ClipZone this week.', description_fa: 'این هفته حداقل یک کلیپ منتشر کن.', kind: 'weekly', xp_reward: 150, proof_required: 0 },
  { slug: 'weekly-clutch', title: 'Pull off a 1v4 clutch.', title_fa: 'یک کلچ ۱v۴ بزن.', description: 'Win a 1v4 situation and submit the proof.', description_fa: 'در موقعیت ۱v۴ برنده شو و مدرک بفرست.', kind: 'weekly', xp_reward: 300, proof_required: 1 },
  { slug: 'special-founder', title: 'Invite 5 friends to GAMER ID.', title_fa: '۵ دوست به گیمرآی‌دی دعوت کن.', description: 'Special launch challenge — bring your squad over.', description_fa: 'چالش ویژه راه‌اندازی — تیمت رو بیار.', kind: 'special', xp_reward: 500, proof_required: 1 },
  { slug: 'special-clan-war', title: 'Win a clan_vs_clan scrim.', title_fa: 'در اسکریم کلن برنده شو.', description: 'Lead your clan to victory in an official scrim.', description_fa: 'کلنت رو در یک اسکریم رسمی به پیروزی برسان.', kind: 'special', xp_reward: 800, proof_required: 1 },
];

const insertCh = db.prepare(
  'INSERT OR IGNORE INTO challenges (slug, title, title_fa, description, description_fa, kind, xp_reward, proof_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const c of challenges) insertCh.run(c.slug, c.title, c.title_fa, c.description, c.description_fa, c.kind, c.xp_reward, c.proof_required);

/* ---------- Admin user ---------- */
const adminEmail = process.env.ADMIN_EMAIL || 'admin@gamerid.gg';
const adminPass = process.env.ADMIN_PASSWORD || 'GamerID#Admin2026';
const adminUser = process.env.ADMIN_USERNAME || 'admin';
const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(adminEmail, adminUser);
let adminId;
if (exists) {
  adminId = exists.id;
} else {
  const res = db
    .prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(adminUser, adminEmail, hashPassword(adminPass), 'admin');
  adminId = Number(res.lastInsertRowid);
  db.prepare('INSERT INTO profiles (user_id, display_name, bio, country) VALUES (?, ?, ?, ?)').run(
    adminId, 'GAMER ID Admin', 'Platform administrator', 'IR'
  );
  // give admin some starting content so admin panel isn't empty of owned content
  db.prepare('INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)').run(adminId, 100, 'ADMIN');
  db.prepare('UPDATE profiles SET xp = 100, level = 1 WHERE user_id = ?').run(adminId);
}

const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
const gameCount = db.prepare('SELECT COUNT(*) AS c FROM games').get().c;
const achCount = db.prepare('SELECT COUNT(*) AS c FROM achievements').get().c;
const chCount = db.prepare('SELECT COUNT(*) AS c FROM challenges').get().c;

console.log('GAMER ID seed complete:');
console.log(`  games: ${gameCount}, achievements: ${achCount}, challenges: ${chCount}`);
console.log(`  admin: ${adminUser} / ${adminEmail} (password from .env ADMIN_PASSWORD)`);
console.log(`  total users: ${userCount}`);
db.close();
