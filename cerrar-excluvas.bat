@echo off
taskkill /FI "WINDOWTITLE eq Excluvas Inteligentes*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Excluvas SQLite*" /T /F >nul 2>nul
echo Excluvas Inteligentes se ha cerrado.
timeout /t 2 /nobreak >nul
