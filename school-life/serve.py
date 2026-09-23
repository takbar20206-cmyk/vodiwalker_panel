#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
School Life: Open Campus — سرور استاتیک با تنظیم «هیچ‌چیز کش نشود»
------------------------------------------------------------------
بدون هیچ وابستگی بیرونی (فقط کتابخانهٔ استاندارد پایتون).

چرا این فایل لازم است؟
  سرور پیش‌فرض `python -m http.server` هیچ هدر کش نمی‌فرستد؛ به همین دلیل
  مرورگر فایل‌های بازی (index.html و ماژول‌های src/*.js) را از حافظهٔ کش
  قدیمی سرو می‌کند و بعد از تغییر کد، نسخهٔ قدیمی بازی اجرا می‌شود.
  این سرور همیشه ۲۰۰ و نسخهٔ تازه می‌فرستد + هدرهای no-store.

اجرا:
  python serve.py            # پورت ۸۰۸۰ روی همهٔ کارت‌های شبکه
  python serve.py 9000       # پورت دلخواه
  python serve.py --open     # بعد از بالا آمدن، مرورگر را هم باز می‌کند
"""

import os
import sys
import webbrowser
import http.server
import socketserver
from functools import partial

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))
NO_CACHE = "no-store, no-cache, must-revalidate, max-age=0"


class Handler(http.server.SimpleHTTPRequestHandler):
    """فایل‌ها را همیشه تازه و بدون کش می‌فرستد."""

    server_version = "SchoolLifeDev/1.0"

    def send_head(self):
        # درخواست‌های شرطی را نادیده بگیر تا هرگز ۳۰۴ برگردانده نشود
        for header in ("If-Modified-Since", "If-None-Match", "If-Range", "If-Match"):
            if header in self.headers:
                del self.headers[header]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", NO_CACHE)
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

    def guess_type(self, path):
        # ماژول‌های ES باید با MIME درست سرو شوند
        if path.endswith(".js") or path.endswith(".mjs"):
            return "text/javascript; charset=utf-8"
        if path.endswith(".json"):
            return "application/json; charset=utf-8"
        return super().guess_type(path)

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    global PORT
    open_browser = False
    for arg in sys.argv[1:]:
        if arg in ("--open", "-o", "open"):
            open_browser = True
        elif arg.isdigit():
            PORT = int(arg)
        elif arg in ("-h", "--help"):
            print(__doc__)
            return

    handler = partial(Handler, directory=ROOT)
    try:
        httpd = Server(("0.0.0.0", PORT), handler)
    except OSError as exc:
        print("[خطا] پورت %d آزاد نیست: %s" % (PORT, exc))
        print("با یک پورت دیگر امتحان کن، مثلاً: python serve.py %d" % (PORT + 1))
        sys.exit(1)

    url = "http://localhost:%d/" % PORT
    print("=" * 52)
    print("  School Life: Open Campus — سرور محلی")
    print("  پوشه: %s" % ROOT)
    print("  آدرس: %s" % url)
    print("  (هیچ فایلی کش نمی‌شود — همیشه آخرین نسخه لود می‌شود)")
    print("  برای بستن، این پنجره را ببند یا Ctrl+C بزن.")
    print("=" * 52)
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nسرور متوقف شد.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
