# ============================================================
# VodiWalker Toolkit — رابط کاربری (PySide6 / فارسی / RTL)
# ============================================================

from __future__ import annotations

import json
import sys
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import Qt, QSettings, QThread, QSize, Signal
from PySide6.QtGui import QColor, QFont, QFontDatabase, QIcon, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QFileDialog,
    QFrame,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QSizePolicy,
    QSplitter,
    QStatusBar,
    QTabWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from . import APP_CHANNEL_URL, APP_NAME, APP_SUPPORT_URL, APP_VERSION
from . import core

FONT_FAMILY = "Vazirmatn"
ERR_LABELS = {
    "dns": "خطای DNS",
    "timeout": "تایم‌اوت",
    "refused": "رد اتصال",
    "unreachable": "غیرقابل‌دسترس",
    "internal": "خطای داخلی",
    "": "نامشخص",
}

COLOR_OK = "#2fe08b"
COLOR_FAIL = "#ff5c7a"
COLOR_WARN = "#ffc857"
COLOR_MUTED = "#9aa7bc"
COLOR_ACCENT = "#35d6ff"


# ------------------------------------------------------------
# resource paths (dev + PyInstaller)
# ------------------------------------------------------------

def resource(rel: str) -> str:
    candidates: list[Path] = []
    if hasattr(sys, "_MEIPASS"):
        candidates.append(Path(sys._MEIPASS) / rel)
    here = Path(__file__).resolve().parent          # .../windows_app/vwtk
    candidates.append(here.parent / rel)            # .../windows_app/<rel>
    for c in candidates:
        if c.exists():
            return str(c)
    return str(candidates[-1])


def load_fonts() -> str:
    fonts_dir = Path(resource("assets/fonts"))
    loaded_family = "Tahoma"
    for name in ("Vazirmatn-Regular.ttf", "Vazirmatn-Medium.ttf", "Vazirmatn-Bold.ttf"):
        path = fonts_dir / name
        if path.exists():
            QFontDatabase.addApplicationFont(str(path))
            loaded_family = FONT_FAMILY
    return loaded_family


# ------------------------------------------------------------
# stylesheets
# ------------------------------------------------------------

QSS = """
* { outline: none; }

QMainWindow, QWidget#root {
    background: #070a12;
    color: #eef2ff;
}
QLabel { background: transparent; color: #eef2ff; }
QLabel[muted="true"] { color: #9aa7bc; font-size: 12px; }
QLabel#title { font-size: 19px; font-weight: 800; color: #ffffff; }
QLabel#subtitle { color: #9aa7bc; font-size: 12px; }
QLabel#chip {
    background: rgba(124, 92, 255, 0.14);
    border: 1px solid rgba(124, 92, 255, 0.45);
    color: #b9a8ff;
    border-radius: 999px;
    padding: 5px 14px;
    font-size: 11px;
    font-weight: bold;
}
QLabel#count { color: #9aa7bc; font-size: 12px; }
QLabel#sectionTitle { font-size: 14px; font-weight: 800; color: #ffffff; }
QLabel#qr {
    background: #ffffff;
    border: 1px solid #1b2440;
    border-radius: 12px;
    padding: 8px;
    min-width: 190px;
    min-height: 190px;
    max-width: 190px;
    max-height: 190px;
}
QLabel#qrEmpty {
    background: #0b1120;
    border: 1px dashed #26304d;
    border-radius: 12px;
    color: #5a6580;
    font-size: 12px;
    min-width: 190px;
    min-height: 190px;
    max-width: 190px;
    max-height: 190px;
}

QFrame#header {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #0d1320, stop:1 #111a2e);
    border: 1px solid #1b2440;
    border-radius: 18px;
}
QFrame#card {
    background: #0d1320;
    border: 1px solid #1b2440;
    border-radius: 16px;
}

QTabWidget::pane {
    border: 1px solid #1b2440;
    border-radius: 14px;
    background: #0a0f1c;
    top: -1px;
}
QTabBar::tab {
    background: #0d1320;
    color: #9aa7bc;
    padding: 10px 26px;
    border: 1px solid #1b2440;
    border-bottom: none;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    margin: 0 4px;
    font-weight: bold;
    font-size: 13px;
}
QTabBar::tab:selected {
    background: #0a0f1c;
    color: #35d6ff;
    border-color: #7c5cff;
}
QTabBar::tab:hover:!selected { color: #eef2ff; }

QPushButton {
    background: #131c30;
    color: #eef2ff;
    border: 1px solid #222d4d;
    border-radius: 10px;
    padding: 9px 20px;
    font-weight: bold;
    font-size: 13px;
}
QPushButton:hover { background: #182342; border-color: #2f3c66; }
QPushButton:pressed { background: #0f1626; }
QPushButton:disabled {
    background: #0e1424;
    color: #5a6580;
    border-color: #161f38;
}
QPushButton[variant="primary"] {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #7c5cff, stop:1 #5b3df0);
    border: none;
    color: #ffffff;
}
QPushButton[variant="primary"]:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #8d71ff, stop:1 #6c4ff5);
}
QPushButton[variant="primary"]:disabled {
    background: #2a2456;
    color: #7d78a8;
}
QPushButton[variant="danger"] {
    background: #2a1220;
    border: 1px solid #4a1f33;
    color: #ff8fa3;
}
QPushButton[variant="danger"]:hover { background: #38162a; border-color: #6e2a45; }
QPushButton[variant="danger"]:disabled {
    background: #1a1018;
    color: #6b4a55;
    border-color: #2a1a22;
}
QPushButton[variant="ghost"] {
    background: transparent;
    border: 1px solid #222d4d;
    color: #9aa7bc;
}
QPushButton[variant="ghost"]:hover { color: #eef2ff; border-color: #2f3c66; background: #101828; }

QLineEdit, QPlainTextEdit, QComboBox {
    background: #0b1120;
    color: #eef2ff;
    border: 1px solid #1b2440;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    selection-background-color: #7c5cff;
    selection-color: #ffffff;
}
QLineEdit:focus, QPlainTextEdit:focus, QComboBox:focus { border-color: #7c5cff; }
QLineEdit:read-only, QPlainTextEdit:read-only { color: #b9c4dd; background: #0a0f1c; }
QPlainTextEdit { font-family: 'Vazirmatn', 'Tahoma'; }
QComboBox::drop-down { border: none; width: 26px; }
QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #9aa7bc;
    margin-right: 10px;
}
QComboBox QAbstractItemView {
    background: #111a2a;
    color: #eef2ff;
    border: 1px solid #1b2440;
    selection-background-color: #2a2f66;
    selection-color: #ffffff;
    outline: none;
}

QTableWidget {
    background: #0b1120;
    alternate-background-color: #0e1526;
    border: 1px solid #1b2440;
    border-radius: 12px;
    gridline-color: #161f38;
    selection-background-color: #2a2f66;
    selection-color: #ffffff;
    font-size: 13px;
    padding: 4px;
}
QTableWidget::item { padding: 6px 8px; border: none; }
QHeaderView::section {
    background: #111a2a;
    color: #9aa7bc;
    border: none;
    border-bottom: 1px solid #1b2440;
    border-left: 1px solid #111a2a;
    padding: 9px 10px;
    font-weight: bold;
    font-size: 12px;
}
QHeaderView::section:hover { color: #35d6ff; }
QTableView::corner { background: #111a2a; border: none; }

QProgressBar {
    background: #0b1120;
    border: 1px solid #1b2440;
    border-radius: 9px;
    text-align: center;
    color: #eef2ff;
    font-size: 11px;
    min-height: 18px;
    max-height: 18px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #35d6ff, stop:1 #7c5cff);
    border-radius: 8px;
}

QGroupBox {
    background: #0d1320;
    border: 1px solid #1b2440;
    border-radius: 16px;
    margin-top: 16px;
    padding: 18px 14px 14px 14px;
    font-weight: bold;
    color: #ffffff;
}
QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top right;
    right: 14px;
    top: 2px;
    padding: 0 8px;
    background: #0d1320;
    color: #35d6ff;
    font-size: 13px;
}

QSplitter::handle { background: #0a0f1c; width: 8px; height: 8px; border-radius: 4px; }
QSplitter::handle:hover { background: #2a2f66; }

QScrollBar:vertical {
    background: transparent;
    width: 11px;
    margin: 2px;
}
QScrollBar::handle:vertical {
    background: #26304d;
    border-radius: 5px;
    min-height: 32px;
}
QScrollBar::handle:vertical:hover { background: #35d6ff; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; background: transparent; }
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }
QScrollBar:horizontal {
    background: transparent;
    height: 11px;
    margin: 2px;
}
QScrollBar::handle:horizontal {
    background: #26304d;
    border-radius: 5px;
    min-width: 32px;
}
QScrollBar::handle:horizontal:hover { background: #35d6ff; }
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0; background: transparent; }
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal { background: transparent; }

QStatusBar { background: #070a12; color: #9aa7bc; border-top: 1px solid #131c30; }
QStatusBar::item { border: none; }

QMessageBox { background: #0d1320; }
QMessageBox QLabel { color: #eef2ff; }

QToolTip {
    background: #111a2a;
    color: #eef2ff;
    border: 1px solid #7c5cff;
    padding: 6px 10px;
    font-size: 12px;
}
"""


# ------------------------------------------------------------
# تست اتصال در پس‌زمینه
# ------------------------------------------------------------

class TestWorker(QThread):
    row_done = Signal(int, object)
    progressed = Signal(int, int)
    all_done = Signal(int, int)

    def __init__(self, configs: list[core.Config], timeout: float, parent=None):
        super().__init__(parent)
        self._configs = list(configs)
        self._timeout = timeout
        self._cancel = threading.Event()

    def cancel(self) -> None:
        self._cancel.set()

    def run(self) -> None:
        ok = fail = done = 0
        total = len(self._configs)

        def on_result(idx: int, res: dict) -> None:
            nonlocal ok, fail, done
            if self._cancel.is_set():
                return
            done += 1
            if res.get("ok"):
                ok += 1
            else:
                fail += 1
            self.row_done.emit(idx, res)
            self.progressed.emit(done, total)

        try:
            core.test_many(
                self._configs,
                timeout=self._timeout,
                max_workers=8,
                cancel_event=self._cancel,
                on_result=on_result,
            )
        except Exception:
            pass
        self.all_done.emit(ok, fail)


# ------------------------------------------------------------
# تب ۱ — کانفیگ‌ها
# ------------------------------------------------------------

class ConfigsTab(QWidget):
    COLS = ["نام", "پروتکل", "آدرس", "پورت", "امنیت", "ترنسپورت"]

    def __init__(self, window: "MainWindow"):
        super().__init__()
        self.window_ref = window

        root = QVBoxLayout(self)
        root.setContentsMargins(14, 14, 14, 14)
        root.setSpacing(10)

        self.editor = QPlainTextEdit()
        self.editor.setPlaceholderText(
            "لینک کانفیگ‌ها را اینجا جای‌گذاری کنید…\n"
            "پشتیبانی از VLESS / VMess / Trojan / Shadowsocks و سابسکریپشن (Subscription)"
        )
        self.editor.setMinimumHeight(104)
        root.addWidget(self.editor, 0)

        bar = QHBoxLayout()
        bar.setSpacing(8)
        btn_parse = QPushButton("تجزیه لینک‌ها")
        btn_parse.setProperty("variant", "primary")
        btn_parse.clicked.connect(self.parse_now)
        btn_sample = QPushButton("درج نمونه")
        btn_sample.setProperty("variant", "ghost")
        btn_sample.clicked.connect(self.insert_sample)
        btn_clear = QPushButton("پاک کردن")
        btn_clear.setProperty("variant", "ghost")
        btn_clear.clicked.connect(self.clear_all)
        btn_save = QPushButton("ذخیره در فایل…")
        btn_save.setProperty("variant", "ghost")
        btn_save.clicked.connect(self.save_to_file)
        self.count_label = QLabel("هنوز لینکی تجزیه نشده است")
        self.count_label.setProperty("id", "count")
        self.count_label.setObjectName("count")
        bar.addWidget(btn_parse)
        bar.addWidget(btn_sample)
        bar.addWidget(btn_clear)
        bar.addWidget(btn_save)
        bar.addStretch(1)
        bar.addWidget(self.count_label)
        root.addLayout(bar, 0)

        splitter = QSplitter(Qt.Horizontal)
        splitter.setChildrenCollapsible(False)

        # جدول
        left = QWidget()
        lv = QVBoxLayout(left)
        lv.setContentsMargins(0, 0, 0, 0)
        lv.setSpacing(6)
        title = QLabel("کانفیگ‌های تجزیه‌شده")
        title.setProperty("id", "sectionTitle")
        title.setObjectName("sectionTitle")
        lv.addWidget(title)
        self.table = QTableWidget(0, len(self.COLS))
        self.table.setHorizontalHeaderLabels(self.COLS)
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setDefaultSectionSize(34)
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.Stretch)
        for c in range(1, len(self.COLS)):
            header.setSectionResizeMode(c, QHeaderView.ResizeToContents)
        header.setMinimumSectionSize(56)
        self.table.itemSelectionChanged.connect(self.show_details)
        self.table.cellDoubleClicked.connect(self.copy_link_of_row)
        lv.addWidget(self.table, 1)

        # جزئیات
        right = QWidget()
        rv = QVBoxLayout(right)
        rv.setContentsMargins(0, 0, 0, 0)
        rv.setSpacing(6)
        title2 = QLabel("جزئیات و QR")
        title2.setProperty("id", "sectionTitle")
        title2.setObjectName("sectionTitle")
        rv.addWidget(title2)

        self.details = QPlainTextEdit()
        self.details.setReadOnly(True)
        self.details.setPlaceholderText("برای نمایش جزئیات، یک ردیف را انتخاب کنید…")
        self.details.setMinimumHeight(150)
        rv.addWidget(self.details, 1)

        qr_row = QHBoxLayout()
        self.qr_label = QLabel("QR کانفیگ اینجا نمایش داده می‌شود")
        self.qr_label.setObjectName("qrEmpty")
        self.qr_label.setAlignment(Qt.AlignCenter)
        self.qr_label.setWordWrap(True)
        qr_row.addWidget(self.qr_label, 0, Qt.AlignTop)

        qr_btns = QVBoxLayout()
        qr_btns.setSpacing(8)
        btn_copy_link = QPushButton("کپی لینک")
        btn_copy_link.clicked.connect(self.copy_selected_link)
        btn_copy_details = QPushButton("کپی جزئیات")
        btn_copy_details.setProperty("variant", "ghost")
        btn_copy_details.clicked.connect(self.copy_selected_details)
        btn_add_test = QPushButton("رفتن به تست اتصال")
        btn_add_test.setProperty("variant", "ghost")
        btn_add_test.clicked.connect(lambda: self.window_ref.tabs.setCurrentIndex(1))
        qr_btns.addWidget(btn_copy_link)
        qr_btns.addWidget(btn_copy_details)
        qr_btns.addWidget(btn_add_test)
        qr_btns.addStretch(1)
        qr_row.addLayout(qr_btns, 1)
        rv.addLayout(qr_row, 0)

        splitter.addWidget(left)
        splitter.addWidget(right)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        splitter.setSizes([640, 420])
        root.addWidget(splitter, 1)

    # ---------------- actions ----------------

    def parse_now(self) -> None:
        text = self.editor.toPlainText()
        configs, errors = core.parse_input(text)
        self.window_ref.set_configs(configs, errors)

    def insert_sample(self) -> None:
        self.editor.setPlainText(sample_links_text())
        self.parse_now()

    def clear_all(self) -> None:
        self.editor.clear()
        self.window_ref.set_configs([], [])

    def refresh(self) -> None:
        configs = self.window_ref.configs
        self.table.setRowCount(0)
        for cfg in configs:
            row = self.table.rowCount()
            self.table.insertRow(row)
            values = [cfg.name, cfg.protocol_label, cfg.host, str(cfg.port),
                      cfg.security_label, cfg.transport_label]
            for col, value in enumerate(values):
                item = QTableWidgetItem(value)
                if col == 0:
                    item.setToolTip(cfg.raw)
                self.table.setItem(row, col, item)
        n, e = len(configs), len(self.window_ref.parse_errors)
        if n and e:
            self.count_label.setText(f"{n} کانفیگ معتبر · {e} مورد نامعتبر")
            self.count_label.setStyleSheet(f"color: {COLOR_WARN};")
        elif n:
            self.count_label.setText(f"{n} کانفیگ تجزیه شد")
            self.count_label.setStyleSheet(f"color: {COLOR_OK};")
        elif e:
            self.count_label.setText(f"هیچ لینک معتبری پیدا نشد ({e} خطا)")
            self.count_label.setStyleSheet(f"color: {COLOR_FAIL};")
        else:
            self.count_label.setText("هنوز لینکی تجزیه نشده است")
            self.count_label.setStyleSheet(f"color: {COLOR_MUTED};")

        self.details.clear()
        self._set_qr(None)
        if configs:
            # NOTE: QTableView.selectRow() is a no-op under RightToLeft in Qt 6.12;
            # setCurrentCell selects the whole row correctly in both directions.
            self.table.setCurrentCell(0, 0)
        self.table.resizeColumnsToContents()
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)

    def _selected_config(self) -> core.Config | None:
        row = self.table.currentRow()
        configs = self.window_ref.configs
        if 0 <= row < len(configs):
            return configs[row]
        return None

    def show_details(self) -> None:
        cfg = self._selected_config()
        if cfg is None:
            self.details.clear()
            self._set_qr(None)
            return
        lines = [f"{label}: {value}" for label, value in cfg.details()]
        self.details.setPlainText("\n".join(lines))
        self._set_qr(cfg.raw)

    def _set_qr(self, data: str | None) -> None:
        if not data:
            self.qr_label.setObjectName("qrEmpty")
            self.qr_label.setStyleSheet("")
            self.qr_label.setPixmap(QPixmap())
            self.qr_label.setText("QR کانفیگ اینجا نمایش داده می‌شود")
            self.qr_label.toolTip = ""
            return
        try:
            png = core.qr_png_bytes(data)
            pm = QPixmap()
            pm.loadFromData(png)
            pm = pm.scaled(174, 174, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.qr_label.setObjectName("qr")
            self.qr_label.setStyleSheet("")
            self.qr_label.setText("")
            self.qr_label.setPixmap(pm)
            self.qr_label.setToolTip("QR کانفیگ انتخاب‌شده — برای انتقال به کلاینت موبایل اسکن کنید")
        except Exception:
            self._set_qr(None)

    def copy_selected_link(self) -> None:
        cfg = self._selected_config()
        if cfg:
            QApplication.clipboard().setText(cfg.raw)
            self.window_ref.statusBar().showMessage("لینک کپی شد ✓", 3000)
        else:
            self.window_ref.statusBar().showMessage("ابتدا یک ردیف را انتخاب کنید", 3000)

    def copy_selected_details(self) -> None:
        text = self.details.toPlainText()
        if text:
            QApplication.clipboard().setText(text)
            self.window_ref.statusBar().showMessage("جزئیات کپی شد ✓", 3000)

    def copy_link_of_row(self, row: int, _col: int) -> None:
        configs = self.window_ref.configs
        if 0 <= row < len(configs):
            QApplication.clipboard().setText(configs[row].raw)
            self.window_ref.statusBar().showMessage("لینک کپی شد ✓", 3000)

    def save_to_file(self) -> None:
        configs = self.window_ref.configs
        if not configs:
            self.window_ref.statusBar().showMessage("ابتدا لینک‌ها را تجزیه کنید", 3000)
            return
        default_name = f"vodiwalker_configs_{datetime.now():%Y%m%d}.txt"
        path, _ = QFileDialog.getSaveFileName(
            self, "ذخیره کانفیگ‌ها", default_name, "Text Files (*.txt);;All Files (*)")
        if not path:
            return
        try:
            Path(path).write_text("\n".join(c.raw for c in configs), encoding="utf-8")
            self.window_ref.statusBar().showMessage(f"{len(configs)} کانفیگ ذخیره شد ✓", 4000)
        except OSError as exc:
            QMessageBox.warning(self, "خطا در ذخیره", f"ذخیره فایل ممکن نشد:\n{exc}")


# ------------------------------------------------------------
# تب ۲ — تست اتصال
# ------------------------------------------------------------

class TestTab(QWidget):
    COLS = ["نام", "آدرس سرور", "وضعیت", "TCP (ms)", "TLS (ms)"]

    def __init__(self, window: "MainWindow"):
        super().__init__()
        self.window_ref = window
        self.worker: TestWorker | None = None
        self._configs: list[core.Config] = []

        root = QVBoxLayout(self)
        root.setContentsMargins(14, 14, 14, 14)
        root.setSpacing(10)

        bar = QHBoxLayout()
        bar.setSpacing(8)
        self.btn_start = QPushButton("شروع تست")
        self.btn_start.setProperty("variant", "primary")
        self.btn_start.clicked.connect(self.start_test)
        self.btn_cancel = QPushButton("لغو")
        self.btn_cancel.setProperty("variant", "danger")
        self.btn_cancel.setEnabled(False)
        self.btn_cancel.clicked.connect(self.cancel_test)
        self.btn_sync = QPushButton("همگام‌سازی با تب کانفیگ‌ها")
        self.btn_sync.setProperty("variant", "ghost")
        self.btn_sync.clicked.connect(self.sync_from_configs)

        timeout_box = QHBoxLayout()
        timeout_box.setSpacing(6)
        lbl = QLabel("مهلت پاسخ:")
        lbl.setProperty("muted", "true")
        lbl.setProperty("id", "")
        self.timeout_combo = QComboBox()
        for secs in (3, 5, 10, 15):
            self.timeout_combo.addItem(f"{secs} ثانیه", secs)
        self.timeout_combo.setCurrentIndex(1)
        self.timeout_combo.setFixedWidth(110)
        timeout_box.addWidget(lbl)
        timeout_box.addWidget(self.timeout_combo)

        self.progress = QProgressBar()
        self.progress.setRange(0, 1)
        self.progress.setValue(0)
        self.progress.setTextVisible(True)
        self.progress.setFormat("آماده برای تست")
        self.progress.setMinimumWidth(200)

        self.summary = QLabel("برای تست، ابتدا در تب «کانفیگ‌ها» لینک‌ها را تجزیه کنید")
        self.summary.setProperty("muted", "true")

        bar.addWidget(self.btn_start)
        bar.addWidget(self.btn_cancel)
        bar.addWidget(self.btn_sync)
        bar.addLayout(timeout_box)
        bar.addStretch(1)
        bar.addWidget(self.progress, 0, Qt.AlignVCenter)
        bar.addWidget(self.summary)
        root.addLayout(bar, 0)

        self.table = QTableWidget(0, len(self.COLS))
        self.table.setHorizontalHeaderLabels(self.COLS)
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.SingleSelection)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setDefaultSectionSize(34)
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.Stretch)
        header.setSectionResizeMode(1, QHeaderView.Stretch)
        for c in range(2, len(self.COLS)):
            header.setSectionResizeMode(c, QHeaderView.ResizeToContents)
        root.addWidget(self.table, 1)

        self.window_ref.configsChanged.connect(self.sync_from_configs)
        self.sync_from_configs()

    def sync_from_configs(self) -> None:
        if self.worker is not None and self.worker.isRunning():
            return
        self._configs = list(self.window_ref.configs)
        self.table.setRowCount(0)
        for cfg in self._configs:
            row = self.table.rowCount()
            self.table.insertRow(row)
            values = [cfg.name, cfg.endpoint, "آماده", "—", "—"]
            for col, value in enumerate(values):
                item = QTableWidgetItem(value)
                if col == 2:
                    item.setForeground(QColor(COLOR_MUTED))
                self.table.setItem(row, col, item)
        self.progress.setRange(0, max(1, len(self._configs)))
        self.progress.setValue(0)
        self.progress.setFormat("آماده برای تست" if self._configs else "کانفیگی موجود نیست")
        if self._configs:
            self.summary.setText(f"{len(self._configs)} کانفیگ در صف تست")
            self.summary.setStyleSheet(f"color: {COLOR_MUTED};")
        else:
            self.summary.setText("برای تست، ابتدا در تب «کانفیگ‌ها» لینک‌ها را تجزیه کنید")
            self.summary.setStyleSheet(f"color: {COLOR_MUTED};")

    def start_test(self) -> None:
        if self.worker is not None and self.worker.isRunning():
            return
        if not self._configs:
            QMessageBox.information(
                self, "کانفیگی موجود نیست",
                "ابتدا در تب «کانفیگ‌ها» لینک‌ها را جای‌گذاری و تجزیه کنید.")
            return
        # ریست وضعیت‌ها
        for row in range(self.table.rowCount()):
            for col, value in ((2, "در صف…"), (3, "—"), (4, "—")):
                item = self.table.item(row, col)
                item.setText(value)
                item.setForeground(QColor(COLOR_MUTED))

        timeout = float(self.timeout_combo.currentData())
        self.worker = TestWorker(self._configs, timeout)
        self.worker.row_done.connect(self.on_row_done)
        self.worker.progressed.connect(self.on_progress)
        self.worker.all_done.connect(self.on_all_done)
        self.btn_start.setEnabled(False)
        self.btn_sync.setEnabled(False)
        self.btn_cancel.setEnabled(True)
        self.btn_cancel.setText("لغو")
        self.progress.setRange(0, len(self._configs))
        self.progress.setValue(0)
        self.progress.setFormat("در حال تست… %v از %m")
        self.summary.setText("در حال تست اتصال…")
        self.summary.setStyleSheet(f"color: {COLOR_ACCENT};")
        self.window_ref.statusBar().showMessage("تست اتصال آغاز شد…")
        self.worker.start()

    def cancel_test(self) -> None:
        if self.worker is not None and self.worker.isRunning():
            self.worker.cancel()
            self.btn_cancel.setEnabled(False)
            self.btn_cancel.setText("در حال لغو…")
            self.window_ref.statusBar().showMessage("در حال لغو تست…")

    def on_row_done(self, idx: int, res: object) -> None:
        if not (0 <= idx < self.table.rowCount()):
            return
        r = res if isinstance(res, dict) else {}
        ok = bool(r.get("ok"))
        status = "✓ متصل" if ok else f"✗ {ERR_LABELS.get(r.get('error', ''), 'نامشخص')}"
        tcp = f"{r.get('tcp_ms')}" if r.get("tcp_ms") is not None else "—"
        tls = f"{r.get('tls_ms')}" if r.get("tls_ms") is not None else "—"
        vals = (status, tcp, tls)
        for i, value in enumerate(vals):
            item = self.table.item(idx, 2 + i)
            item.setText(value)
            if i == 0:
                item.setForeground(QColor(COLOR_OK if ok else COLOR_FAIL))
                font = item.font()
                font.setBold(True)
                item.setFont(font)
            else:
                item.setForeground(QColor("#eef2ff" if value != "—" else COLOR_MUTED))
        self.table.scrollToItem(self.table.item(idx, 2))

    def on_progress(self, done: int, total: int) -> None:
        self.progress.setValue(done)
        self.progress.setFormat(f"در حال تست… {done} از {total}")
        self.summary.setText(f"در حال تست… {done} از {total}")
        self.summary.setStyleSheet(f"color: {COLOR_ACCENT};")

    def on_all_done(self, ok: int, fail: int) -> None:
        total = ok + fail
        self.btn_start.setEnabled(True)
        self.btn_sync.setEnabled(True)
        self.btn_cancel.setEnabled(False)
        self.btn_cancel.setText("لغو")
        cancelled = total < len(self._configs)
        if cancelled:
            self.progress.setFormat("تست لغو شد")
            self.summary.setText(f"تست لغو شد — {ok} متصل از {total} مورد تست‌شده")
            self.summary.setStyleSheet(f"color: {COLOR_WARN};")
            self.window_ref.statusBar().showMessage("تست لغو شد", 4000)
        else:
            self.progress.setFormat(f"پایان: {ok} متصل از {total}")
            self.summary.setText(f"نتیجه: {ok} متصل · {fail} ناموفق از {total}")
            color = COLOR_OK if fail == 0 else (COLOR_WARN if ok else COLOR_FAIL)
            self.summary.setStyleSheet(f"color: {color};")
            self.window_ref.statusBar().showMessage(
                f"تست تمام شد: {ok} متصل از {total}", 5000)


# ------------------------------------------------------------
# تب ۳ — ابزارها
# ------------------------------------------------------------

class ToolsTab(QWidget):
    def __init__(self, window: "MainWindow"):
        super().__init__()
        self.window_ref = window
        self.settings = QSettings("VodiWalker", "Toolkit")

        root = QVBoxLayout(self)
        root.setContentsMargins(14, 14, 14, 14)
        root.setSpacing(12)

        # --- UUID ---
        grp_uuid = QGroupBox("تولید UUID")
        gu = QVBoxLayout(grp_uuid)
        gu.setSpacing(10)
        hint = QLabel("UUID یکتا برای کانفیگ‌های VLESS / VMess")
        hint.setProperty("muted", "true")
        gu.addWidget(hint)
        row = QHBoxLayout()
        self.uuid_edit = QLineEdit()
        self.uuid_edit.setReadOnly(True)
        self.uuid_edit.setAlignment(Qt.AlignCenter)
        btn_gen = QPushButton("تولید UUID")
        btn_gen.setProperty("variant", "primary")
        btn_gen.clicked.connect(self.gen_uuid)
        btn_copy_uuid = QPushButton("کپی")
        btn_copy_uuid.clicked.connect(
            lambda: self._copy(self.uuid_edit.text(), "UUID کپی شد ✓"))
        row.addWidget(self.uuid_edit, 1)
        row.addWidget(btn_gen)
        row.addWidget(btn_copy_uuid)
        gu.addLayout(row)
        root.addWidget(grp_uuid)

        # --- Base64 ---
        grp_b64 = QGroupBox("تبدیل Base64")
        gb = QVBoxLayout(grp_b64)
        gb.setSpacing(10)
        hint2 = QLabel("متن یا لینک را تبدیل به Base64 کنید یا بالعکس")
        hint2.setProperty("muted", "true")
        gb.addWidget(hint2)
        self.b64_in = QPlainTextEdit()
        self.b64_in.setPlaceholderText("ورودی…")
        self.b64_in.setFixedHeight(96)
        self.b64_out = QPlainTextEdit()
        self.b64_out.setReadOnly(True)
        self.b64_out.setPlaceholderText("خروجی…")
        self.b64_out.setFixedHeight(96)
        btns = QHBoxLayout()
        btns.setSpacing(8)
        btn_enc = QPushButton("رمزگذاری →")
        btn_enc.clicked.connect(self.do_encode)
        btn_dec = QPushButton("← رمزگشایی")
        btn_dec.clicked.connect(self.do_decode)
        btn_copy_b64 = QPushButton("کپی خروجی")
        btn_copy_b64.setProperty("variant", "ghost")
        btn_copy_b64.clicked.connect(
            lambda: self._copy(self.b64_out.toPlainText(), "خروجی کپی شد ✓"))
        btns.addWidget(btn_enc)
        btns.addWidget(btn_dec)
        btns.addStretch(1)
        btns.addWidget(btn_copy_b64)
        gb.addWidget(self.b64_in)
        gb.addLayout(btns)
        gb.addWidget(self.b64_out)
        root.addWidget(grp_b64, 1)

        # --- panel link ---
        grp_panel = QGroupBox("دسترسی سریع به پنل")
        gp = QVBoxLayout(grp_panel)
        gp.setSpacing(10)
        hint3 = QLabel("آدرس پنل VodiWalker خود را وارد کنید تا با یک کلیک باز شود")
        hint3.setProperty("muted", "true")
        gp.addWidget(hint3)
        row3 = QHBoxLayout()
        self.panel_edit = QLineEdit()
        self.panel_edit.setPlaceholderText("https://example.com یا  http://192.168.1.10:8000")
        self.panel_edit.setText(self.settings.value("panel/url", ""))
        btn_open = QPushButton("ذخیره و باز کردن")
        btn_open.setProperty("variant", "primary")
        btn_open.clicked.connect(self.open_panel)
        row3.addWidget(self.panel_edit, 1)
        row3.addWidget(btn_open)
        gp.addLayout(row3)
        root.addWidget(grp_panel)

        self.gen_uuid()

    def _copy(self, text: str, message: str) -> None:
        if not text:
            return
        QApplication.clipboard().setText(text)
        self.window_ref.statusBar().showMessage(message, 3000)

    def gen_uuid(self) -> None:
        self.uuid_edit.setText(core.new_uuid())

    def do_encode(self) -> None:
        text = self.b64_in.toPlainText()
        if not text:
            return
        self.b64_out.setPlainText(core.b64_encode_text(text))
        self.window_ref.statusBar().showMessage("رمزنگاری Base64 انجام شد ✓", 3000)

    def do_decode(self) -> None:
        text = self.b64_in.toPlainText().strip()
        if not text:
            return
        try:
            decoded = core.b64_decode_text(text)
            if not decoded.strip():
                raise ValueError("empty")
            self.b64_out.setPlainText(decoded)
            self.window_ref.statusBar().showMessage("رمزگشایی Base64 انجام شد ✓", 3000)
        except Exception:
            QMessageBox.warning(self, "خطا", "متن واردشده Base64 معتبر نیست.")

    def open_panel(self) -> None:
        url = self.panel_edit.text().strip()
        if not url:
            QMessageBox.information(self, "آدرس پنل", "ابتدا آدرس پنل خود را وارد کنید.")
            return
        if not url.lower().startswith(("http://", "https://")):
            url = "http://" + url
        self.settings.setValue("panel/url", url)
        webbrowser.open(url)
        self.window_ref.statusBar().showMessage("پنل در مرورگر باز شد ✓", 3000)


# ------------------------------------------------------------
# پنجره اصلی
# ------------------------------------------------------------

class MainWindow(QMainWindow):
    configsChanged = Signal()

    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"{APP_NAME} — نسخه {APP_VERSION}")
        self.setMinimumSize(960, 640)
        self.resize(1180, 780)

        self.configs: list[core.Config] = []
        self.parse_errors: list[str] = []

        root = QWidget()
        root.setObjectName("root")
        self.setCentralWidget(root)
        layout = QVBoxLayout(root)
        layout.setContentsMargins(16, 14, 8, 4)
        layout.setSpacing(12)

        # header
        header = QFrame()
        header.setObjectName("header")
        hv = QHBoxLayout(header)
        hv.setContentsMargins(18, 12, 18, 12)
        hv.setSpacing(14)

        icon_pm = QPixmap(resource("assets/icon.png"))
        if not icon_pm.isNull():
            icon_lbl = QLabel()
            icon_lbl.setPixmap(icon_pm.scaled(46, 46, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            hv.addWidget(icon_lbl)
        box = QVBoxLayout()
        box.setSpacing(2)
        title = QLabel(APP_NAME)
        title.setProperty("id", "title")
        title.setObjectName("title")
        subtitle = QLabel("ابزار همراه پنل VodiWalker — تجزیه کانفیگ، تست اتصال و ابزارها")
        subtitle.setProperty("id", "subtitle")
        subtitle.setObjectName("subtitle")
        box.addWidget(title)
        box.addWidget(subtitle)
        hv.addLayout(box)
        hv.addStretch(1)

        chip = QLabel(f"نسخه {APP_VERSION}")
        chip.setProperty("id", "chip")
        chip.setObjectName("chip")
        channel = QLabel(f'<a href="{APP_CHANNEL_URL}" style="color:{COLOR_ACCENT}; '
                         f'text-decoration:none;">کانال تلگرام ↗</a>')
        channel.setOpenExternalLinks(True)
        channel.setToolTip(APP_SUPPORT_URL)
        hv.addWidget(chip)
        hv.addWidget(channel)
        layout.addWidget(header)

        # tabs
        self.tabs = QTabWidget()
        self.configs_tab = ConfigsTab(self)
        self.test_tab = TestTab(self)
        self.tools_tab = ToolsTab(self)
        self.tabs.addTab(self.configs_tab, "کانفیگ‌ها")
        self.tabs.addTab(self.test_tab, "تست اتصال")
        self.tabs.addTab(self.tools_tab, "ابزارها")
        layout.addWidget(self.tabs, 1)

        sb = QStatusBar()
        sb.setSizeGripEnabled(True)
        self.setStatusBar(sb)
        sb.showMessage("آماده — لینک کانفیگ‌ها را در تب «کانفیگ‌ها» جای‌گذاری کنید")

    def set_configs(self, configs: list[core.Config], errors: list[str]) -> None:
        self.configs = configs
        self.parse_errors = errors
        self.configs_tab.refresh()
        self.configsChanged.emit()
        if configs:
            msg = f"{len(configs)} کانفیگ تجزیه شد"
            if errors:
                msg += f" — {len(errors)} مورد نامعتبر نادیده گرفته شد"
            self.statusBar().showMessage(msg, 6000)
        elif errors:
            QMessageBox.warning(
                self, "تجزیه ناموفق",
                "هیچ لینک معتبری پیدا نشد.\n\n"
                "مطمئن شوید لینک‌ها با vless://، vmess://، trojan:// یا ss:// شروع می‌شوند "
                "و یا محتوای سابسکریپشن را کپی کرده‌اید.")
            self.statusBar().showMessage("لینک معتبری پیدا نشد", 5000)

    def closeEvent(self, event) -> None:  # noqa: N802
        settings = QSettings("VodiWalker", "Toolkit")
        settings.setValue("window/geometry", self.saveGeometry())
        if self.test_tab.worker is not None and self.test_tab.worker.isRunning():
            self.test_tab.worker.cancel()
            self.test_tab.worker.wait(3000)
        super().closeEvent(event)


# ------------------------------------------------------------
# نمونه برای دکمه «درج نمونه»
# ------------------------------------------------------------

def sample_links_text() -> str:
    vmess_obj = {
        "v": "2", "ps": "نمونه-VMess-Cloudflare", "add": "1.0.0.1", "port": "443",
        "id": "9b1d4f52-3c7e-4a68-9f21-1e8c7a0b5d44", "aid": "0", "scy": "auto",
        "net": "ws", "type": "none", "host": "cdn.example.com", "path": "/vmess",
        "tls": "tls", "sni": "cdn.example.com", "fp": "chrome",
    }
    vless = ("vless://9b1d4f52-3c7e-4a68-9f21-1e8c7a0b5d44@1.1.1.1:443"
             "?type=ws&security=tls&sni=cdn.example.com&path=%2Fws&fp=chrome"
             "#%D9%86%D9%85%D9%88%D9%86%D9%87-WebSocket-TLS")
    trojan = ("trojan://Str0ng-Pass@104.21.5.10:443?security=tls&sni=shop.example.org"
              "#%D9%86%D9%85%D9%88%D9%86%D9%87-Trojan")
    vmess = "vmess://" + core.b64_encode_text(json.dumps(vmess_obj, ensure_ascii=False))
    return "\n".join([vless, vmess, trojan])


# ------------------------------------------------------------
# entry point
# ------------------------------------------------------------

def run() -> int:
    QApplication.setStyle("Fusion")
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setApplicationVersion(APP_VERSION)
    app.setOrganizationName("VodiWalker")

    load_fonts()
    app.setFont(QFont(FONT_FAMILY, 10))
    app.setLayoutDirection(Qt.RightToLeft)

    icon_path = resource("assets/icon.png")
    if Path(icon_path).exists():
        app.setWindowIcon(QIcon(icon_path))

    app.setStyleSheet(QSS)

    window = MainWindow()
    settings = QSettings("VodiWalker", "Toolkit")
    geometry = settings.value("window/geometry")
    if geometry is not None:
        window.restoreGeometry(geometry)
    window.show()

    return app.exec()
