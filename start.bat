@echo off
title BriDownload
cd /d "%~dp0"

if not exist node_modules (
  call setup.bat
)

call npm start
