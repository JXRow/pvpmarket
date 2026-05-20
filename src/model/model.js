import { createPublicClient, formatEther, formatUnits, getAddress, http, isAddress } from 'viem'
import { networks } from './const'
import tradeServiceArtifact from './abi/TradeService.json'
import erc20Artifact from './abi/MockERC20.json'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const modelEvents = new EventTarget()
export const MODEL_EVENTS = {
  ORDERBOOK_UPDATED: 'orderbook:updated',
  USER_ORDERS_UPDATED: 'user-orders:updated',
  BALANCES_UPDATED: 'balances:updated',
  ERROR: 'model:error',
}

const ORDER_LIMIT = 10
const MAX_PROGRESS = 4294967295

export let asks = []
export let bids = []
export let orders = []

export const marketStats = [
  ['24h Vol(USD)', '---'],
  ['Liquidity', '---'],
  ['Market Cap', '---'],
  ['FDV', '---'],
]

export let pairInfo = {
  name: '--- -USDC',
  icon: '---',
  price: '---',
  change: '--',
  spread: '---',
}

export let balances = {
  native: '---',
  usdc: '---',
  nativeDecimals: 18,
  usdcDecimals: 6,
}

function emit(type, detail) {
  modelEvents.dispatchEvent(new CustomEvent(type, { detail }))
}

export function parseMarketRoute(pathname = window.location.pathname) {
  const [, networkKey, tokenAddress] = pathname.split('/')
  const network = networks[networkKey] ? networkKey : 'monad'
  const token = tokenAddress && isAddress(tokenAddress) ? getAddress(tokenAddress) : ZERO_ADDRESS

  return { network, token }
}

function getNetwork(networkKey) {
  return networks[networkKey] ?? networks.monad
}

function createClient(networkKey) {
  const network = getNetwork(networkKey)

  return createPublicClient({
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
}

export function getNativeTokenInfo(networkKey) {
  const network = getNetwork(networkKey)

  return {
    address: ZERO_ADDRESS,
    symbol: network.nativeCurrency.symbol,
    name: network.nativeCurrency.name,
    decimals: network.nativeCurrency.decimals,
    isNative: true,
  }
}

export async function readTokenInfo(networkKey, tokenAddress) {
  const address = tokenAddress && isAddress(tokenAddress) ? getAddress(tokenAddress) : ZERO_ADDRESS

  if (address === ZERO_ADDRESS) {
    return getNativeTokenInfo(networkKey)
  }

  const client = createClient(networkKey)
  const [symbol, decimals] = await Promise.all([
    client.readContract({ address, abi: erc20Artifact.abi, functionName: 'symbol' }),
    client.readContract({ address, abi: erc20Artifact.abi, functionName: 'decimals' }),
  ])

  return {
    address,
    symbol,
    name: symbol,
    decimals,
    isNative: false,
  }
}

function formatOrderBookNumber(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '---'
  }

  return number.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

function toOrderRow(order, tokenInDecimals, tokenOutDecimals, side) {
  const amountIn = Number(formatUnits(order.amountIn, tokenInDecimals))
  const amountWant = Number(formatUnits(order.amountWant, tokenOutDecimals))
  const price = side === 'bid'
    ? amountIn / amountWant
    : amountWant / amountIn
  const size = side === 'bid' ? amountWant : amountIn
  const total = price * size
  const progress = Number(order.progress) / MAX_PROGRESS

  return [
    formatOrderBookNumber(price),
    formatOrderBookNumber(size),
    formatOrderBookNumber(total),
    Math.max(8, Math.min(100, Math.round((1 - progress) * 100))),
  ]
}

async function readPendingOrders(client, tradeServiceAddress, tokenIn, tokenOut, tokenInDecimals, tokenOutDecimals, side) {
  const topOrderId = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getPendingOrdersTopId',
    args: [tokenIn, tokenOut],
  })
  const pendingOrders = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getPendingOrders',
    args: [tokenIn, tokenOut, topOrderId, ORDER_LIMIT],
  })

  return pendingOrders
    .filter((order) => order.orderId !== 0n && order.amountIn !== 0n && order.amountWant !== 0n)
    .map((order) => toOrderRow(order, tokenInDecimals, tokenOutDecimals, side))
    .filter((row) => row[0] !== '0' && row[1] !== '0')
}

export async function readOrderbook(networkKey, tokenAddress = ZERO_ADDRESS) {
  const network = getNetwork(networkKey)
  const tradeServiceAddress = network.contracts.tradeService?.address
  const usdcAddress = network.contracts.usdc?.address

  if (!tradeServiceAddress || !usdcAddress) {
    return
  }

  const tokenInfo = await readTokenInfo(networkKey, tokenAddress)
  const tokenInAddress = tokenInfo.isNative ? ZERO_ADDRESS : tokenInfo.address
  const client = createClient(networkKey)
  const usdcDecimals = await client.readContract({
    address: usdcAddress,
    abi: erc20Artifact.abi,
    functionName: 'decimals',
  })
  const [nextBids, nextAsks] = await Promise.all([
    readPendingOrders(client, tradeServiceAddress, usdcAddress, tokenInAddress, usdcDecimals, tokenInfo.decimals, 'bid'),
    readPendingOrders(client, tradeServiceAddress, tokenInAddress, usdcAddress, tokenInfo.decimals, usdcDecimals, 'ask'),
  ])

  bids = nextBids
  asks = nextAsks
  pairInfo = {
    ...pairInfo,
    name: `${tokenInfo.symbol}-USDC`,
    spread: nextBids[0]?.[0] ?? '---',
  }

  emit(MODEL_EVENTS.ORDERBOOK_UPDATED, { asks, bids, pairInfo })
}

function formatUserOrderDate(timestamp) {
  const date = new Date(Number(timestamp) * 1000)

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toUserOrderRow(order) {
  const side = order.tokenInSymbol === 'USDC' ? 'Buy' : 'Sell'
  const filled = `${((Number(order.progress) / MAX_PROGRESS) * 100).toFixed(2)}%`

  return [
    formatUserOrderDate(order.createTime),
    `${order.tokenOutSymbol === 'NativeToken' ? 'MON' : order.tokenOutSymbol}-USDC`,
    side,
    '---',
    order.amountIn.toString(),
    order.amountOut.toString(),
    filled,
  ]
}

export async function readUserOrders(networkKey, userAddress) {
  const network = getNetwork(networkKey)
  const tradeServiceAddress = network.contracts.tradeService?.address

  if (!tradeServiceAddress || !userAddress || !isAddress(userAddress)) {
    return
  }

  const client = createClient(networkKey)
  const userOrdersLength = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'userOrdersLength',
    args: [userAddress],
  })
  const userOrders = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getUserOrders',
    args: [userAddress, userOrdersLength, ORDER_LIMIT],
  })

  orders = userOrders
    .filter((order) => order.index !== 0n && !order.isRemoved)
    .map(toUserOrderRow)

  emit(MODEL_EVENTS.USER_ORDERS_UPDATED, orders)
}

export async function readBalances(networkKey, userAddress) {
  const network = getNetwork(networkKey)
  const usdcAddress = network.contracts.usdc?.address

  if (!usdcAddress || !userAddress || !isAddress(userAddress)) {
    return
  }

  const client = createClient(networkKey)
  const [usdcDecimals, usdcRawBalance, nativeRawBalance] = await Promise.all([
    client.readContract({ address: usdcAddress, abi: erc20Artifact.abi, functionName: 'decimals' }),
    client.readContract({ address: usdcAddress, abi: erc20Artifact.abi, functionName: 'balanceOf', args: [userAddress] }),
    client.getBalance({ address: userAddress }),
  ])

  balances = {
    native: formatEther(nativeRawBalance),
    usdc: formatUnits(usdcRawBalance, usdcDecimals),
    nativeDecimals: network.nativeCurrency.decimals,
    usdcDecimals,
  }

  emit(MODEL_EVENTS.BALANCES_UPDATED, balances)
}

export async function loadMarketModel({ networkKey, tokenAddress, userAddress }) {
  try {
    await Promise.all([
      readOrderbook(networkKey, tokenAddress),
      readUserOrders(networkKey, userAddress),
      readBalances(networkKey, userAddress),
    ])
  } catch (error) {
    emit(MODEL_EVENTS.ERROR, error)
  }
}
