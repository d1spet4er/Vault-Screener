<template>
  <div class="spread-page">

    <!-- ── Top controls ── -->
    <div class="sp-controls">
      <div class="sp-controls-left">
        <div class="sp-title">
          <i class="ti ti-math-function" />
          Spread Charts
        </div>
        <div class="sp-subtitle">Enter formulas like BTC/ETH · SOL-BTC · ETH*2-BTC</div>
      </div>
      <div class="sp-controls-right">
        <div class="tf-tabs">
          <button v-for="tf in timeframes" :key="tf.id" class="tf-tab"
            :class="{ active: activeTf === tf.id }" @click="setTimeframe(tf.id)">
            {{ tf.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Add formula bar ── -->
    <div class="formula-bar">
      <div class="formula-input-wrap">
        <i class="ti ti-math-function formula-icon" />
        <input
          v-model="formulaInput"
          class="formula-input"
          placeholder="e.g. BTC/ETH or SOL-ETH or BTC/ETH*100"
          @keydown.enter="addFormula"
          spellcheck="false"
        />
        <div class="formula-hint" v-if="formulaInput">
          <span v-if="parsedSymbols.length">
            Symbols: <b>{{ parsedSymbols.join(', ') }}</b>
          </span>
          <span v-else class="hint-err">Invalid formula</span>
        </div>
      </div>
      <div class="formula-bar-right">
        <select v-model="formulaExchange" class="exch-select">
          <option value="Binance">Binance</option>
          <option value="Bybit">Bybit</option>
        </select>
        <button class="add-btn" @click="addFormula" :disabled="!parsedSymbols.length">
          <i class="ti ti-plus" /> Add Chart
        </button>
      </div>
    </div>

    <!-- ── Presets ── -->
    <div class="presets-bar">
      <span class="presets-label">Popular:</span>
      <button v-for="p in presets" :key="p.formula" class="preset-pill"
        @click="addPreset(p)">
        {{ p.label }}
      </button>
    </div>

    <!-- ── Charts grid ── -->
    <div v-if="!charts.length" class="empty-charts">
      <i class="ti ti-chart-line" />
      <p>Add a formula above to build a spread chart</p>
      <p class="empty-sub">Try: BTC/ETH · SOL/BTC · ETH-SOL*10</p>
    </div>

    <div v-else class="charts-grid">
      <div v-for="chart in charts" :key="chart.id" class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <span class="chart-formula">{{ chart.formula }}</span>
            <span class="chart-exchange-badge">{{ chart.exchange }}</span>
          </div>
          <div class="chart-stats" v-if="chart.data.length">
            <span class="chart-current">{{ fmtVal(chart.data[chart.data.length-1]?.value) }}</span>
            <span class="chart-change" :class="chartChange(chart) >= 0 ? 'up' : 'dn'">
              {{ chartChange(chart) >= 0 ? '+' : '' }}{{ chartChange(chart).toFixed(2) }}%
            </span>
          </div>
          <div class="chart-actions">
            <button class="chart-btn" @click="refreshChart(chart)" :disabled="chart.loading">
              <i class="ti ti-refresh" :class="{ spinning: chart.loading }" />
            </button>
            <button class="chart-btn danger" @click="removeChart(chart.id)">
              <i class="ti ti-x" />
            </button>
          </div>
        </div>

        <div class="chart-body">
          <div v-if="chart.loading" class="chart-loading">
            <div class="loading-bars">
              <div v-for="i in 8" :key="i" class="lb" :style="{ animationDelay: i*100+'ms' }" />
            </div>
          </div>
          <div v-else-if="chart.error" class="chart-error">
            <i class="ti ti-alert-circle" />
            {{ chart.error }}
          </div>
          <canvas v-else-if="chart.data.length" :ref="el => setCanvasRef(el, chart.id)"
            class="chart-canvas" />
          <div v-else class="chart-empty">No data</div>
        </div>

        <div class="chart-footer" v-if="chart.data.length">
          <div class="cf-stat">
            <span class="cf-label">High</span>
            <span class="cf-val up">{{ fmtVal(Math.max(...chart.data.map(d=>d.value))) }}</span>
          </div>
          <div class="cf-stat">
            <span class="cf-label">Low</span>
            <span class="cf-val dn">{{ fmtVal(Math.min(...chart.data.map(d=>d.value))) }}</span>
          </div>
          <div class="cf-stat">
            <span class="cf-label">Points</span>
            <span class="cf-val">{{ chart.data.length }}</span>
          </div>
          <div class="cf-stat">
            <span class="cf-label">From</span>
            <span class="cf-val">{{ fmtDate(chart.data[0]?.time) }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({ exchange: String })

const formulaInput = ref('')
const formulaExchange = ref(props.exchange || 'Binance')
const activeTf = ref('1d')
const charts = ref([])
const canvasRefs = {}

const timeframes = [
  { id: '1h', label: '1H', interval: '1m', limit: 60 },
  { id: '4h', label: '4H', interval: '5m', limit: 48 },
  { id: '1d', label: '1D', interval: '15m', limit: 96 },
  { id: '1w', label: '1W', interval: '1h', limit: 168 },
  { id: '1M', label: '1M', interval: '4h', limit: 180 },
]

const presets = [
  { label: 'BTC/ETH', formula: 'BTC/ETH', exchange: 'Binance' },
  { label: 'SOL/ETH', formula: 'SOL/ETH', exchange: 'Binance' },
  { label: 'BTC-ETH', formula: 'BTC-ETH', exchange: 'Binance' },
  { label: 'SOL/BTC', formula: 'SOL/BTC', exchange: 'Binance' },
  { label: 'ETH/BNB', formula: 'ETH/BNB', exchange: 'Binance' },
  { label: 'DOGE/SHIB×1000', formula: 'DOGE/SHIB*1000', exchange: 'Binance' },
]

// ── Formula parser ─────────────────────────────────────────────────────────────
const SYMBOL_RE = /[A-Z]{2,10}/g

const parsedSymbols = computed(() => {
  if (!formulaInput.value.trim()) return []
  const upper = formulaInput.value.toUpperCase()
  const matches = upper.match(SYMBOL_RE)
  if (!matches) return []
  return [...new Set(matches)]
})

function extractSymbols(formula) {
  const upper = formula.toUpperCase()
  const matches = upper.match(SYMBOL_RE)
  return matches ? [...new Set(matches)] : []
}

// ── Evaluate formula with price map ───────────────────────────────────────────
function evalFormula(formula, prices) {
  let expr = formula.toUpperCase()
  for (const [sym, val] of Object.entries(prices)) {
    expr = expr.replace(new RegExp(sym, 'g'), val)
  }
  try {
    // Safe eval using Function
    return Function('"use strict"; return (' + expr + ')')()
  } catch {
    return null
  }
}

// ── Fetch klines ──────────────────────────────────────────────────────────────
async function fetchBinanceKlines(symbol, interval, limit) {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
  )
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error(`No data for ${symbol}`)
  return data.map(k => ({ time: k[0], close: parseFloat(k[4]) }))
}

async function fetchBybitKlines(symbol, interval, limit) {
  const res = await fetch(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
  )
  const data = await res.json()
  if (data.retCode !== 0) throw new Error(`No data for ${symbol}`)
  return data.result.list
    .map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) }))
    .reverse()
}

async function fetchKlines(symbol, interval, limit, exchange) {
  if (exchange === 'Bybit') return fetchBybitKlines(symbol, interval, limit)
  return fetchBinanceKlines(symbol, interval, limit)
}

// ── Load chart data ────────────────────────────────────────────────────────────
async function loadChartData(chart) {
  chart.loading = true
  chart.error = null
  try {
    const tf = timeframes.find(t => t.id === activeTf.value)
    const symbols = extractSymbols(chart.formula)

    const klineMap = {}
    await Promise.all(
      symbols.map(async sym => {
        klineMap[sym] = await fetchKlines(sym, tf.interval, tf.limit, chart.exchange)
      })
    )

    // Align by index (same length)
    const minLen = Math.min(...Object.values(klineMap).map(k => k.length))
    const aligned = Array.from({ length: minLen }, (_, i) => {
      const prices = {}
      for (const [sym, klines] of Object.entries(klineMap)) {
        prices[sym] = klines[klines.length - minLen + i].close
      }
      const time = klineMap[symbols[0]][klineMap[symbols[0]].length - minLen + i].time
      const value = evalFormula(chart.formula, prices)
      return { time, value }
    }).filter(d => d.value !== null && isFinite(d.value))

    chart.data = aligned
    await nextTick()
    setTimeout(() => drawCanvas(chart), 80)
  } catch (e) {
    chart.error = e.message || 'Failed to load'
  } finally {
    chart.loading = false
  }
}

// ── Canvas drawing ─────────────────────────────────────────────────────────────
function setCanvasRef(el, id) {
  if (el) canvasRefs[id] = el
}

function drawCanvas(chart) {
  const canvas = canvasRefs[chart.id]
  if (!canvas || !chart.data.length) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.offsetWidth
  const h = canvas.offsetHeight
  if (!w || !h) { setTimeout(() => drawCanvas(chart), 100); return }
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const vals = chart.data.map(d => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const pad = { t: 12, r: 8, b: 28, l: 60 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  const px = i => pad.l + (i / (vals.length - 1)) * cw
  const py = v => pad.t + (1 - (v - min) / range) * ch

  const isUp = vals[vals.length - 1] >= vals[0]
  const lineColor = isUp ? '#4caf7a' : '#d95c5c'
  const gradTop = isUp ? 'rgba(76,175,122,.25)' : 'rgba(217,92,92,.2)'
  const gradBot = 'rgba(0,0,0,0)'

  // Grid lines
  ctx.strokeStyle = 'rgba(42,100,66,.3)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * ch
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
    const v = max - (i / 4) * range
    ctx.fillStyle = 'rgba(180,200,185,.5)'
    ctx.font = '10px DM Mono, monospace'
    ctx.textAlign = 'right'
    ctx.fillText(fmtVal(v), pad.l - 6, y + 3)
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch)
  grad.addColorStop(0, gradTop)
  grad.addColorStop(1, gradBot)
  ctx.beginPath()
  ctx.moveTo(px(0), py(vals[0]))
  for (let i = 1; i < vals.length; i++) ctx.lineTo(px(i), py(vals[i]))
  ctx.lineTo(px(vals.length - 1), pad.t + ch)
  ctx.lineTo(px(0), pad.t + ch)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // Line
  ctx.beginPath()
  ctx.moveTo(px(0), py(vals[0]))
  for (let i = 1; i < vals.length; i++) ctx.lineTo(px(i), py(vals[i]))
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Last point dot
  ctx.beginPath()
  ctx.arc(px(vals.length - 1), py(vals[vals.length - 1]), 4, 0, Math.PI * 2)
  ctx.fillStyle = lineColor
  ctx.fill()

  // Time labels
  const labelCount = 5
  ctx.fillStyle = 'rgba(90,122,98,.8)'
  ctx.font = '10px DM Mono, monospace'
  ctx.textAlign = 'center'
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round(i / (labelCount - 1) * (chart.data.length - 1))
    const t = new Date(chart.data[idx].time)
    const label = activeTf.value === '1h' || activeTf.value === '4h'
      ? t.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      : t.toLocaleDateString('en', { month: 'short', day: 'numeric' })
    ctx.fillText(label, px(idx), h - 6)
  }
}

// ── Actions ────────────────────────────────────────────────────────────────────
function addFormula() {
  if (!parsedSymbols.value.length) return
  const formula = formulaInput.value.trim().toUpperCase()
  if (charts.value.find(c => c.formula === formula && c.exchange === formulaExchange.value)) return

  const chart = {
    id: Date.now(),
    formula,
    exchange: formulaExchange.value,
    data: [],
    loading: false,
    error: null,
  }
  charts.value.push(chart)
  formulaInput.value = ''
  loadChartData(chart)
}

function addPreset(p) {
  formulaInput.value = p.formula
  formulaExchange.value = p.exchange
  addFormula()
}

function removeChart(id) {
  charts.value = charts.value.filter(c => c.id !== id)
  delete canvasRefs[id]
}

function refreshChart(chart) { loadChartData(chart) }

function setTimeframe(tf) {
  activeTf.value = tf
  charts.value.forEach(c => loadChartData(c))
}

function chartChange(chart) {
  if (chart.data.length < 2) return 0
  const first = chart.data[0].value
  const last = chart.data[chart.data.length - 1].value
  return ((last - first) / Math.abs(first)) * 100
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtVal(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  if (Math.abs(v) >= 1000) return v.toLocaleString('en', { maximumFractionDigits: 2 })
  if (Math.abs(v) >= 1) return v.toFixed(4)
  if (Math.abs(v) >= 0.01) return v.toFixed(6)
  return v.toFixed(8)
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

watch(() => props.exchange, (ex) => { formulaExchange.value = ex })
</script>

<style scoped>
.spread-page { padding: 0; }

.sp-controls {
  display: flex; align-items: center; justify-content: space-between;
  padding: .9rem 1.5rem; background: var(--g2); border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 12px;
}
.sp-title { font-family: var(--font-serif); font-size: 16px; color: var(--gold); display: flex; align-items: center; gap: 8px; }
.sp-title i { font-size: 18px; }
.sp-subtitle { font-size: 11px; color: var(--text3); letter-spacing: 1px; margin-top: 2px; }

.tf-tabs { display: flex; gap: 3px; }
.tf-tab {
  padding: 5px 12px; border-radius: 5px; border: 1px solid transparent;
  background: transparent; color: var(--text2); font-size: 12px; font-family: var(--font-mono);
  cursor: pointer; transition: all .15s; letter-spacing: 1px;
}
.tf-tab:hover { background: var(--g4); color: var(--cream2); }
.tf-tab.active { background: var(--g5); border-color: var(--border2); color: var(--gold); }

.formula-bar {
  display: flex; align-items: center; gap: 12px;
  padding: .8rem 1.5rem; background: var(--g2); border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.formula-input-wrap { flex: 1; min-width: 260px; position: relative; }
.formula-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--gold); font-size: 16px; pointer-events: none; }
.formula-input {
  width: 100%; background: var(--g3); border: 1px solid var(--border2);
  border-radius: 6px; padding: 9px 12px 9px 34px;
  color: var(--cream); font-size: 14px; font-family: var(--font-mono);
  outline: none; transition: border .2s; letter-spacing: 1px;
}
.formula-input:focus { border-color: var(--gold); }
.formula-input::placeholder { color: var(--text3); font-size: 12px; letter-spacing: 0; }
.formula-hint { position: absolute; bottom: -18px; left: 34px; font-size: 11px; color: var(--text3); }
.formula-hint b { color: var(--gb); }
.hint-err { color: var(--dn); }

.formula-bar-right { display: flex; align-items: center; gap: 8px; }
.exch-select {
  background: var(--g3); border: 1px solid var(--border); border-radius: 6px;
  padding: 8px 10px; color: var(--cream2); font-size: 12px; outline: none; cursor: pointer;
}
.add-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--g6); border: 1px solid var(--border2);
  color: var(--gold); padding: 8px 16px; border-radius: 6px;
  font-size: 13px; font-family: var(--font-sans); transition: all .2s;
}
.add-btn:hover:not(:disabled) { background: var(--g7); }
.add-btn:disabled { opacity: .4; cursor: not-allowed; }

.presets-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: .5rem 1.5rem; background: var(--g2); border-bottom: 1px solid var(--border);
}
.presets-label { font-size: 10px; color: var(--text3); letter-spacing: 2px; text-transform: uppercase; }
.preset-pill {
  padding: 4px 10px; border-radius: 12px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text2); font-size: 11px; font-family: var(--font-mono);
  cursor: pointer; transition: all .15s; letter-spacing: .5px;
}
.preset-pill:hover { border-color: var(--gold); color: var(--gold); background: var(--goldfaint); }

.empty-charts {
  padding: 5rem; text-align: center; color: var(--text3);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-charts i { font-size: 48px; color: var(--g7); }
.empty-charts p { font-size: 14px; }
.empty-sub { font-family: var(--font-mono); font-size: 12px; color: var(--g7); }

.charts-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
  gap: 1px; background: var(--border); padding: 0;
}
.chart-card {
  background: var(--g1); display: flex; flex-direction: column;
  animation: cardIn .3s ease both;
}
@keyframes cardIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }

.chart-header {
  display: flex; align-items: center; gap: 12px;
  padding: .8rem 1rem; border-bottom: 1px solid var(--border); background: var(--g2);
}
.chart-title-wrap { flex: 1; display: flex; align-items: center; gap: 8px; }
.chart-formula { font-family: var(--font-mono); font-size: 15px; color: var(--cream); letter-spacing: 1px; }
.chart-exchange-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 3px;
  background: var(--g5); color: var(--text3); letter-spacing: 1px;
}
.chart-stats { display: flex; align-items: center; gap: 10px; }
.chart-current { font-family: var(--font-serif); font-size: 16px; color: var(--cream); }
.chart-change { font-family: var(--font-mono); font-size: 12px; font-weight: 500; }
.chart-change.up { color: var(--up); }
.chart-change.dn { color: var(--dn); }
.chart-actions { display: flex; gap: 4px; }
.chart-btn {
  width: 28px; height: 28px; border-radius: 5px; border: 1px solid var(--border);
  background: transparent; color: var(--text3); font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s;
}
.chart-btn:hover { background: var(--g4); color: var(--cream2); }
.chart-btn.danger:hover { border-color: var(--dn); color: var(--dn); }
.chart-btn:disabled { opacity: .4; cursor: not-allowed; }

.chart-body {
  flex: 1; height: 240px; min-height: 240px; position: relative; padding: 8px 0 0; overflow: hidden;
}
.chart-canvas { width: 100% !important; height: 220px !important; display: block; min-height: 220px; }

.chart-loading, .chart-error, .chart-empty {
  display: flex; align-items: center; justify-content: center;
  height: 240px; color: var(--text3);
}
.chart-error { color: var(--dn); gap: 8px; font-size: 13px; }
.loading-bars { display: flex; align-items: flex-end; gap: 4px; height: 40px; }
.lb {
  width: 8px; background: var(--g6); border-radius: 2px;
  animation: lbPulse 1s ease infinite;
}
.lb:nth-child(1){ height:20px } .lb:nth-child(2){ height:32px } .lb:nth-child(3){ height:24px }
.lb:nth-child(4){ height:38px } .lb:nth-child(5){ height:28px } .lb:nth-child(6){ height:40px }
.lb:nth-child(7){ height:22px } .lb:nth-child(8){ height:34px }
@keyframes lbPulse { 0%,100%{opacity:.3} 50%{opacity:.9} }

.chart-footer {
  display: flex; gap: 0; border-top: 1px solid var(--border);
  background: var(--g2);
}
.cf-stat {
  flex: 1; padding: .5rem .8rem; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 2px;
}
.cf-stat:last-child { border-right: none; }
.cf-label { font-size: 9px; color: var(--text3); letter-spacing: 2px; text-transform: uppercase; }
.cf-val { font-size: 12px; font-family: var(--font-mono); color: var(--cream2); }
.cf-val.up { color: var(--up); }
.cf-val.dn { color: var(--dn); }

.spinning { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.up { color: var(--up); }
.dn { color: var(--dn); }
</style>
