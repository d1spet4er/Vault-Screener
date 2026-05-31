import { ref } from 'vue'

const TOP_N = 100 // сколько монет показывать

// ─── Binance API ───────────────────────────────────────────────────────────────
async function fetchBinanceSpot() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr')
    const stats = await res.json()

    return stats
      .filter(s => s.symbol.endsWith('USDT') && !s.symbol.includes('UP') && !s.symbol.includes('DOWN') && !s.symbol.includes('BEAR') && !s.symbol.includes('BULL'))
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
      .filter(s => s.volume24h > 100000) // фильтр мусорных пар
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N)
  } catch (e) {
    console.error('Binance spot error:', e)
    return []
  }
}

async function fetchBinanceFutures() {
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
      .filter(s => s.symbol.endsWith('USDT'))
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
      .filter(s => s.volume24h > 500000)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N)
  } catch (e) {
    console.error('Binance futures error:', e)
    return []
  }
}

// ─── Bybit API ─────────────────────────────────────────────────────────────────
async function fetchBybitSpot() {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot')
    const data = await res.json()
    if (data.retCode !== 0) return []

    return data.result.list
      .filter(s => s.symbol.endsWith('USDT') && !s.symbol.includes('UP') && !s.symbol.includes('DOWN'))
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
      .filter(s => s.volume24h > 100000)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N)
  } catch (e) {
    console.error('Bybit spot error:', e)
    return []
  }
}

async function fetchBybitFutures() {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear')
    const data = await res.json()
    if (data.retCode !== 0) return []

    return data.result.list
      .filter(s => s.symbol.endsWith('USDT'))
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
      .filter(s => s.volume24h > 500000)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, TOP_N)
  } catch (e) {
    console.error('Bybit futures error:', e)
    return []
  }
}

// ─── CoinGecko — иконки и маркет кап ──────────────────────────────────────────
async function fetchCoinGeckoMeta(symbols) {
  try {
    // Используем search endpoint для получения id по символу
    const topSymbols = symbols.slice(0, 50) // CoinGecko лимит

    // Получаем топ 250 монет по маркет капу — покрывает большинство символов
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
    )
    const data = await res.json()

    const map = {}
    data.forEach(c => {
      const sym = c.symbol.toUpperCase()
      if (symbols.includes(sym)) {
        map[sym] = {
          mcap: c.market_cap,
          rank: c.market_cap_rank,
          supply: c.circulating_supply,
          maxSupply: c.max_supply,
          image: c.image,
          sparkline: [],
        }
      }
    })
    return map
  } catch (e) {
    console.error('CoinGecko error:', e)
    return {}
  }
}

// ─── Main composable ──────────────────────────────────────────────────────────
export function useMarketData() {
  const coins = ref([])
  const meta = ref({})
  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)
  const exchange = ref('Binance')
  const market = ref('spot')

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      let tickers = []

      if (exchange.value === 'Binance') {
        tickers = market.value === 'spot'
          ? await fetchBinanceSpot()
          : await fetchBinanceFutures()
      } else {
        tickers = market.value === 'spot'
          ? await fetchBybitSpot()
          : await fetchBybitFutures()
      }

      const syms = [...new Set(tickers.map(t => t.symbol))]
      const metaData = await fetchCoinGeckoMeta(syms)
      meta.value = metaData

      coins.value = tickers.map((t, i) => ({
        ...t,
        mcap: metaData[t.symbol]?.mcap ?? null,
        rank: metaData[t.symbol]?.rank ?? (i + 1),
        supply: metaData[t.symbol]?.supply ?? null,
        maxSupply: metaData[t.symbol]?.maxSupply ?? null,
        image: metaData[t.symbol]?.image ?? null,
        sparkline: [],
      }))

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
