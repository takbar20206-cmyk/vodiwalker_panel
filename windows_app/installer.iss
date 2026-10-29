; ============================================================
; VodiWalker Toolkit — Inno Setup installer script
; Build (from repo root, after PyInstaller):
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" windows_app\installer.iss
; ============================================================

#define MyAppName "VodiWalker Toolkit"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "VodiWalker"
#define MyAppURL "https://github.com/Vodiwalker"
#define MyAppExeName "VodiWalkerToolkit.exe"

[Setup]
AppId={{A7E9D3B1-5C42-4F8E-9B1D-7C5CFF001000}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\VodiWalker Toolkit
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=VodiWalker-Toolkit-Setup-{#MyAppVersion}
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "..\dist\VodiWalkerToolkit\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent
