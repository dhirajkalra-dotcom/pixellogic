@echo off
REM ====================================================================
REM  PixelLogic - Licence Generator (double-click launcher)
REM
REM  VENDOR-ONLY. Starts the local licence-generator web tool and opens
REM  it in your default browser. The signing key never leaves this PC.
REM  Just double-click this file - VS Code is NOT required.
REM
REM  Requires Node.js to be installed (https://nodejs.org).
REM ====================================================================

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo Please install it from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

echo Starting the PixelLogic Licence Generator...
echo Opening http://127.0.0.1:4599 in your browser.
echo Close this window (or press Ctrl+C) when you are done.
echo.

REM Open the browser shortly after the server starts.
start "" /b cmd /c "timeout /t 2 >nul & start "" http://127.0.0.1:4599/"

node "scripts\license-server.mjs"

pause
