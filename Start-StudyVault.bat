@echo off
setlocal
title StudyVault

rem Always run from the application folder, including when launched from a shortcut.
pushd "%~dp0"
if errorlevel 1 goto folder_error

echo.
echo   StudyVault - your personal learning space
echo   ========================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 goto node_error

node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)"
if errorlevel 1 goto node_error

if not exist "node_modules\vite\bin\vite.js" (
    where npm.cmd >nul 2>&1
    if errorlevel 1 goto npm_error
    echo Installing application dependencies. This needs an internet connection...
    call npm.cmd ci
    if errorlevel 1 goto install_error
    echo.
)

echo Frontend: http://localhost:5173
echo Backend:  Supabase - hosted, connects automatically when configured.
echo Without Supabase settings, your local offline workspace is available.
echo.
echo Keep this window open while studying. Press Ctrl+C to stop the app.
echo.

rem Keep the same URL so browser storage and email redirects remain consistent.
rem --no-open is useful when checking the launcher without opening a browser.
set "STUDYVAULT_BROWSER=--open"
if /I "%~1"=="--no-open" set "STUDYVAULT_BROWSER="
node "node_modules\vite\bin\vite.js" --host localhost --port 5173 --strictPort %STUDYVAULT_BROWSER%
if errorlevel 1 goto start_error

popd
endlocal
exit /b 0

:node_error
echo ERROR: StudyVault needs Node.js 22.12 or newer.
echo Install Node.js from https://nodejs.org, then double-click this file again.
goto failed

:npm_error
echo ERROR: npm could not be found. Reinstall Node.js with npm included.
goto failed

:install_error
echo.
echo ERROR: Dependencies could not be installed.
echo Check your internet connection and the error above, then try again.
goto failed

:start_error
echo.
echo ERROR: StudyVault could not start. See the error above.
echo If port 5173 is already in use, open http://localhost:5173 in your browser.
echo Close the existing StudyVault window before starting another copy.
goto failed

:folder_error
echo ERROR: The StudyVault application folder could not be opened.
echo Keep this launcher inside the StudyVault project folder.
pause
endlocal
exit /b 1

:failed
echo.
pause
popd
endlocal
exit /b 1
