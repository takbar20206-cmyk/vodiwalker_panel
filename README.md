# 🎮 GAMER ID

> **Your Gaming Identity.**

یک پلتفرم اجتماعی واقعی و قابل توسعه برای گیمرها — با Auth واقعی، دیتابیس SQLite، سیستم XP/Level، Achievement، کلن، Squad Finder، ClipZone، پیام‌رسان داخلی و پنل مدیریت.

**A real, extensible social platform for gamers** — production-style Next.js app with a real database, not a mockup.

---

## ✨ امکانات / Features

| بخش | جزئیات |
|---|---|
| 🏠 **صفحه اصلی** | Hero با particle/neon/gradient متحرک برای میهمان‌ها؛ Feed واقعی برای کاربران وارد شده |
| 👤 **پروفایل** | `/username` — آواتار، کاور، بیو، کشور، Level، XP، بازی‌ها، Achievementها، دنبال‌کنندگان، دوستان |
| 🎮 **بازی‌ها** | افزودن بازی با Hours/Rank/Level/Main Character/Main Weapon/Platform + کاور هنری |
| 🏆 **Achievement** | ۱۵ Achievement واقعی با Badge (باز/قفل) و XP پاداش |
| ⚡ **XP & Level** | منحنی `L2=100, L3=250, ...`؛ XP برای پروفایل، بازی، پست، لایک، چالش، کلیپ، کلن، لاگین روزانه |
| 🏅 **Leaderboard** | Global / Country / Game × Weekly / Monthly / All-Time |
| 🎯 **Squad Finder** | ساخت پست تیم (Game/Mode/Rank/Players Needed/Mic/Language) + JOIN SQUAD |
| 🎬 **ClipZone** | آپلود ویدیو با تگ/بازی؛ تب‌های Trending / New / Most Liked / Following؛ Like/Comment/Save/View |
| 🛡 **Clans** | ساخت/عضویت/ترک، دعوت، Kick/Promote، Member list، Clan XP/Level |
| 💬 **Messaging** | DM و گروه، ارسال تصویر/کلیپ، وضعیت خوانده شدن، نشانگر آنلاین |
| 🔎 **Search** | جستجوی سریع بین Players / Games / Clans / Clips |
| ⚡ **Challenges** | Daily/Weekly/Special؛ Start → Submit Proof → XP |
| 🔔 **Notifications** | دنبال‌کننده، درخواست دوست، پیام، Achievement، چالش، کلن، لایک کلیپ، گزارش |
| ⚙️ **Settings** | Account / Profile / Privacy / Security / Language / Theme / Connected Games |
| 🛡 **Admin Panel** | داشبورد آمار + مدیریت Users/Posts/Clips/Comments/Games/Achievements/Clans/Reports/Challenges |
| 🚨 **Report** | گزارش User/Post/Clip/Comment با ۵ دلیل + بررسی توسط ادمین |
| 🌐 **زبان‌ها** | فارسی RTL / انگلیسی LTR با سوییچر |
| 📱 **Responsive** | Desktop → Mobile با Bottom Navigation (Home/Explore/Create/Messages/Profile) |
| 🧪 **کیفیت** | Loading states، Empty states، Error pages (404/500)، Auth guards |

## 🛠 تکنولوژی

- **Next.js 15** (App Router) + **TypeScript**
- **React 19**
- **Tailwind CSS 4**
- **SQLite** (`node:sqlite` — بدون وابستگی native)
- **scrypt** برای Hash رمز عبور + Session امضاشده HMAC (httpOnly cookie)
- Rate limiting، اعتبارسنجی ورودی، اعتبارسنجی آپلود (MIME + magic bytes)

## 🚀 اجرا

```bash
npm install
npm run seed        # دیتابیس + کاتالوگ بازی‌ها/Achievement/چالش‌ها + ادمین
npm run dev         # حالت توسعه
# یا
npm run build && npm start   # پروداکشن
```

### حساب ادمین (seed)

```
email:    admin@gamerid.gg
password: GamerID#Admin2026     # از .env → ADMIN_PASSWORD
```

> اولین کاربری که ثبت‌نام کند در نبودِ seed نیز به‌صورت خودکار admin می‌شود.

## 🗄 ساختار دیتابیس

`users, profiles, games, user_games, achievements, user_achievements, posts, clips, comments, likes, followers, friends, threads, thread_members, messages, notifications, clans, clan_members, clan_invites, challenges, user_challenges, squads, squad_joins, reports, xp_events, sessions, password_resets`

اسکیما: [`src/lib/schema.sql`](src/lib/schema.sql) و runtime migration در [`src/lib/db.ts`](src/lib/db.ts).

## 🧪 تست

```bash
npm start &          # سرور روی پورت 3000
bash scripts/smoke.sh
```

اسکریپت smoke شامل **۷۳ تست** روی Auth، پروفایل، بازی، Feed، لایک/کامنت، دنبال‌کردن، دوستی، پیام، Squad، چالش، Leaderboard، کلن، جستجو، Report، ادمین و Guardهای امنیتی است.

## 🔐 امنیت

- Hash رمز عبور با **scrypt** (+salt) — بدون ذخیره رمز خام
- Session: کوکی `httpOnly` + توکن امضاشده HMAC-SHA256 + جدول `sessions` (قابل ابطال)
- **Authorization** در همه APIها (فقط صاحب رکورد ویرایش می‌کند؛ ادمین استثنا)
- Rate limit روی Login/Register/Post/Report و…
- آپلود فایل: محدودیت حجم، بررسی MIME و **magic bytes** (رد کردن فایل جعلی)
- Headerهای امنیتی: `X-Frame-Options`, `nosniff`, …
- Anti-spam اولیه: محدودیت تعداد پست/کامنت/گزارش در بازه زمانی

## 💰 Monetization (آماده برای آینده)

ستینگ‌های `theme`، بج‌ها و ساختار `profiles/clans` طوری طراحی شده‌اند که بعداً بتوان بدون بازنویسی اضافه کرد:
Premium Profile · Profile Themes · Exclusive Badges · Clan Premium · Creator Features · Ads · Sponsored Challenges.
**پرداخت واقعی فعال نیست** تا زمان اتصال درگاه پرداخت.

## 📁 ساختار پروژه

```
src/
├── app/                  # صفحات + API routes
│   ├── api/              # ~30 endpoint واقعی
│   ├── [username]/       # پروفایل عمومی
│   ├── admin/            # پنل مدیریت
│   └── ...
├── components/           # Navbar, Feed, ProfileView, UI, ...
├── lib/                  # db, auth, xp, i18n, api helpers
└── middleware.ts         # Auth guard + زبان
scripts/
├── seed.mjs              # راه‌اندازی دیتابیس
└── smoke.sh              # تست‌های E2E
public/games/             # کاور بازی‌ها
legacy/                   # فایل‌های قبلی این ریپو (پنل Vodiwalker)
```

---

MIT © GAMER ID — *Your Gaming Identity.*
