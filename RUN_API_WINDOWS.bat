@echo off
title API
echo Starting local API...
if not exist .env copy .env.example .env
if not exist node_modules npm install
npm run dev:api
pause
