@echo off
title BriDownload - Instalacion
cd /d "%~dp0"

echo.
echo Instalando dependencias...
call npm install

if errorlevel 1 (
  echo.
  echo No se pudieron instalar las dependencias.
  pause
  exit /b 1
)

echo.
echo Instalacion completada.
echo.
echo Ahora coloca yt-dlp.exe dentro de la carpeta tools.
echo Instala FFmpeg con:
echo winget install Gyan.FFmpeg
echo.
pause
