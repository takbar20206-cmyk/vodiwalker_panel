# ============================================================
# VodiWalker Toolkit — smoke test (headless)
# هم روی لینوکس (QT_QPA_PLATFORM=offscreen) و هم روی ویندوز اجرا می‌شود.
# ============================================================

import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vwtk import core  # noqa: E402
from vwtk.app import MainWindow, load_fonts, sample_links_text  # noqa: E402


def main() -> None:
    # ---- 1) parser ----
    text = sample_links_text()
    configs, errors = core.parse_input(text)
    assert len(configs) == 3, f"expected 3 configs, got {len(configs)} ({errors})"
    protos = sorted(c.protocol for c in configs)
    assert protos == ["trojan", "vless", "vmess"], protos
    for c in configs:
        assert c.host and c.port > 0, c
        assert c.details(), "details must not be empty"

    # ---- 2) subscription (base64) ----
    sub = core.b64_encode_text("\n".join(c.raw for c in configs))
    sub_configs, sub_errors = core.parse_input(sub)
    assert len(sub_configs) == 3, f"subscription parse failed: {sub_errors}"

    # ---- 3) shadowsocks (both formats) ----
    import base64 as _b64
    userinfo = _b64.b64encode(b"aes-256-gcm:p@ss").decode()
    ss_sip002 = f"ss://{userinfo}@192.0.2.5:8388#ss-sip002"
    cfgs_a, err_a = core.parse_input(ss_sip002)
    assert len(cfgs_a) == 1 and cfgs_a[0].host == "192.0.2.5" and cfgs_a[0].port == 8388, err_a
    assert cfgs_a[0].auth == "aes-256-gcm:p@ss", cfgs_a[0].auth
    ss_legacy = "ss://" + core.b64_encode_text("aes-256-gcm:p@ss@192.0.2.5:8388") + "#ss-legacy"
    cfgs_b, err_b = core.parse_input(ss_legacy)
    assert len(cfgs_b) == 1 and cfgs_b[0].host == "192.0.2.5" and cfgs_b[0].port == 8388, err_b

    # ---- 4) qr ----
    png = core.qr_png_bytes(configs[0].raw)
    assert png.startswith(b"\x89PNG"), "qr must be png"

    # ---- 5) utilities ----
    u = core.new_uuid()
    assert len(u) == 36
    assert core.b64_decode_text(core.b64_encode_text("سلام VodiWalker")) == "سلام VodiWalker"

    # ---- 6) connection test against a guaranteed-unreachable port (fast local) ----
    res = core.test_endpoint("127.0.0.1", 1, timeout=1.0)  # port 1 closed → refused/dns-ok
    assert "ok" in res and ("tcp_ms" in res)

    # ---- 7) UI boots headless ----
    from PySide6.QtWidgets import QApplication

    app = QApplication.instance() or QApplication([])
    load_fonts()
    from PySide6.QtCore import Qt
    app.setLayoutDirection(Qt.RightToLeft)
    win = MainWindow()
    win.set_configs(configs, [])
    win.show()
    app.processEvents()
    assert win.configs_tab.table.rowCount() == 3
    win.test_tab.sync_from_configs()
    assert win.test_tab.table.rowCount() == 3
    win.close()
    app.processEvents()

    print("SMOKE OK — parser, subscription, ss, qr, utils, net, UI")


if __name__ == "__main__":
    main()
