# 🇮🇷 آیرانا Airana — اپلیکیشن هواشناسی کامل ایران

> یک برنامه موبایلی (Flutter) برای هواشناسیِ کامل ایران: دمای هوا، رطوبت، باد،
> زلزله، رعدوبرق، کیفیت هوا و تمامی ۳۱ استان و ۷۳۸ شهر ایران.
> **همهٔ منابع داده آزاد و key‌بنشدنی هستند.**

---

## ✨ امکانات

### 🌤 هواشناسی کامل
- **دمای واقعی و احساس واقعی** (apparent temperature) با انیمیشنِ تغییرِ دما
- **رطوبت هوا**، نقطه‌ی شبنم، فشارِ هوا (hPa)، دید، پوششِ ابر
- **باد** با سرعت، gust و جهتِ فارسی (north/south/…)
- **شاخصِ UV** و زمانِ تابش
- - **۲۴ ساعتِ آینده** در نوارٍ قابلِ scscroll
- **هفته‌ی پیش رو (۷ روز)** با محدودهٔ دما (min/max) و درصدِ بارش
- **طلوع و غروب** با arcِ خورشیدِ انیمیشنیک
- **باران، برف، تگرگ، تنبله، جوهر** — همه با انیمیشنِ پشت‌صحنه

### 🌍 زلزله‌های زمین
- نقشهٔ ایران با **نشانه‌هایِ زنده** از USGS
- بزرگی (M)، عمق، فاصله از شهرِ شما
- لیستِ sortِ زمانی با رنگ‌بندیِ سطحِ خطر
- back-up از EMSC در صورتِ عدم دسترسی در صورتِ عدم دسترسی

### ⚡ رعدوبرق
- نقشهٔ رعدوبرقِ ایران با strikeهایِ زنده
- دو حالت: **feed زنده** (هر JSON عمومی) یا **شبیه‌سازِ storm** مبتنی بر
  بارشِ واقعیِ Open-Meteo
- سطحِ خطرِ زنده با pulse

### 🌫 کیفیت هوا
- PM2.5، PM10، NO₂، O₃، SO₂، CO
- European AQI با رنگ‌بندیِ استاندارد

### 🗺 نقشهٔ هواشناسی ایران
- دمای هر استان به‌صورتِ نشانه‌هایِ دما روی نقشهٔ ایران
- رایگان، بدون key و بدون tile server

### 🎨 طراحی و انیمیشن
- **صحنه‌یِ انیمیشنیکِ کاملِ هوا** (CustomPainter): gradianتِ آسمان، ستاره‌ها،
  خورشید با شعاع‌هایِ چرخان، ماه، ابرهایِ در حال حرکت، باران، برف،
  تنبله و رعدوبرقِ براق
- glassmorphism برای کارت‌ها
- فونت فارسی **Vazirmatn** با weights
- **اعداد فارسی** و تقویم **جلالی** (شمسی هجری) با الگوریتم test‌شده
- RTL کامل

---

## 🌐 Web preview (live now)

در این sandbox Flutter SDK نصب نیست، به‌همین‌خاطر یک نسخه‌یِ وب از همون طراحی
مستقیم از مرورگر اجرا می‌شود:

```bash
cd iranweather/preview
python3 -m http.server 8000 --bind 0.0.0.0
# باز کن:  http://localhost:8000
```

تصویرِ زندهٔ UI + انیمیشنِ آسمان + integrationِ واقعیِ Open-Meteo/USGS از
مرورگرِ شما می‌رسد (این APIها CORS enabled هستند).

---

---

## 🚀 راه‌اندازی

### یک‌خطی: ساختِ APK
```bash
cd iranweather
./build_apk.sh
```
script، اگر Flutter SDK نصب نباشد خودش از GitHub دریافت می‌کند، پلتفرم android
را می‌سازد، `pub get` انجام می‌دهد و `flutter build apk --release` اجرا می‌کند.
APK در اینجا ساخته می‌شود:

```
build/app/outputs/flutter-apk/app-release.apk
```

برای ABIهایِ جداگانه (arm64 / armv7 / x86_64): `./build_apk.sh --split-per-abi`

### دستی
```bash
flutter create --platforms=android,ios .
flutter pub get
flutter run
flutter build apk --release
```
> `flutter create .` فقط اسکیلفوردِ native را اضافه می‌کند و فایل‌هایِ موجود
> (pubspec.yaml، lib/، assets/) را الدارات نمی‌کند.
> نسخه‌یِ وب پیش‌نمایش در `preview/` است و با پلتفرمِ webِ Flutter (که
> `flutter create` می‌سازد) تضاد ندارد.

### ۴. permissionِ مکان (Android)
در `android/app/src/main/AndroidManifest.xml` اضافه کنید:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```
و در `android/app/src/main/AndroidManifest.xml` داخلِ `<application>`:
```xml
<meta-data
    android:name="io.flutter.geolocator.useMock"
    android:value="false" />
```
iOS: در `ios/Runner/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>برای نمایشِ هوا در شهرِ شما.</string>
```

---

## 📡 منابع داده (همهٔ آن‌ها آزاد)

| Service | URL | key |
|---|---|---|
| هواشناسی | `api.open-meteo.com/v1/forecast` | — |
| کیفیت هوا | `air-quality-api.open-meteo.com/v1/air-quality` | — |
| geocoding | `geocoding-api.open-meteo.com/v1/search` | — |
| زلزله | `earthquake.usgs.gov/fdsnws/event/1/query` | — |
| زلزله (back-up) | `www.seismicportal.eu/fdsnws/event/1/query` | — |

**نهایتاً key نیاز نیست.** برنامه work می‌کند بدون ثبتِ هیچ API key.

### دیتابیس شهرهای ایران
`lib/data/cities.dart` (تولیدشده با `tools/build_assets.py`)
منبع: [MrAlfak/List-of-provinces-and-cities-of-Iran](https://github.com/MrAlfak/List-of-provinces-and-cities-of-Iran)
(GPL-3.0 برای دیتابیس). ۷۳۸ شهرِ واقعی با lat/lon و استان.

### نقشهٔ استان‌ها
`assets/maps/iran_provinces.geojson` — منبع:
[ssepehrnoush/Iran-geojson-map-boundaries](https://github.com/ssepehrnoush/Iran-geojson-map-boundaries)
به‌صورتِ ساده‌شده (۳۱ استان، ۷۸ KB).

### فونت
[Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL OFL 1.1).

---

## 🔧 بازسازیِ assets

```bash
python3 tools/build_assets.py
```
این script:
1. نقشهٔ استان‌ها را دانلود، simple می‌کند و به `assets/maps/` می‌نویسد
2. ۷۳۸ شهر را به `lib/data/cities.dart` تبدیل می‌کند
3. iconِ app را با writerِ pngِ Python generate می‌کند

### ✅ checkِโครงสร้าง
چون Flutter SDK در این sandbox نصب نیست، یک checkِ ساختاری وجود دارد:
```bash
python3 tools/validate_dart.py
```
بالا و پایینِ parentheses، importهایِ resolve، character set و
duplicate classes را بررسی می‌کند.

---

## 🧪 test
```bash
flutter test
```
- `jalaali_test.dart` — تقویم جلالی با Nowruzهایِ معروف
- `cities_test.dart` — دیتابیس شهرها
- `weather_codes_test.dart` — کدهای WMO و پالت‌های رنگی
- `persian_number_test.dart` — اعداد فارسی
- `earthquake_model_test.dart` — مدل زلزله

---

## 📁 ساختار

```
iranweather/
├── lib/
│   ├── main.dart                  # entry + MaterialApp
│   ├── app.dart                   # bottom nav + provider
│   ├── core/
│   │   ├── constants/weather_codes.dart    # WMO → وضعیت + پالت رنگ
│   │   ├── models/                  # City, Earthquake, Weather…
│   │   ├── network/api_client.dart  # http wrapper + retry
│   │   ├── services/                # weather, earthquake, lightning, air, location
│   │   ├── state/app_state.dart     # ChangeNotifier
│   │   ├── theme/app_theme.dart
│   │   └── utils/                   # jalaali, persian_number, units
│   ├── data/
│   │   ├── cities.dart              # 738 شهر (GENERATED)
│   │   └── map_data.dart            # GeoJSON → contour
│   ├── features/
│   │   ├── home/                    # صفحه‌ی اصلی
│   │   ├── earthquakes/             # زلزله‌ها
│   │   ├── lightning/               # رعدوبرق
│   │   ├── map/                     # نقشهٔ هواشناسی ایران
│   │   ├── cities/                  # انتخاب شهر
│   │   └── settings/                # تنظیمات
│   └── shared/
│       ├── painters/                # scene آسمان، icon هوا، نقشهٔ ایران
│       └── widgets/                 # glass card، shimmer، counting number
├── assets/{fonts,maps,icon}/
├── test/
└── tools/{build_assets.py,validate_dart.py}
```

---

## ⚖️ مجوزها

- کدی: این repo — مجوزِ kodaoke hkim
- دیتابیس شهرها: GPL-3.0 (منبع اصلی)
- نقشهٔ استان‌ها: مجوزِ DATA-LICENSE در repo اصلی
- فونت Vazirmatn: SIL OFL 1.1
- الگوریتمِ تقویم جلالی: منتقل‌شده از `shamsi_date` (BSD)

---

## 🚧 محدودیت‌ها و جایِ پیشرفت

- **GPS**: pluginِ `geolocator` استفاده می‌شود. بدون آن، برنامه به تهران fallback می‌کند.
- **رعدوبرق**: تا زمانی که feedِ عمومیِ key‌بنشدنی پیدا نشود، از شبیه‌ساز
  storm استفاده می‌شود که بر اساس بارشِ واقعی کار می‌کند. هر feed JSON عمومی
  در تنظیمات قابلِ تنظیم است.
- **هشدارهایِ real-time** (رسمت) نیازمند push service دارد.
- **تست‌ها**: به‌صورتِ unit test نوشته شده‌اند.
