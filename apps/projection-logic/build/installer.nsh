; Custom NSIS script for PixelLogic installer
; Writes a README.txt to the installation directory after setup completes

; Clean up any previous installation (including demo) before installing
!macro customInstallMode
  ; Force per-user mode
!macroend

!macro customInit
  ; Remove any leftover registry key from a previous full install
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.dhirajkalra.pixellogic"
  ; Remove any leftover registry key from demo install
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.dhirajkalra.pixellogic-demo"
!macroend

!macro customInstall
  ; Write README.txt into the install directory
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "================================================================$\r$\n"
  FileWrite $0 "  PIXELOGIC — LED & Projector Pattern Generator$\r$\n"
  FileWrite $0 "================================================================$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "  Version   : ${VERSION}$\r$\n"
  FileWrite $0 "  Author    : Dhiraj Kalra$\r$\n"
  FileWrite $0 "  App ID    : com.dhirajkalra.pixellogic$\r$\n"
  FileWrite $0 "  Built with: Electron, React, Tailwind CSS$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "  ABOUT PIXELOGIC$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "  Pixelogic is an all-in-one professional tool for LED and$\r$\n"
  FileWrite $0 "  projector event technicians and designers. It combines:$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "  * Pixel Designer   — build LED pixel maps with panel geometry,$\r$\n"
  FileWrite $0 "                       visual styles, numbering and panel presets$\r$\n"
  FileWrite $0 "  * Special Effects  — overlays, badges, markers, colour bars,$\r$\n"
  FileWrite $0 "                       logos and centre cross/circle$\r$\n"
  FileWrite $0 "  * 2D Visualizer    — full-resolution preview with rulers$\r$\n"
  FileWrite $0 "  * 3D Visualizer    — WebGL perspective view with orbit/pan camera$\r$\n"
  FileWrite $0 "  * Output Maps      — compose multiple maps on an output canvas$\r$\n"
  FileWrite $0 "  * LED Patching     — NovaStar / COEX controller patching planner$\r$\n"
  FileWrite $0 "  * AV Schematics    — 50+ device catalog, 14 signal types,$\r$\n"
  FileWrite $0 "                       20 pro templates, rack elevation view$\r$\n"
  FileWrite $0 "  * PDF Export       — branded PDF & PPTX with template artwork$\r$\n"
  FileWrite $0 "  * Power Calc       — LED power draw calculator (65 tile models)$\r$\n"
  FileWrite $0 "  * Video Converter  — ProRes, DNxHD, H.264/265, audio formats$\r$\n"
  FileWrite $0 "  * Misc Tools       — Aspect Ratio Calculator, LTC WAV Generator$\r$\n"
  FileWrite $0 "  * Circular LED     — ring and circular display geometry planner$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "  GETTING STARTED$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "  1. Launch Pixelogic from your Start Menu or desktop shortcut.$\r$\n"
  FileWrite $0 "  2. Go to Projects tab and create your first project.$\r$\n"
  FileWrite $0 "  3. Click 'Start App Tour' in the sidebar for a guided walkthrough.$\r$\n"
  FileWrite $0 "  4. Open Help tab for full feature reference and keyboard shortcuts.$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "  SUPPORT$\r$\n"
  FileWrite $0 "----------------------------------------------------------------$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "  For support, consult the built-in Help tab or the Tutorial PDF$\r$\n"
  FileWrite $0 "  located in the Help tab of the application.$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "================================================================$\r$\n"
  FileWrite $0 "  (c) Dhiraj Kalra. All rights reserved.$\r$\n"
  FileWrite $0 "================================================================$\r$\n"
  FileClose $0
!macroend
