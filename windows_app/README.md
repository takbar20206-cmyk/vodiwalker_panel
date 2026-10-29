# 🪟 VodiWalker Toolkit — اپلیکیشن ویندوز

اپ دسکتاپ ویندوز (فارسی/RTL) مکمل پنل VodiWalker با سه بخش:

| بخش | توضیح |
|------|--------|
| **کانفیگ‌ها** | جای‌گذاری لینک‌های `vless://` ، `vmess://` ، `trojan://` ، `ss://` یا سابسکریپشن → تجزیه کامل، نمایش جزئیات و **QR** برای انتقال به کلاینت موبایل، کپی/ذخیره در فایل |
| **تست اتصال** | تست هم‌زمان TCP و TLS سرورها با نمایش زمان پاسخ (میلی‌ثانیه)، قابلیت لغو و انتخاب مهلت پاسخ |
| **ابزارها** | تولید UUID، تبدیل Base64، و باز کردن سریع آدرس پنل در مرورگر |

## روش ۱ — دانلود آماده (پیشنهادی)

در تب **Actions** مخزن، آخرین اجرای workflow با نام **windows-build** را باز کنید و از قسمت **Artifacts** این دو فایل را دانلود کنید:

- `VodiWalker-Toolkit-Setup-1.0.0.exe` — نصب‌کننده (با میان‌بر منوی Start و دسکتاپ)
- `VodiWalker-Toolkit-win64.zip` — نسخه قابل حمل (بدون نصب، اجرا از داخل فایل zip)

> ساخت خودکار با هر تغییر در پوشه `windows_app/` روی شاخه جاری انجام می‌شود.

## روش ۲ — ساخت محلی روی ویندوز

پیش‌نیازها: [Python 3.11+](https://www.python.org/downloads/) و [Inno Setup 6](https://jrsoftware.org/isdl.php)

```bat
cd windows_app
build.bat
```

خروجی‌ها در `windows_app\..\dist\`:

- `VodiWalkerToolkit\VodiWalkerToolkit.exe` — نسخه قابل حمل
- `VodiWalker-Toolkit-Setup-1.0.0.exe` — نصب‌کننده

## ساختار پوشه

```
windows_app/
├── main.py                  # نقطهٔ اجرا
├── smoke_test.py            # تست دود بدون رابط گرافیکی
├── vwtk/
│   ├── core.py              # تجزیه کانفیگ، تست اتصال، QR، ابزارها
│   └── app.py               # رابط کاربری PySide6 (فارسی/RTL)
├── assets/
│   ├── icon.png / icon.ico  # آیکون اپ و فایل اجرایی
│   └── fonts/               # فونت Vazirmatn (لایسنس OFL — پوشه OFL.txt)
├── VodiWalkerToolkit.spec   # پیکربندی PyInstaller
├── version_info.txt         # اطلاعات نسخه در properties فایل اجرایی
├── installer.iss            # پیکربندی نصب‌کننده Inno Setup
├── requirements.txt         # وابستگی‌های پایتون
└── build.bat                # اسکریپت ساخت محلی
```

## تست دود (بدون نیاز به نمایشگر)

```bash
QT_QPA_PLATFORM=offscreen python windows_app/smoke_test.py
```

## نکته‌ها

- فونت **Vazirmatn** تحت لایسنس SIL Open Font License — متن کامل در `assets/fonts/OFL.txt`.
- اپ روی ویندوزهای ۶۴بیتی (Windows 10/11) اجرا می‌شود.
- نصب‌کننده نصب per-user است و نیازی به دسترسی Administrator ندارد.
