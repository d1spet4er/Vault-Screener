import { ref, computed } from 'vue'

// ─── Binance API ───────────────────────────────────────────────────────────────
async function fetchBinanceSpot(symbols) {
  try {
    const [tickerRes, statsRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price'),
      fetch('https://api.binance.com/api/v3/ticker/24hr'),
    ])
    const prices = await tickerRes.json()
    const stats = await statsRes.json()

    const priceMap = {}
    prices.forEach(p => { priceMap[p.symbol] = parseFloat(p.price) })

    return stats
      .filter(s => s.symbol.endsWith('USDT') && symbols.includes(s.symbol))
      .map(s => ({
        symbol: s.symbol.replace('USDT', ''),
        price: parseFloat(s.lastPrice),
        change24h: parseFloat(s.priceChangePercent),
        volume24h: parseFloat(s.quoteVolume),
        high24h: parseFloat(s.highPrice),
        low24h: parseFloat(s.lowPrice),
        volumeBase: parseFloat(s.volume),
        trades: parseInt(s.count),
        exchange: 'Binance',
        market: 'spot',
      }))
  } catch (e) {
    console.error('Binance spot error:', e)
    return []
  }
}

async function fetchBinanceFutures(symbols) {
  try {
    const [tickerRes, frRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/ticker/24hr'),
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
    ])
    const stats = await tickerRes.json()
    const fr = await frRes.json()

    const frMap = {}
    fr.forEach(f => { frMap[f.symbol] = parseFloat(f.lastFundingRate) })

    return stats
      .filter(s => s.symbol.endsWith('USDT') && symbols.includes(s.symbol))
      .map(s => ({
        symbol: s.symbol.replace('USDT', ''),
        price: parseFloat(s.lastPrice),
        change24h: parseFloat(s.priceChangePercent),
        volume24h: parseFloat(s.quoteVolume),
        high24h: parseFloat(s.highPrice),
        low24h: parseFloat(s.lowPrice),
        volumeBase: parseFloat(s.volume),
        trades: parseInt(s.count),
        fundingRate: frMap[s.symbol] ?? null,
        exchange: 'Binance',
        market: 'futures',
      }))
  } catch (e) {
    console.error('Binance futures error:', e)
    return []
  }
}

// ─── Bybit API ─────────────────────────────────────────────────────────────────
async function fetchBybitSpot(symbols) {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
    const data = await res.json()
    if (data.retCode !== 0) return []

    return data.result.list
      .filter(s => s.symbol.endsWith('USDT') && symbols.includes(s.symbol))
      .map(s => ({
        symbol: s.symbol.replace('USDT', ''),
        price: parseFloat(s.lastPrice),
        change24h: parseFloat(s.price24hPcnt) * 100,
        volume24h: parseFloat(s.turnover24h),
        high24h: parseFloat(s.highPrice24h),
        low24h: parseFloat(s.lowPrice24h),
        volumeBase: parseFloat(s.volume24h),
        trades: null,
        exchange: 'Bybit',
        market: 'spot',
      }))
  } catch (e) {
    console.error('Bybit spot error:', e)
    return []
  }
}

async function fetchBybitFutures(symbols) {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear')
    const data = await res.json()
    if (data.retCode !== 0) return []

    return data.result.list
      .filter(s => s.symbol.endsWith('USDT') && symbols.includes(s.symbol))
      .map(s => ({
        symbol: s.symbol.replace('USDT', ''),
        price: parseFloat(s.lastPrice),
        change24h: parseFloat(s.price24hPcnt) * 100,
        volume24h: parseFloat(s.turnover24h),
        high24h: parseFloat(s.highPrice24h),
        low24h: parseFloat(s.lowPrice24h),
        volumeBase: parseFloat(s.volume24h),
        trades: null,
        fundingRate: parseFloat(s.fundingRate),
        openInterest: parseFloat(s.openInterest),
        exchange: 'Bybit',
        market: 'futures',
      }))
  } catch (e) {
    console.error('Bybit futures error:', e)
    return []
  }
}

// ─── CoinGecko for market cap + metadata ──────────────────────────────────────
const COINGECKO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOGE: 'dogecoin',
  DOT: 'polkadot', LINK: 'chainlink', MATIC: 'matic-network', UNI: 'uniswap',
  LTC: 'litecoin', ATOM: 'cosmos', NEAR: 'near', APT: 'aptos',
  OP: 'optimism', ARB: 'arbitrum', INJ: 'injective-protocol', SUI: 'sui',
}

async function fetchCoinGeckoMeta(symbols) {
  try {
    const ids = symbols.map(s => COINGECKO_IDS[s]).filter(Boolean).join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1`
    )
    const data = await res.json()
    const map = {}
    data.forEach(c => {
      const sym = Object.entries(COINGECKO_IDS).find(([, id]) => id === c.id)?.[0]
      if (sym) map[sym] = {
        mcap: c.market_cap,
        rank: c.market_cap_rank,
        supply: c.circulating_supply,
        maxSupply: c.max_supply,
        image: c.image,
        sparkline: c.sparkline_in_7d?.price ?? [],
      }
    })
    return map
  } catch (e) {
    console.error('CoinGecko error:', e)
    return {}
  }
}

// ─── Main composable ──────────────────────────────────────────────────────────
const SPOT_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT',
  'AVAXUSDT','DOGEUSDT','DOTUSDT','LINKUSDT','MATICUSDT','UNIUSDT',
  'LTCUSDT','ATOMUSDT','NEARUSDT','APTUSDT','OPUSDT','ARBUSDT',
  'INJUSDT','SUIUSDT',
]

const FUTURES_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT',
  'AVAXUSDT','DOGEUSDT','DOTUSDT','LINKUSDT','MATICUSDT','UNIUSDT',
  'LTCUSDT','ATOMUSDT','NEARUSDT','APTUSDT','OPUSDT','ARBUSDT',
  'INJUSDT','SUIUSDT',
]

export function useMarketData() {
  const coins = ref([])
  const meta = ref({})
  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)
  const exchange = ref('Binance')
  const market = ref('spot')

  const coinSymbols = computed(() =>
    market.value === 'spot' ? SPOT_SYMBOLS : FUTURES_SYMBOLS
  )

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      let tickers = []
      if (exchange.value === 'Binance') {
        tickers = market.value === 'spot'
          ? await fetchBinanceSpot(SPOT_SYMBOLS)
          : await fetchBinanceFutures(FUTURES_SYMBOLS)
      } else {
        tickers = market.value === 'spot'
          ? await fetchBybitSpot(SPOT_SYMBOLS)
          : await fetchBybitFutures(FUTURES_SYMBOLS)
      }

      const syms = tickers.map(t => t.symbol)
      const metaData = await fetchCoinGeckoMeta(syms)
      meta.value = metaData

      coins.value = tickers
        .map(t => ({
          ...t,
          mcap: metaData[t.symbol]?.mcap ?? null,
          rank: metaData[t.symbol]?.rank ?? 999,
          supply: metaData[t.symbol]?.supply ?? null,
          maxSupply: metaData[t.symbol]?.maxSupply ?? null,
          image: metaData[t.symbol]?.image ?? null,
          sparkline: metaData[t.symbol]?.sparkline ?? [],
        }))
        .sort((a, b) => a.rank - b.rank)

      lastUpdated.value = new Date()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    coins, meta, loading, error, lastUpdated,
    exchange, market, fetchData,
  }
}
