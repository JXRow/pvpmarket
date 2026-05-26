import { createPublicClient, getAddress, http, isAddress } from 'viem'
import { networks } from './const'
import { formatCompactUsd, formatPercent, formatUsd } from '../utils/util'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const erc20Abi = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
]

const geckoNetworks = {
  monad: 'monad',
}

const chartIntervals = {
  '1H': { timeframe: 'minute', aggregate: 5, limit: 12 },
  '24H': { timeframe: 'hour', aggregate: 1, limit: 24 },
  '7D': { timeframe: 'hour', aggregate: 12, limit: 14 },
}

const missingOhlcvCache = new Set()
const failedOhlcvCache = new Map()
const FAILED_OHLCV_CACHE_MS = 5 * 60 * 1000

export function parseMarketRoute(pathname = window.location.pathname) {
  const [, networkKey, tokenAddress] = pathname.split('/')
  const network = networks[networkKey] ? networkKey : 'monad'
  const token = tokenAddress && isAddress(tokenAddress) ? getAddress(tokenAddress) : ZERO_ADDRESS

  return { network, token }
}

export function getNativeTokenInfo(networkKey) {
  const network = networks[networkKey] ?? networks.monad

  return {
    address: ZERO_ADDRESS,
    symbol: network.nativeCurrency.symbol,
    name: network.nativeCurrency.name,
    decimals: network.nativeCurrency.decimals,
    isNative: true,
  }
}

export async function getTokenInfo(networkKey, tokenAddress) {
  const network = networks[networkKey] ?? networks.monad
  const address = tokenAddress && isAddress(tokenAddress) ? getAddress(tokenAddress) : ZERO_ADDRESS

  if (address === ZERO_ADDRESS) {
    return getNativeTokenInfo(networkKey)
  }

  const client = createPublicClient({
    chain: {
      id: network.id,
      name: network.name,
      nativeCurrency: network.nativeCurrency,
      rpcUrls: {
        default: { http: [network.rpc] },
      },
    },
    transport: http(network.rpc),
  })

  const symbol = await client.readContract({
    address,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  return {
    address,
    symbol,
    name: symbol,
    decimals: '---',
    isNative: false,
  }
}

export async function getMarketInfo(networkKey, tokenAddress) {
  const tokenInfo = await getTokenInfo(networkKey, tokenAddress)
  const network = networks[networkKey] ?? networks.monad
  const marketAddress = tokenInfo.isNative
    ? network.nativeCurrency.wrappedToken
    : tokenInfo.address

  if (!marketAddress) {
    return {
      icon: tokenInfo.symbol.slice(0, 1),
      symbol: `${tokenInfo.symbol}-USDC`,
      priceUsd: '---',
      change24h: '---',
      volume24hUsd: '---',
      liquidity: '---',
      marketCap: '---',
      fdv: '---',
      tokenInfo,
    }
  }

  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${marketAddress}`)

  if (!response.ok) {
    throw new Error('Failed to fetch market info')
  }

  const data = await response.json()
  const pairs = data.pairs ?? []
  const pair = pairs.find((item) => item.chainId === networkKey)
    ?? pairs.find((item) => item.chainId === network.name.toLowerCase().replaceAll(' ', ''))
    ?? pairs.find((item) => item.quoteToken?.symbol === 'USDC')
    ?? pairs[0]

  if (!pair) {
    return {
      icon: tokenInfo.symbol.slice(0, 1),
      symbol: `${tokenInfo.symbol}-USDC`,
      priceUsd: '---',
      change24h: '---',
      volume24hUsd: '---',
      liquidity: '---',
      marketCap: '---',
      fdv: '---',
      tokenInfo,
    }
  }

  return {
    icon: pair.info?.imageUrl ?? null,
    symbol: `${tokenInfo.symbol}-USDC`,
    priceUsd: formatUsd(pair.priceUsd),
    change24h: formatPercent(pair.priceChange?.h24),
    volume24hUsd: formatCompactUsd(pair.volume?.h24),
    liquidity: formatCompactUsd(pair.liquidity?.usd),
    marketCap: formatCompactUsd(pair.marketCap),
    fdv: formatCompactUsd(pair.fdv),
    tokenInfo,
  }
}

function getMarketAddress(networkKey, tokenInfo) {
  const network = networks[networkKey] ?? networks.monad

  return tokenInfo.isNative ? network.nativeCurrency.wrappedToken : tokenInfo.address
}

async function getDexScreenerPair(networkKey, tokenInfo) {
  const network = networks[networkKey] ?? networks.monad
  const marketAddress = getMarketAddress(networkKey, tokenInfo)

  if (!marketAddress) {
    return null
  }

  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${marketAddress}`)

  if (!response.ok) {
    throw new Error('Failed to fetch chart pair')
  }

  const data = await response.json()
  const pairs = data.pairs ?? []

  return pairs.find((item) => item.chainId === networkKey && item.quoteToken?.symbol === 'USDT')
    ?? pairs.find((item) => item.chainId === network.name.toLowerCase().replaceAll(' ', '') && item.quoteToken?.symbol === 'USDT')
    ?? pairs.find((item) => item.quoteToken?.symbol === 'USDT')
    ?? pairs.find((item) => item.chainId === networkKey && item.quoteToken?.symbol === 'USDC')
    ?? pairs.find((item) => item.chainId === network.name.toLowerCase().replaceAll(' ', '') && item.quoteToken?.symbol === 'USDC')
    ?? pairs.find((item) => item.quoteToken?.symbol === 'USDC')
    ?? pairs[0]
    ?? null
}

async function fetchGeckoOhlcv(geckoNetwork, pairAddress, interval, includeCurrency = false) {
  const params = new URLSearchParams({
    aggregate: `${interval.aggregate}`,
    limit: `${interval.limit}`,
  })

  if (includeCurrency) {
    params.set('currency', 'usd')
  }

  return fetch(`https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/pools/${pairAddress.toLowerCase()}/ohlcv/${interval.timeframe}?${params}`)
}

function normalizeOhlcvList(ohlcvList) {
  return ohlcvList
    .map((item) => ({
      time: item[0],
      open: Number(item[1]),
      high: Number(item[2]),
      low: Number(item[3]),
      close: Number(item[4]),
      volume: Number(item[5]),
    }))
    .filter((item) => Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => a.time - b.time)
}

function buildPairTrendPoints(pair, range) {
  const currentPrice = Number(pair?.priceUsd)

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return []
  }

  const changeKey = range === '1H' ? 'h1' : range === '7D' ? 'h24' : 'h24'
  const changePercent = Number(pair?.priceChange?.[changeKey] ?? 0)
  const previousPrice = currentPrice / (1 + changePercent / 100)
  const count = range === '7D' ? 14 : 12
  const now = Math.floor(Date.now() / 1000)
  const step = range === '1H' ? 300 : range === '7D' ? 43200 : 7200

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    const wave = Math.sin(progress * Math.PI * 3) * 0.006 * currentPrice
    const close = previousPrice + (currentPrice - previousPrice) * progress + wave

    return {
      time: now - step * (count - index - 1),
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
    }
  })
}

export async function getChartData(networkKey, tokenAddress, range = '24H') {
  const tokenInfo = await getTokenInfo(networkKey, tokenAddress)
  const pair = await getDexScreenerPair(networkKey, tokenInfo)
  const pairAddress = pair?.pairAddress
  const geckoNetwork = geckoNetworks[networkKey] ?? networkKey
  const interval = chartIntervals[range] ?? chartIntervals['24H']
  const ohlcvCacheKey = `${geckoNetwork}:${pairAddress}:${range}`

  if (!pairAddress) {
    return { tokenInfo, range, pair, points: [] }
  }

  const failedCacheTime = failedOhlcvCache.get(ohlcvCacheKey)
  const shouldUseFallback = missingOhlcvCache.has(ohlcvCacheKey)
    || (failedCacheTime && Date.now() - failedCacheTime < FAILED_OHLCV_CACHE_MS)

  if (shouldUseFallback) {
    return {
      tokenInfo,
      range,
      pair,
      points: buildPairTrendPoints(pair, range),
      source: 'dexscreener-trend',
    }
  }

  try {
    let response = await fetchGeckoOhlcv(geckoNetwork, pairAddress, interval)

    if (response.status === 400) {
      response = await fetchGeckoOhlcv(geckoNetwork, pairAddress, interval, true)
    }

    if (response.status === 404) {
      missingOhlcvCache.add(ohlcvCacheKey)
      throw new Error('Chart data not found')
    }

    if (response.status === 429) {
      failedOhlcvCache.set(ohlcvCacheKey, Date.now())
      throw new Error('Chart data rate limited')
    }

    if (!response.ok) {
      failedOhlcvCache.set(ohlcvCacheKey, Date.now())
      throw new Error('Failed to fetch chart data')
    }

    const data = await response.json()
    const ohlcvList = data.data?.attributes?.ohlcv_list ?? []
    const points = normalizeOhlcvList(ohlcvList)

    if (points.length >= 2) {
      return {
        tokenInfo,
        range,
        pair,
        points,
        source: 'geckoterminal',
      }
    }
  } catch {
    failedOhlcvCache.set(ohlcvCacheKey, Date.now())
    return {
      tokenInfo,
      range,
      pair,
      points: buildPairTrendPoints(pair, range),
      source: 'dexscreener-trend',
    }
  }

  return {
    tokenInfo,
    range,
    pair,
    points: buildPairTrendPoints(pair, range),
    source: 'dexscreener-trend',
  }
}
