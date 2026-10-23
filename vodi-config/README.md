# Vodi Config · وودی کانفیگ

<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Vodi Config" />
</p>

<p align="center">
  <b>مدیریت، اسکن و اشتراک‌گذاری کانفیگ‌های VLESS / VMess / Trojan / Shadowsocks — کاملاً آفلاین</b><br />
  <i>Offline manager for VLESS / VMess / Trojan / Shadowsocks links</i>
</p>

---

## ✨ چه کاری می‌کند؟

| قابلیت | توضیح |
| --- | --- |
| 📥 افزودن از لینک | پارس `vless://`، `vmess://`، `trojan://`، `ss://` و لینک‌های اشتراک (Base64) |
| 📷 اسکن QR | دوربین را روی کد QR بگیر، کانفیگ خودکار اضافه می‌شود |
| 🗂 کتابخانه آفلاین | ذخیره روی خود گوشی با `localStorage`؛ هیچ سروری در کار نیست |
| 🔍 جستجو و فیلتر | بر اساس نام، سرور یا پروتکل + ستاره‌دار کردن |
| ⚡ تست DNS | رزولوشن دامنه با DoH (Cloudflare/Google) و نمایش IP + تأخیر |
| 🔗 باز کردن در کلاینت | deep link برای v2rayNG، Hiddify، Streisand، Clash، Shadowrocket |
| 🖼 ساخت QR | تولید و دانلود تصویر QR برای هر کانفیگ |
| 🌐 دوزبانه | فارسی (RTL) و انگلیسی (LTR) با یک کلیک |
| 🎨 سه تم | تیره، روشن و هم‌رنگ سیستم |
| 💾 پشتیبان‌گیری | خروجی/ورودی JSON برای انتقال بین گوشی‌ها |

> ⚠️ این اپ **اتصال VPN نمی‌سازد**. فقط کانفیگ‌ها را نگه می‌دارد و به کلاینت دلخواه تو تحویل می‌دهد.

---

## 🚀 اجرا در حالت توسعه

```bash
cd vodi-config
npm install
npm run dev          # http://localhost:5173
```

ساخت نسخه‌ی نهایی وب (PWA):

```bash
npm run build        # خروجی در dist/
npm run preview      # پیش‌نمایش خروجی
```

## 📱 ساخت اپ اندروید

نیازمندی‌ها: **Node 22+**، **JDK 21**، **Android SDK 36**.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug     # APK دیباگ: app/build/outputs/apk/debug/
```

نسخه‌ی انتشار برای مایکت (فایل AAB) یا نصب مستقیم (APK):

```bash
./gradlew bundleRelease    # app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease  # app/build/outputs/apk/release/app-release.apk
```

### ساخت خودکار با GitHub Actions

ورک‌فلوی آماده در [`ci/android-release.yml`](ci/android-release.yml) است. یک‌بار آن را به مسیر `.github/workflows/` کپی کن:

```bash
mkdir -p .github/workflows && cp vodi-config/ci/android-release.yml .github/workflows/
```

از آن پس هر تغییری در `vodi-config/**` روی برنچ `main`، فایل APK و AAB را می‌سازد و به‌عنوان Artifact آپلود می‌کند. برای ریلیز نسخه‌دار:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

فایل‌ها به‌صورت خودکار به GitHub Release وصل می‌شوند.

### امضای نسخه‌ی انتشار (Signing)

```bash
keytool -genkeypair -v -keystore vodi-release.keystore -alias vodi \
  -keyalg RSA -keysize 2048 -validity 10000
```

سپس `vodi-config/android/keystore.properties` بساز (در `.gitignore` هست):

```properties
storeFile=vodi-release.keystore
storePassword=…
keyAlias=vodi
keyPassword=…
```

برای CI، همین مقادیر را به‌صورت Secrets اضافه کن:

| Secret | مقدار |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 vodi-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | رمز کی‌استور |
| `ANDROID_KEY_ALIAS` | `vodi` |
| `ANDROID_KEY_PASSWORD` | رمز کلید |

> کی‌استور را گم نکن؛ بدون آن نمی‌توانی نسخه‌های بعدی را در مایکت آپدیت کنی.

---

## 🌍 انتشار نسخه‌ی وب (PWA)

سه گزینه‌ی رایگان و آماده:

- **Vercel** — ریشه‌ی پروژه را `vodi-config` بگذار، Build Command: `npm run build`، Output: `dist`
- **Netlify** — همان تنظیمات (فایل `netlify.toml` آماده است)
- **GitHub Pages** — خروجی `dist` را روی برنچ `gh-pages` بگذار (`base: './'` از قبل تنظیم شده)

پس از انتشار، کاربر می‌تواند از منوی مرورگر «افزودن به صفحه اصلی» را بزند و اپ را مثل یک اپ بومی نصب کند.

---

## 🧱 ساختار پروژه

```
vodi-config/
├── src/
│   ├── lib/parse.ts        پارس همه‌ی پروتکل‌ها + deep link
│   ├── lib/storage.ts      ذخیره‌سازی محلی و پشتیبان‌گیری
│   ├── lib/dns.ts          رزولوشن DoH
│   ├── pages/              صفحه‌های خانه، افزودن، تنظیمات
│   ├── components/         کارت، شیت جزئیات، اسکنر QR، QR ساز
│   └── i18n.ts             دیکشنری فارسی/انگلیسی
├── android/                پروژه‌ی Capacitor اندروید
├── public/                 آیکون‌ها، manifest، service worker، صفحه‌ی حریم خصوصی
├── scripts/make-icons.mjs  تولید آیکون و اسپلش از SVG
└── docs/                   راهنمای انتشار در مایکت + حریم خصوصی
```

---

## 📚 مستندات انتشار

- [راهنمای گام‌به‌گام انتشار در مایکت](docs/PUBLISH-MYKET.md)
- [سیاست حریم خصوصی](docs/PRIVACY.md)

## 📄 لایسنس

MIT — استفاده، تغییر و انتشار آزاد است.
