<template>
  <tr class="coin-row" :class="{ 'row-flash-up': flashUp, 'row-flash-dn': flashDn }">
    <td class="td-rank">
      <span class="rank-num">{{ coin.rank }}</span>
    </td>
    <td class="td-coin">
      <div class="coin-cell">
        <div class="coin-img-wrap">
          <img
            :src="iconUrl"
            :alt="coin.symbol"
            class="coin-img"
            @error="onImgError"
          />
          <div class="coin-fallback" style="display:none">{{ coin.symbol.slice(0,2) }}</div>
        </div>
        <div class="coin-info">
          <span class="coin-name">{{ coin.symbol }}</span>
          <span class="coin-fullname">{{ fullName }}</span>
        </div>
      </div>
    </td>
    <td class="td-price">
      <span class="price-val">{{ fmtPrice(coin.price) }}</span>
    </td>
    <td class="td-pct">
      <span class="pct-badge" :class="coin.change24h >= 0 ? 'up' : 'dn'">
        <i :class="coin.change24h >= 0 ? 'ti ti-trending-up' : 'ti ti-trending-down'" aria-hidden="true" />
        {{ fmtPct(coin.change24h) }}
      </span>
    </td>
    <td class="td-hl">
      <div class="hl-wrap">
        <span class="hl-h">{{ fmtPrice(coin.high24h) }}</span>
        <span class="hl-sep">/</span>
        <span class="hl-l">{{ fmtPrice(coin.low24h) }}</span>
      </div>
    </td>
    <td class="td-vol">{{ fmtLarge(coin.volume24h) }}</td>
    <td class="td-mcap">{{ coin.mcap ? fmtLarge(coin.mcap) : '—' }}</td>
    <td v-if="isFutures" class="td-fr">
      <span v-if="coin.fundingRate != null" class="fr-val" :class="coin.fundingRate >= 0 ? 'up' : 'dn'">
        {{ (coin.fundingRate * 100).toFixed(4) }}%
      </span>
      <span v-else class="muted">—</span>
    </td>
    <td v-if="isFutures && isBybit" class="td-oi">
      {{ coin.openInterest ? fmtLarge(coin.openInterest * coin.price) : '—' }}
    </td>
    <td class="td-supply">
      <div v-if="coin.supply" class="supply-wrap">
        <span class="supply-txt">{{ fmtSupply(coin.supply) }}</span>
        <div v-if="coin.maxSupply" class="supply-bar-bg">
          <div class="supply-bar-fill" :style="{ width: supplyPct + '%' }" />
        </div>
      </div>
      <span v-else class="muted">—</span>
    </td>
    <td class="td-spark">
      <SparklineChart :data="coin.sparkline" :positive="coin.change24h >= 0" :width="80" :height="28" />
    </td>
  </tr>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SparklineChart from './SparklineChart.vue'

const props = defineProps({
  coin: Object,
  isFutures: Boolean,
  isBybit: Boolean,
})

const NAMES = {
  BTC:'Bitcoin',ETH:'Ethereum',BNB:'BNB',SOL:'Solana',XRP:'XRP',
  ADA:'Cardano',AVAX:'Avalanche',DOGE:'Dogecoin',DOT:'Polkadot',
  LINK:'Chainlink',MATIC:'Polygon',UNI:'Uniswap',LTC:'Litecoin',
  ATOM:'Cosmos',NEAR:'NEAR',APT:'Aptos',OP:'Optimism',ARB:'Arbitrum',
  INJ:'Injective',SUI:'Sui',
}

const fullName = computed(() => NAMES[props.coin.symbol] ?? props.coin.symbol)
const supplyPct = computed(() =>
  props.coin.maxSupply ? Math.round((props.coin.supply / props.coin.maxSupply) * 100) : 0
)

// Icon with fallback chain: CoinGecko → crypto-icons CDN → letter fallback
const imgSrc = ref(
  props.coin.image ||
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${props.coin.symbol.toLowerCase()}.png`
)
const imgFailed = ref(false)

const iconUrl = computed(() => imgSrc.value)

function onImgError(e) {
  const sym = props.coin.symbol.toLowerCase()
  if (imgSrc.value !== `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${sym}.png`) {
    imgSrc.value = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${sym}.png`
  } else {
    imgFailed.value = true
    e.target.style.display = 'none'
    e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'flex')
  }
}

const flashUp = ref(false)
const flashDn = ref(false)
let prevPrice = props.coin.price

watch(() => props.coin.price, (newP, oldP) => {
  if (newP > oldP) { flashUp.value = true; setTimeout(() => flashUp.value = false, 600) }
  else if (newP < oldP) { flashDn.value = true; setTimeout(() => flashDn.value = false, 600) }
})

function fmtPrice(p) {
  if (!p) return '—'
  if (p < 0.0001) return '$' + p.toFixed(8)
  if (p < 0.01) return '$' + p.toFixed(5)
  if (p < 1) return '$' + p.toFixed(4)
  if (p < 100) return '$' + p.toFixed(2)
  return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v) {
  return (v >= 0 ? '+' : '') + (v ?? 0).toFixed(2) + '%'
}
function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  return '$' + n.toLocaleString()
}
function fmtSupply(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  return n.toLocaleString()
}
</script>

<style scoped>
.coin-row {
  border-bottom: 1px solid var(--g4);
  transition: background .15s;
  animation: rowIn .35s ease both;
}
@keyframes rowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
.coin-row:hover { background: var(--g3); }
.row-flash-up { animation: flashUp .6s ease; }
.row-flash-dn { animation: flashDn .6s ease; }
@keyframes flashUp { 0%,100%{background:transparent} 30%{background:rgba(76,175,122,.15)} }
@keyframes flashDn { 0%,100%{background:transparent} 30%{background:rgba(217,92,92,.12)} }

td {
  padding: .65rem .9rem;
  font-size: 13px;
  white-space: nowrap;
  vertical-align: middle;
}

.td-rank { color: var(--text3); font-family: var(--font-mono); font-size: 12px; text-align: center; }
.rank-num { font-family: var(--font-serif); color: var(--text3); font-size: 13px; }

.td-coin { padding-left: 1.2rem; }
.coin-cell { display: flex; align-items: center; gap: 10px; }
.coin-img-wrap { flex-shrink: 0; }
.coin-img { width: 30px; height: 30px; border-radius: 50%; display: block; }
.coin-fallback {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--g6); color: var(--gb);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-serif); font-size: 11px; font-weight: 600;
}
.coin-name { display: block; font-weight: 500; color: var(--cream); font-size: 13px; letter-spacing: .5px; }
.coin-fullname { display: block; font-size: 11px; color: var(--text3); }

.td-price { font-family: var(--font-serif); font-size: 14px; color: var(--cream); text-align: right; }

.pct-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 4px;
  font-size: 12px; font-weight: 500; font-family: var(--font-mono);
}
.pct-badge.up { background: var(--upfaint); color: var(--up); }
.pct-badge.dn { background: var(--dnfaint); color: var(--dn); }
.pct-badge i { font-size: 12px; }

.td-hl { text-align: right; }
.hl-wrap { display: flex; align-items: center; gap: 4px; justify-content: flex-end; font-size: 12px; font-family: var(--font-mono); }
.hl-h { color: var(--up); }
.hl-l { color: var(--dn); }
.hl-sep { color: var(--text3); }

.td-vol, .td-mcap, .td-oi { text-align: right; color: var(--text2); font-family: var(--font-mono); font-size: 12px; }

.fr-val { font-family: var(--font-mono); font-size: 12px; }
.fr-val.up { color: var(--up); }
.fr-val.dn { color: var(--dn); }

.supply-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.supply-txt { font-size: 11px; color: var(--text2); font-family: var(--font-mono); }
.supply-bar-bg { width: 60px; height: 3px; background: var(--g5); border-radius: 2px; }
.supply-bar-fill { height: 100%; background: var(--g8); border-radius: 2px; transition: width .5s ease; }

.td-spark { text-align: right; padding-right: 1.2rem; }
.muted { color: var(--text3); font-size: 12px; }
</style>
