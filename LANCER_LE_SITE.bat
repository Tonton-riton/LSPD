@echo off
title SEVEN // LSPD - Lancement du Panel de Gestion & Calculateur de Peines
cd /d "%~dp0"
echo ===================================================
echo   LANCEMENT DU PANEL DE GESTION PEINES (FiveM RP)
echo ===================================================
echo.
echo Verification des dependances...
if not exist node_modules (
    echo Installation des modules en cours, veuillez patienter...
    call npm install
)

echo Demarrage du serveur Vite...
start "" "http://localhost:5173"
call npm run dev
pause
