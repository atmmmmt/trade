@echo off
title Dashboard
echo Starting dashboard...
if not exist node_modules npm install
npm run dev:dashboard
pause
