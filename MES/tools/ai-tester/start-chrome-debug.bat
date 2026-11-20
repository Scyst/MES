@echo off
echo ===================================================
echo   Starting Google Chrome with Remote Debugging (9222)
echo ===================================================
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-dev-profile"
echo Chrome started with debugging port 9222.
echo You can now use the AI Tester or ask your AI Agent to test this window!
pause
