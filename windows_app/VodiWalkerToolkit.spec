# -*- mode: python ; coding: utf-8 -*-
# VodiWalker Toolkit — PyInstaller spec
# اجرا از ریشه مخزن:
#   pyinstaller --noconfirm --distpath dist --workpath build windows_app/VodiWalkerToolkit.spec

import os

a = Analysis(
    [os.path.join(SPECPATH, 'main.py')],
    pathex=[SPECPATH],
    binaries=[],
    datas=[
        (os.path.join(SPECPATH, 'assets', 'fonts'), 'assets/fonts'),
        (os.path.join(SPECPATH, 'assets', 'icon.png'), 'assets'),
        (os.path.join(SPECPATH, 'assets', 'icon.ico'), 'assets'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'pydoc', 'doctest'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='VodiWalkerToolkit',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(SPECPATH, 'assets', 'icon.ico'),
    version=os.path.join(SPECPATH, 'version_info.txt'),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='VodiWalkerToolkit',
)
