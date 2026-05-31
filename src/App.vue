<template>
  <div class="app">

    <!-- ── Header ── -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-emblem">
            <i class="ti ti-chart-candle" aria-hidden="true" />
          </div>
          <div>
            <div class="logo-title">VAULT SCREENER</div>
            <div class="logo-sub">Digital Asset Intelligence</div>
          </div>
        </div>
      </div>
      <div class="header-center">
        <div class="live-pill" :class="{ loading: loading }">
          <span class="live-dot" />
          {{ loading ? 'UPDATING...' : 'LIVE' }}
          <span v-if="lastUpdated" class="live-time">{{ fmtTime(lastUpdated) }}</span>
        </div>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          <i class="ti ti-refresh" :class="{ spinning: loading }" aria-hidden="true" />
          Refresh
        </button>
      </div>
    </header>

    <!-- ── Main tabs ── -->
    <div class="main-tabs-bar">
      <button class="main-tab" :class="{ active: activeTab === 'screener' }" @click="activeTab = 'screener'">
        <i class="ti ti-table" /> Screener
      </button>
      <button class="main-tab" :class="{ active: activeTab === 'spread' }" @click="activeTab = 'spread'">
        <i class="ti ti-math-function" /> Spread Charts
      </button>
    </div>

    <!-- ── Spread Charts tab ── -->
    <SpreadChart v-if="activeTab === 'spread'" :exchange="exchange" />

    <!-- ── Screener tab ── -->
    <template v-if="activeTab === 'screener'">

    <!-- ── Exchange + Market selector ── -->
    <div class="selector-bar">
      <div class="selector-group">
        <span class="selector-label">Exchange</span>
        <div class="selector-tabs">
          <button
            v-for="ex in exchanges"
            :key="ex.id"
            class="sel-tab"
            :class="{ active: exchange === ex.id }"
            @click="setExchange(ex.id)"
          >
            <img :src="ex.logo" :alt="ex.id" class="ex-logo" />
            {{ ex.label }}
          </button>
        </div>
      </div>
      <div class="selector-divider" />
      <div class="selector-group">
        <span class="selector-label">Market</span>
        <div class="selector-tabs">
          <button
            v-for="m in markets"
            :key="m.id"
            class="sel-tab"
            :class="{ active: market === m.id }"
            @click="setMarket(m.id)"
          >
            <i :class="m.icon" aria-hidden="true" />
            {{ m.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Market stats bar ── -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">Total Market Cap</span>
        <span class="stat-val">{{ totalMcap }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">24h Volume</span>
        <span class="stat-val">{{ totalVolume }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Gainers / Losers</span>
        <span class="stat-val">
          <span class="up">{{ gainers }}</span>
          <span style="color:var(--text3)"> / </span>
          <span class="dn">{{ losers }}</span>
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Best 24h</span>
        <span class="stat-val up">{{ bestCoin }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Worst 24h</span>
        <span class="stat-val dn">{{ worstCoin }}</span>
      </div>
    </div>

    <!-- ── Controls ── -->
    <div class="controls">
      <div class="search-wrap">
        <i class="ti ti-search search-icon" aria-hidden="true" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Search asset..."
          aria-label="Search asset"
        />
        <button v-if="search" class="search-clear" @click="search = ''" aria-label="Clear search">
          <i class="ti ti-x" aria-hidden="true" />
        </button>
      </div>
      <div class="filter-tabs">
        <button
          v-for="f in filters"
          :key="f.id"
          class="filter-tab"
          :class="{ active: activeFilter === f.id }"
          @click="activeFilter = f.id"
        >{{ f.label }}</button>
      </div>
      <div class="sort-select-wrap">
        <i class="ti ti-arrows-sort sort-icon" aria-hidden="true" />
        <select v-model="sortKey" class="sort-select" aria-label="Sort by">
          <option value="rank">By Rank</option>
          <option value="change24h">By 24h Change</option>
          <option value="volume24h">By Volume</option>
          <option value="mcap">By Market Cap</option>
          <option value="price">By Price</option>
        </select>
      </div>
    </div>

    <!-- ── Error ── -->
    <div v-if="error" class="error-bar">
      <i class="ti ti-alert-circle" aria-hidden="true" />
      {{ error }}
    </div>

    <!-- ── Table ── -->
    <div class="table-outer">
      <div v-if="loading && !coins.length" class="skeleton-wrap">
        <div v-for="i in 10" :key="i" class="skeleton-row" :style="{ animationDelay: i*60+'ms' }" />
      </div>
      <table v-else class="main-table" aria-label="Cryptocurrency screener">
        <thead>
          <tr>
            <th class="th-rank" @click="setSort('rank')" :class="{ sorted: sortKey==='rank' }">#</th>
            <th class="th-coin">Asset</th>
            <th @click="setSort('price')" :class="{ sorted: sortKey==='price' }">
              Price <i :class="sortArrow('price')" aria-hidden="true" />
            </th>
            <th @click="setSort('change24h')" :class="{ sorted: sortKey==='change24h' }">
              24h % <i :class="sortArrow('change24h')" aria-hidden="true" />
            </th>
            <th>24h High / Low</th>
            <th @click="setSort('volume24h')" :class="{ sorted: sortKey==='volume24h' }">
              Volume <i :class="sortArrow('volume24h')" aria-hidden="true" />
            </th>
            <th @click="setSort('mcap')" :class="{ sorted: sortKey==='mcap' }">
              Mkt Cap <i :class="sortArrow('mcap')" aria-hidden="true" />
            </th>
            <th v-if="isFutures">Funding Rate</th>
            <th v-if="isFutures && isBybit">Open Interest</th>
            <th>Supply</th>
            <th>7d Chart</th>
          </tr>
        </thead>
        <tbody>
          <CoinRow
            v-for="(coin, idx) in displayCoins"
            :key="coin.symbol + exchange + market"
            :coin="coin"
            :is-futures="isFutures"
            :is-bybit="isBybit"
            :style="{ animationDelay: idx * 30 + 'ms' }"
          />
        </tbody>
      </table>
      <div v-if="!loading && !displayCoins.length && coins.length" class="empty-state">
        <i class="ti ti-search-off" aria-hidden="true" />
        <p>No assets found</p>
      </div>
    </div>

    <!-- ── Footer ── -->
    <footer class="footer">
      <span>Data: {{ exchange }} {{ isFutures ? 'Futures' : 'Spot' }} · CoinGecko</span>
      <span>{{ coins.length }} assets</span>
    </footer>

    </template> <!-- end screener tab -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMarketData } from './composables/useMarketData.js'
import CoinRow from './components/CoinRow.vue'
import SpreadChart from './components/SpreadChart.vue'

const { coins, loading, error, lastUpdated, exchange, market, fetchData } = useMarketData()

const activeTab = ref('screener')
const search = ref('')
const activeFilter = ref('all')
const sortKey = ref('rank')
const sortDir = ref(1)

const exchanges = [
  { id: 'Binance', label: 'Binance', logo: 'https://assets.coingecko.com/markets/images/52/small/binance.jpg' },
  { id: 'Bybit',   label: 'Bybit',   logo: 'https://assets.coingecko.com/markets/images/698/small/bybit_spot.png' },
]

const markets = [
  { id: 'spot',    label: 'Spot',    icon: 'ti ti-currency-dollar' },
  { id: 'futures', label: 'Futures', icon: 'ti ti-chart-line' },
]

const filters = [
  { id: 'all',     label: 'All' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers',  label: 'Losers' },
  { id: 'top10',   label: 'Top 10' },
]

const isFutures = computed(() => market.value === 'futures')
const isBybit = computed(() => exchange.value === 'Bybit')

async function setExchange(ex) {
  exchange.value = ex
  await fetchData()
}
async function setMarket(m) {
  market.value = m
  await fetchData()
}
async function refreshData() { await fetchData() }

function setSort(key) {
  if (sortKey.value === key) sortDir.value *= -1
  else { sortKey.value = key; sortDir.value = -1 }
}
function sortArrow(key) {
  if (sortKey.value !== key) return 'ti ti-selector'
  return sortDir.value === -1 ? 'ti ti-chevron-down' : 'ti ti-chevron-up'
}

const displayCoins = computed(() => {
  let list = [...coins.value]
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(c => c.symbol.toLowerCase().includes(q))
  }
  if (activeFilter.value === 'gainers') list = list.filter(c => c.change24h > 0)
  else if (activeFilter.value === 'losers') list = list.filter(c => c.change24h < 0)
  else if (activeFilter.value === 'top10') list = list.filter(c => c.rank && c.rank <= 10)

  list.sort((a, b) => {
    const va = a[sortKey.value] ?? 0
    const vb = b[sortKey.value] ?? 0
    return sortDir.value * (vb - va)
  })
  return list
})

// ── Stats ──────────────────────────────────────────────────────────────────────
const totalMcap = computed(() => {
  const t = coins.value.reduce((s, c) => s + (c.mcap || 0), 0)
  if (!t) return '—'
  if (t >= 1e12) return '$' + (t/1e12).toFixed(2) + 'T'
  return '$' + (t/1e9).toFixed(0) + 'B'
})
const totalVolume = computed(() => {
  const t = coins.value.reduce((s, c) => s + (c.volume24h || 0), 0)
  if (!t) return '—'
  if (t >= 1e12) return '$' + (t/1e12).toFixed(2) + 'T'
  return '$' + (t/1e9).toFixed(2) + 'B'
})
const gainers = computed(() => coins.value.filter(c => c.change24h > 0).length)
const losers = computed(() => coins.value.filter(c => c.change24h < 0).length)
const bestCoin = computed(() => {
  const c = [...coins.value].sort((a,b) => b.change24h - a.change24h)[0]
  if (!c) return '—'
  return `${c.symbol} +${c.change24h.toFixed(2)}%`
})
const worstCoin = computed(() => {
  const c = [...coins.value].sort((a,b) => a.change24h - b.change24h)[0]
  if (!c) return '—'
  return `${c.symbol} ${c.change24h.toFixed(2)}%`
})

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

let interval
onMounted(async () => {
  await fetchData()
  interval = setInterval(fetchData, 30000)
})
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--g1);
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .9rem 1.5rem;
  background: var(--g2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left { display: flex; align-items: center; }
.logo { display: flex; align-items: center; gap: 12px; }
.logo-emblem {
  width: 38px; height: 38px; border-radius: 8px;
  background: var(--goldfaint);
  border: 1px solid rgba(201,168,76,.25);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold); font-size: 18px;
}
.logo-title { font-family: var(--font-serif); font-size: 17px; color: var(--gold); letter-spacing: 3px; }
.logo-sub { font-size: 10px; color: var(--text3); letter-spacing: 2px; text-transform: uppercase; margin-top: 1px; }

.live-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-radius: 20px;
  background: var(--g4); border: 1px solid var(--border);
  font-size: 11px; color: var(--text2); letter-spacing: 2px; font-family: var(--font-mono);
  transition: all .3s;
}
.live-pill.loading { border-color: var(--gold); color: var(--gold2); }
.live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--up);
  animation: livePulse 1.4s infinite;
}
@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
.live-time { color: var(--text3); font-size: 10px; }

.refresh-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--g4); border: 1px solid var(--border2);
  color: var(--cream2); padding: 7px 14px; border-radius: 6px;
  font-size: 12px; letter-spacing: 1px;
  transition: all .2s;
}
.refresh-btn:hover:not(:disabled) { background: var(--g6); border-color: var(--gold); color: var(--gold); }
.refresh-btn:disabled { opacity: .5; cursor: not-allowed; }
.spinning { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Selector bar ── */
.selector-bar {
  display: flex; align-items: center; gap: 0;
  background: var(--g2); border-bottom: 1px solid var(--border);
  padding: .6rem 1.5rem; gap: 2rem;
}
.selector-group { display: flex; align-items: center; gap: 12px; }
.selector-label { font-size: 10px; color: var(--text3); letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
.selector-divider { width: 1px; height: 24px; background: var(--border); }
.selector-tabs { display: flex; gap: 4px; }
.sel-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 6px;
  border: 1px solid transparent;
  background: transparent; color: var(--text2);
  font-size: 13px; font-family: var(--font-sans);
  transition: all .2s;
}
.sel-tab:hover { background: var(--g4); color: var(--cream2); }
.sel-tab.active {
  background: var(--g5); border-color: var(--border2);
  color: var(--gold); font-weight: 500;
}
.ex-logo { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }

/* ── Stats bar ── */
.stats-bar {
  display: flex; gap: 0;
  background: var(--g2); border-bottom: 1px solid var(--border);
}
.stat-item {
  flex: 1; padding: .6rem 1.2rem;
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 2px;
}
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--text3); letter-spacing: 1.5px; text-transform: uppercase; }
.stat-val { font-family: var(--font-serif); font-size: 15px; color: var(--cream); }
.stat-val.up { color: var(--up); }
.stat-val.dn { color: var(--dn); }
.up { color: var(--up); }
.dn { color: var(--dn); }

/* ── Controls ── */
.controls {
  display: flex; align-items: center; gap: 12px;
  padding: .75rem 1.5rem;
  background: var(--g2); border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 300px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 15px; pointer-events: none; }
.search-input {
  width: 100%; background: var(--g3); border: 1px solid var(--border);
  border-radius: 6px; padding: 7px 30px 7px 32px;
  color: var(--cream); font-size: 13px; outline: none;
  transition: border .2s;
}
.search-input::placeholder { color: var(--text3); }
.search-input:focus { border-color: var(--gold); }
.search-clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text3); font-size: 14px; padding: 2px;
}
.search-clear:hover { color: var(--cream); }

.filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.filter-tab {
  padding: 6px 14px; border-radius: 6px;
  border: 1px solid transparent;
  background: transparent; color: var(--text2);
  font-size: 12px; letter-spacing: .5px;
  transition: all .2s;
}
.filter-tab:hover { background: var(--g4); color: var(--cream2); }
.filter-tab.active { background: var(--g5); border-color: var(--border2); color: var(--gold); }

.sort-select-wrap { position: relative; display: flex; align-items: center; }
.sort-icon { position: absolute; left: 10px; color: var(--text3); font-size: 14px; pointer-events: none; }
.sort-select {
  background: var(--g3); border: 1px solid var(--border);
  border-radius: 6px; padding: 7px 12px 7px 30px;
  color: var(--cream2); font-size: 12px; outline: none;
  cursor: pointer; transition: border .2s;
}
.sort-select:focus { border-color: var(--gold); }

/* ── Error ── */
.error-bar {
  display: flex; align-items: center; gap: 8px;
  padding: .6rem 1.5rem;
  background: rgba(217,92,92,.08); border-bottom: 1px solid rgba(217,92,92,.2);
  color: var(--dn); font-size: 13px;
}

/* ── Table ── */
.table-outer { overflow-x: auto; flex: 1; }
.main-table { width: 100%; border-collapse: collapse; }
.main-table thead tr {
  background: var(--g2);
  border-bottom: 1px solid var(--border2);
  position: sticky; top: 0;
}
.main-table th {
  padding: .55rem .9rem;
  font-size: 10px; color: var(--text3);
  letter-spacing: 2px; text-transform: uppercase;
  font-weight: 400; text-align: right;
  cursor: pointer; user-select: none; white-space: nowrap;
  transition: color .15s;
}
.main-table th:hover { color: var(--gold2); }
.main-table th.sorted { color: var(--gold); }
.th-rank { text-align: center; padding-left: 1.2rem; }
.th-coin { text-align: left; padding-left: 1.2rem; }

/* ── Skeleton ── */
.skeleton-wrap { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 52px; background: var(--g3); border-radius: 6px;
  animation: skelPulse 1.4s ease infinite;
}
@keyframes skelPulse { 0%,100%{opacity:.4} 50%{opacity:.8} }

/* ── Empty ── */
.empty-state {
  padding: 4rem; text-align: center;
  color: var(--text3); font-size: 14px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.empty-state i { font-size: 32px; }

/* ── Footer ── */
.footer {
  display: flex; justify-content: space-between;
  padding: .6rem 1.5rem;
  background: var(--g2); border-top: 1px solid var(--border);
  font-size: 11px; color: var(--text3); letter-spacing: 1px;
}

/* ── Main tabs ── */
.main-tabs-bar {
  display: flex; gap: 0;
  background: var(--g2); border-bottom: 2px solid var(--border);
}
.main-tab {
  display: flex; align-items: center; gap: 7px;
  padding: .75rem 1.5rem; border: none; background: transparent;
  color: var(--text2); font-size: 13px; font-family: var(--font-sans);
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all .2s; letter-spacing: .5px;
}
.main-tab:hover { color: var(--cream2); }
.main-tab.active { color: var(--gold); border-bottom-color: var(--gold); }
.main-tab i { font-size: 15px; }
</style>
