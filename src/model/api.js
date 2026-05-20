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
