# انتشار Vodi Config در مایکت

این راهنما دقیقاً همان چیزی است که برای آپلود اپ در **مایکت** لازم داری. کل مسیر حدود ۳۰ دقیقه است.

---

## ۰) پیش‌نیازها

- حساب توسعه‌دهنده در [مایکت](https://developer.myket.ir) (ثبت‌نام رایگان است)
- فایل امضاشده‌ی `AAB` (مایکت برای اپ جدید AAB می‌خواهد؛ APK هم برای تست و انتشار مستقیم به کار می‌آید)
- کی‌استور امضا (مرحله ۱)
- آیکون ۵۱۲×۵۱۲ (آماده: `public/icons/icon-512.png`)
- حداقل ۳ اسکرین‌شات از اپ (مرحله ۴)

---

## ۱) ساخت کی‌استور امضا (فقط یک‌بار)

```bash
cd vodi-config/android
keytool -genkeypair -v -keystore vodi-release.keystore -alias vodi \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keystore.properties` را کنار `android/settings.gradle` بساز:

```properties
storeFile=vodi-release.keystore
storePassword=رمز-دلخواه
keyAlias=vodi
keyPassword=رمز-دلخواه
```

⚠️ **کی‌استور و رمزها را جای امن نگه دار.** اگر گم شود، دیگر نمی‌توانی اپ را در مایکت آپدیت کنی و باید اپ جدید با شناسه‌ی جدید منتشر کنی.

اگر می‌خواهی ساخت روی GitHub Actions انجام شود، Secretها را طبق README تنظیم کن.

---

## ۲) تنظیم شماره نسخه

در `vodi-config/android/app/build.gradle`:

```gradle
versionCode 1        // هر آپلود باید +۱ شود
versionName "1.0.0"  // نسخه‌ای که به کاربر نشان داده می‌شود
```

---

## ۳) ساخت خروجی امضاشده

```bash
cd vodi-config
npm ci
npm run build
npm run icons
npx cap sync android
cd android
./gradlew bundleRelease     # → app/build/outputs/bundle/release/app-release.aab
./gradlew assembleRelease   # → app/build/outputs/apk/release/app-release.apk
```

(یا فقط یک تگ بزن و بگذار GitHub Actions بسازد: `git tag v1.0.0 && git push origin v1.0.0` — اول فایل `vodi-config/ci/android-release.yml` را در `.github/workflows/` قرار بده)

---

## ۴) آماده‌سازی صفحه‌ی فروشگاه

### نام اپ
- فارسی: **وودی کانفیگ**
- انگلیسی: **Vodi Config**

### توضیح کوتاه (۸۰ کاراکتر)
> مدیر آفلاین کانفیگ‌های VLESS، VMess، Trojan و Shadowsocks با اسکن QR

### توضیح کامل (پیشنهاد)

```
وودی کانفیگ یک ابزار سبک و کاملاً آفلاین برای نگه‌داری و مدیریت لینک‌های اتصال است.

■ پشتیبانی از VLESS، VMess، Trojan و Shadowsocks
■ افزودن با چسباندن لینک یا اسکن کد QR از دوربین
■ پشتیبانی از لینک‌های اشتراک (Subscription) در یک مرحله
■ جستجو، فیلتر و ستاره‌دار کردن کانفیگ‌ها
■ تست سریع DNS دامنه‌ی سرور و نمایش IP و تأخیر
■ ساخت و دانلود تصویر QR برای هر کانفیگ
■ باز کردن کانفیگ در v2rayNG، Hiddify، Streisand، Clash و Shadowrocket
■ رابط دوزبانه (فارسی و انگلیسی) با تم تیره و روشن
■ پشتیبان‌گیری و بازیابی از فایل JSON

حریم خصوصی: هیچ داده‌ای جمع‌آوری یا ارسال نمی‌شود. همه‌ی کانفیگ‌ها فقط روی گوشی خود شما ذخیره می‌شوند.

توجه: این اپ اتصال VPN ایجاد نمی‌کند و فقط کانفیگ‌ها را مدیریت می‌کند.
```

### دسته‌بندی پیشنهادی
ابزارها (Tools) → ابزارهای شبکه / اینترنت

### اسکرین‌شات‌ها (حداقل ۳، نسبت ۹:۱۶)

۱. صفحه‌ی اصلی با چند کانفیگ
۲. صفحه‌ی افزودن با کد QR
۳. شیت جزئیات کانفیگ (DNS test)
۴. تنظیمات (دوزبانه)

روش سریع گرفتن اسکرین‌شات:
- در گوشی، اپ را باز کن و اسکرین‌شات بگیر، سپس در `https://screenshot-maker` یا هر ابزار فریم‌گذاری، در قالب گوشی قرار بده.
- یا از نسخه‌ی وب (PWA) در Chrome استفاده کن: `Ctrl+Shift+M` → حالت موبایل → سه‌نقطه → **Capture screenshot**.

### آیکون
`vodi-config/public/icons/icon-512.png` (۵۱۲×۵۱۲، بدون شفافیت در لبه).

### تصویر شاخص (Feature graphic)
۱۶:۹ مثلاً ۱۰۲۴×۵۰۰ — می‌توانی از `public/icon.svg` روی پس‌زمینه‌ی گرادیان استفاده کنی.

### سیاست حریم خصوصی (الزامی)
فایل `docs/PRIVACY.md` و نسخه‌ی HTML آن `public/privacy.html` آماده است.
آن را روی یکی از این‌ها منتشر کن و **لینک نهایی** را در فرم مایکت بگذار:
- GitHub Pages همین ریپو (`https://<user>.github.io/<repo>/privacy.html`)
- Notion / Google Sites / هر هاست شخصی

---

## ۵) آپلود در مایکت

1. وارد [developer.myket.ir](https://developer.myket.ir) شو → **اپ جدید**
2. نام پکیج را وارد کن: `ir.vodiwalker.vodiconfig`
   - اگر این شناسه آزاد نبود، در `capacitor.config.json` و `android/app/build.gradle` عوضش کن (باید هر دو یکی باشند) و دوباره build بگیر.
3. فایل `app-release.aab` را آپلود کن
4. اطلاعات صفحه‌ی فروشگاه را از مرحله ۴ پر کن
5. **نوع محتوا / رده‌بندی سنی** را انتخاب کن (این اپ ابزار است، نه سرویس VPN)
6. لینک سیاست حریم خصوصی را بگذار
7. ارسال برای بازبینی — معمولاً ۱ تا ۳ روز کاری

> 💡 اگر مایکت فایل AAB را قبول نکرد، نسخه‌ی APK امضاشده را آپلود کن (`app-release.apk`).

---

## ۶) بعد از انتشار

- لینک مایکت را در کانال تلگرام و README بگذار.
- برای آپدیت: `versionCode` را +۱ کن، `versionName` را بالا ببر، دوباره build و آپلود.
- برای انتشار در **کافه‌بازار** و **Google Play** همین AAB قابل استفاده است؛ فقط در Play باید فرم Data Safety را پر کنی (پاسخ: هیچ داده‌ای جمع‌آوری نمی‌شود).

---

## چک‌لیست نهایی

- [ ] کی‌استور ساخته و پشتیبان‌گیری شده
- [ ] `versionCode` / `versionName` درست است
- [ ] `./gradlew bundleRelease` بدون خطا اجرا شد
- [ ] APK امضاشده روی یک گوشی واقعی نصب و تست شد (افزودن لینک، اسکن QR، تغییر زبان، تست DNS)
- [ ] آیکون ۵۱۲ و حداقل ۳ اسکرین‌شات آماده است
- [ ] لینک سیاست حریم خصوصی منتشر شده
- [ ] توضیحات فارسی/انگلیسی آماده است
