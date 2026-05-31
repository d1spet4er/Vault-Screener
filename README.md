# 🏛️ Vault Screener

A professional crypto screener built with **Vue 3 + Vite**, featuring real-time data from Binance and Bybit APIs.

![Vault Screener](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js) ![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 📊 **Real-time data** from Binance & Bybit (auto-refresh every 30s)
- 🔄 **Switch between exchanges** — Binance / Bybit
- 📈 **Spot & Futures** markets with funding rates
- 🔍 **Search, filter, sort** — gainers, losers, top 10
- 📉 **7-day sparkline charts** via CoinGecko
- 💰 Market cap, volume, supply, open interest
- ⚡ Flash animations on price changes
- 🎨 Old money dark green aesthetic

## 🚀 Getting Started

```bash
npm install
npm run dev
```

## 🌐 Deploy to Netlify

https://6a1c871843b20a81eba5c17c--value-scriner.netlify.app/

## 🛠 Tech Stack

- Vue 3 (Composition API)
- Vite
- Binance REST API
- Bybit REST API
- CoinGecko API (market caps + sparklines)

## 📁 Structure

```
src/
  assets/main.css          — global styles (old money theme)
  components/
    CoinRow.vue            — single table row with flash animations
    SparklineChart.vue     — canvas-based 7d chart
  composables/
    useMarketData.js       — all API logic (Binance, Bybit, CoinGecko)
  App.vue                  — main layout + controls
  main.js                  — entry point
```
