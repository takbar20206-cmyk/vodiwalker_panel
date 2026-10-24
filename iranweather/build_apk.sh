#!/usr/bin/env bash
#
# IranWeather — ساختِ APK با یک خط
#
# کاری که این script انجام می‌دهد:
#   ۱. اگر Flutter SDK نصب نباشد، از GitHub دریافت می‌کند
#   ۲. پلتفرم android رو می‌سازد  (pubspec.yaml و lib/ رو دست نمی‌زند)
#   ۳. flutter pub get
#   ۴. flutter build apk --release
#
# مصرف:
#   ./build_apk.sh                # universal APK (یک فایل، همه‌یِ ABI)
#   ./build_apk.sh --split-per-abi  # arm64 / armv7 / x86_64 جداگانه
#
set -euo pipefail

cd "$(dirname "$0")"

SDK_DIR="${FLUTTER_HOME:-$HOME/flutter}"

# ── ۱. Flutter SDK ─────────────────────────────────────────────────
if ! command -v flutter >/dev/null 2>&1; then
  if [ ! -x "$SDK_DIR/bin/flutter" ]; then
    echo ">> Flutter SDK نصب نیست؛ از GitHub دریافت می‌شود…"
    command -v git >/dev/null 2>&1 || { echo "!! git لازم است (apt install git)"; exit 1; }
    git clone --depth 1 https://github.com/flutter/flutter.git "$SDK_DIR"
  else
    echo ">> Flutter SDK از $SDK_DIR پیدا شد."
  fi
  export PATH="$SDK_DIR/bin:$PATH"
fi

command -v flutter >/dev/null 2>&1 || { echo "!! flutter پیدا نشد"; exit 1; }

flutter --version

# ── ۲. پیش‌محولیات ────────────────────────────────────────────────
command -v java >/dev/null 2>&1 || echo "!! هشدار: java در PATH نیست؛ Android لازمه‌یِ JDK ۱7+ دارد."

flutter precache --android || true

# ── ۳. پلتفرم android ─────────────────────────────────────────────
flutter create --platforms=android .

# ── ۴. وابستگی‌ها و ساختِ APK ────────────────────────────────────
flutter pub get
flutter build apk --release "$@"

echo
echo "================================================"
echo "  APK ساخته شد:"
ls -lh build/app/outputs/flutter-apk/*.apk
echo "================================================"
echo "برای نصب: روی گوشی برگه‌یِ نصب را باز کن، این APK را انتخاب کن."
