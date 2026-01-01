@echo off
echo Starting ShapeDiver Export Tester...
echo.
echo Opening the test app at http://localhost:3001
echo Make sure you have configured the .env file with your backend ticket.
echo.
cd /d "%~dp0"
npm run dev
