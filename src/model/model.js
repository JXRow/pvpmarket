import { createPublicClient, formatUnits, getAddress, http, isAddress } from 'viem'
import { networks } from './const'
import tradeServiceArtifact from './abi/TradeService.json'
import monoTradeArtifact from './abi/MonoTrade.json'
import erc20Artifact from './abi/MockERC20.json'
import { formatNumber } from '../utils/util'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const modelEvents = new EventTarget()
export const MODEL_EVENTS = {
  ORDERBOOK_UPDATED: 'orderbook:updated',
  USER_ORDERS_UPDATED: 'user-orders:updated',
  ORDER_HISTORY_UPDATED: 'order-history:updated',
  BALANCES_UPDATED: 'balances:updated',
  ERROR: 'model:error',
}

const ORDER_LIMIT = 20
const MAX_PROGRESS = 4294967295

export let asks = []
export let bids = []
export let orders = []
export let orderHistory = []

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
  pairExists: true,
}

export let balances = {
  targetToken: '---',
  usdc: '---',
  targetTokenDecimals: 18,
  targetTokenSymbol: '---',
  usdcDecimals: 6,
}

export function clearUserData() {
  balances = {
    targetToken: '---',
    usdc: '---',
    targetTokenDecimals: 18,
    targetTokenSymbol: '---',
    usdcDecimals: 6,
  }
  orders = []
  orderHistory = []
  emit(MODEL_EVENTS.BALANCES_UPDATED, balances)
  emit(MODEL_EVENTS.USER_ORDERS_UPDATED, orders)
  emit(MODEL_EVENTS.ORDER_HISTORY_UPDATED, orderHistory)
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

export function createClient(networkKey) {
  const network = getNetwork(networkKey)

  return createPublicClient({
    chain: {
      id: network.id,
      name: network.name,
      nativeCurrency: network.nativeCurrency,
      rpcUrls: {
        default: { http: [network.rpc] },
      },
      contracts: network.contracts,
    },
    transport: http(network.rpc),
    batch: { multicall: true },
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
  const tokenResults = await client.multicall({
    contracts: [
      { address, abi: erc20Artifact.abi, functionName: 'symbol' },
      { address, abi: erc20Artifact.abi, functionName: 'decimals' },
    ],
  })
  const symbol = tokenResults[0].result
  const decimals = tokenResults[1].result

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
  const rawAmountIn = Number(formatUnits(order.amountIn, tokenInDecimals))
  const rawAmountWant = Number(formatUnits(order.amountWant, tokenOutDecimals))
  const progress = Number(order.progress) / MAX_PROGRESS
  const remaining = 1 - progress

  const price = side === 'bid'
    ? rawAmountIn / rawAmountWant
    : rawAmountWant / rawAmountIn

  const size = side === 'bid' ? rawAmountWant * remaining : rawAmountIn * remaining
  const total = price * size

  return [
    formatOrderBookNumber(price),
    formatOrderBookNumber(size),
    formatOrderBookNumber(total),
    Math.max(8, Math.min(100, Math.round(remaining * 100))),
  ]
}

async function readPendingOrders(client, tradeServiceAddress, tokenIn, tokenOut, tokenInDecimals, tokenOutDecimals, side) {
  const pendingOrders = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getPendingOrders',
    args: [tokenIn, tokenOut, 0n, ORDER_LIMIT],
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

  const client = createClient(networkKey)
  const [tokenInfo, [usdcDecimalsRes]] = await Promise.all([
    readTokenInfo(networkKey, tokenAddress),
    client.multicall({
      contracts: [{ address: usdcAddress, abi: erc20Artifact.abi, functionName: 'decimals' }],
    }),
  ])
  const usdcDecimals = usdcDecimalsRes.result
  const tokenInAddress = tokenInfo.isNative ? ZERO_ADDRESS : tokenInfo.address
  const [tradeTokenUsdc, tradeUsdcToken] = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getPair',
    args: [tokenInAddress, usdcAddress],
  })
  const pairExists = tradeTokenUsdc !== ZERO_ADDRESS && tradeUsdcToken !== ZERO_ADDRESS

  if (!pairExists) {
    bids = []
    asks = []
    pairInfo = {
      ...pairInfo,
      name: `${tokenInfo.symbol}-USDC`,
      spread: '---',
      tokenAddress: tokenInAddress,
      tokenDecimals: tokenInfo.decimals,
      usdcAddress,
      usdcDecimals,
      tradeServiceAddress,
      pairExists,
    }
    emit(MODEL_EVENTS.ORDERBOOK_UPDATED, { asks, bids, pairInfo })
    return
  }

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
    tokenAddress: tokenInAddress,
    tokenDecimals: tokenInfo.decimals,
    usdcAddress,
    usdcDecimals,
    tradeServiceAddress,
    pairExists,
  }

  emit(MODEL_EVENTS.ORDERBOOK_UPDATED, { asks, bids, pairInfo })
}

function formatUserOrderDate(timestamp) {
  const date = new Date(Number(timestamp) * 1000)
  const pad = (n) => String(n).padStart(2, '0')

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toUserOrderRow(order, tradeTokenMap, tokenMap, nativeSymbol) {
  const isTaker = order.orderId == 0

  const tokenInSymbol = isTaker ? order.tokenOutSymbol : order.tokenInSymbol
  const tokenOutSymbol = isTaker ? order.tokenInSymbol : order.tokenOutSymbol

  const isBuy = tokenInSymbol === 'USDC'
  const side = isBuy ? 'Buy' : 'Sell'
  const filled = `${((Number(order.progress) / MAX_PROGRESS) * 100).toFixed(2)}%`

  const tokenInDisplay = tokenInSymbol === 'NativeToken' ? nativeSymbol : tokenInSymbol
  const tokenOutDisplay = tokenOutSymbol === 'NativeToken' ? nativeSymbol : tokenOutSymbol
  const pair = isBuy ? `${tokenOutDisplay}/${tokenInDisplay}` : `${tokenInDisplay}/${tokenOutDisplay}`

  let price = '---'
  let amount = '---'
  let total = '---'

  const tradeTokens = tradeTokenMap.get(order.trade)
  if (tradeTokens) {
    const { tokenA, tokenB } = tradeTokens
    const tokenAInfo = tokenMap.get(tokenA)
    const tokenBInfo = tokenMap.get(tokenB)

    if (tokenAInfo && tokenBInfo) {
      const normalizedIn = tokenInSymbol === 'NativeToken' ? nativeSymbol : tokenInSymbol
      const normalizedOut = tokenOutSymbol === 'NativeToken' ? nativeSymbol : tokenOutSymbol

      let tokenInAddr, tokenOutAddr
      if (tokenAInfo.symbol === normalizedIn && tokenBInfo.symbol === normalizedOut) {
        tokenInAddr = tokenA
        tokenOutAddr = tokenB
      } else if (tokenBInfo.symbol === normalizedIn && tokenAInfo.symbol === normalizedOut) {
        tokenInAddr = tokenB
        tokenOutAddr = tokenA
      }

      if (tokenInAddr && tokenOutAddr) {
        const tokenInInfo = tokenMap.get(tokenInAddr)
        const tokenOutInfo = tokenMap.get(tokenOutAddr)
        const amountInHuman = Number(formatUnits(order.amountIn, tokenInInfo.decimals))
        const amountOutHuman = Number(formatUnits(order.amountOut, tokenOutInfo.decimals))

        if (isBuy) {
          price = formatNumber(amountInHuman / amountOutHuman)
          amount = formatNumber(amountOutHuman)
          total = formatNumber(amountInHuman)
        } else {
          price = formatNumber(amountOutHuman / amountInHuman)
          amount = formatNumber(amountInHuman)
          total = formatNumber(amountOutHuman)
        }
      }
    }
  }

  return [
    formatUserOrderDate(order.createTime),
    pair,
    side,
    price,
    amount,
    total,
    filled,
    `${order.trade}-${order.index}`,
    order.trade,
    order.orderId ?? order[4],
  ]
}

export async function readUserOrders(networkKey, userAddress) {
  const network = getNetwork(networkKey)
  const tradeServiceAddress = network.contracts.tradeService?.address

  if (!tradeServiceAddress || !userAddress || !isAddress(userAddress)) {
    return
  }

  const client = createClient(networkKey)
  const [userOrdersLengthRes] = await client.multicall({
    contracts: [
      { address: tradeServiceAddress, abi: tradeServiceArtifact.abi, functionName: 'userOrdersLength', args: [userAddress] },
    ],
  })
  const userOrdersLength = userOrdersLengthRes.result
  if (userOrdersLength == 0) {
    orders = []
    orderHistory = []
    emit(MODEL_EVENTS.USER_ORDERS_UPDATED, orders)
    emit(MODEL_EVENTS.ORDER_HISTORY_UPDATED, orderHistory)
    return
  }
  const userOrders = await client.readContract({
    address: tradeServiceAddress,
    abi: tradeServiceArtifact.abi,
    functionName: 'getUserOrders',
    args: [userAddress, userOrdersLength, ORDER_LIMIT],
  })

  // Collect unique trade addresses and read token info (address, symbol, decimals)
  const uniqueTrades = [...new Set(
    userOrders.map((o) => o.trade).filter((addr) => addr && addr !== ZERO_ADDRESS)
  )]

  const tradeMulticallResults = await client.multicall({
    contracts: uniqueTrades.flatMap((trade) => [
      { address: trade, abi: monoTradeArtifact.abi, functionName: 'tokenA' },
      { address: trade, abi: monoTradeArtifact.abi, functionName: 'tokenB' },
    ]),
  })
  const tradeTokens = uniqueTrades.map((trade, i) => ({
    trade,
    tokenA: tradeMulticallResults[i * 2].result,
    tokenB: tradeMulticallResults[i * 2 + 1].result,
  }))

  const tokenAddrSet = new Set()
  tradeTokens.forEach(({ tokenA, tokenB }) => {
    tokenAddrSet.add(tokenA)
    tokenAddrSet.add(tokenB)
  })

  const tokenAddrs = [...tokenAddrSet]
  const erc20Addrs = tokenAddrs.filter((addr) => addr !== ZERO_ADDRESS)
  const nativeInfo = getNativeTokenInfo(networkKey)

  const tokenMulticall = erc20Addrs.length > 0
    ? await client.multicall({
        contracts: erc20Addrs.flatMap((addr) => [
          { address: addr, abi: erc20Artifact.abi, functionName: 'symbol' },
          { address: addr, abi: erc20Artifact.abi, functionName: 'decimals' },
        ]),
      })
    : []

  const tokenInfos = tokenAddrs.map((addr) => {
    if (addr === ZERO_ADDRESS) {
      return { addr, symbol: nativeInfo.symbol, decimals: nativeInfo.decimals }
    }
    const idx = erc20Addrs.indexOf(addr) * 2
    return {
      addr,
      symbol: tokenMulticall[idx].result,
      decimals: tokenMulticall[idx + 1].result,
    }
  })

  const tokenMap = new Map(tokenInfos.map((t) => [t.addr, t]))
  const tradeTokenMap = new Map()
  tradeTokens.forEach(({ trade, tokenA, tokenB }) => {
    tradeTokenMap.set(trade, { tokenA, tokenB })
  })

  const nativeSymbol = getNativeTokenInfo(networkKey).symbol

  const validOrders = userOrders.filter((order) => order.index != 0)

  orders = validOrders
    .filter((order) => !order.isRemoved)
    .map((order) => toUserOrderRow(order, tradeTokenMap, tokenMap, nativeSymbol))

  orderHistory = validOrders
    .filter((order) => order.isRemoved)
    .map((order) => toUserOrderRow(order, tradeTokenMap, tokenMap, nativeSymbol))

  emit(MODEL_EVENTS.USER_ORDERS_UPDATED, orders)
  emit(MODEL_EVENTS.ORDER_HISTORY_UPDATED, orderHistory)
}

export async function readBalances(networkKey, userAddress, tokenAddress = ZERO_ADDRESS) {
  const network = getNetwork(networkKey)
  const usdcAddress = network.contracts.usdc?.address

  if (!usdcAddress || !userAddress || !isAddress(userAddress)) {
    return
  }

  const client = createClient(networkKey)
  const targetTokenInfo = await readTokenInfo(networkKey, tokenAddress)
  const [usdcResults, targetRawBalance] = await Promise.all([
    client.multicall({
      contracts: [
        { address: usdcAddress, abi: erc20Artifact.abi, functionName: 'decimals' },
        { address: usdcAddress, abi: erc20Artifact.abi, functionName: 'balanceOf', args: [userAddress] },
      ],
    }),
    targetTokenInfo.isNative
      ? client.getBalance({ address: userAddress })
      : client.readContract({
        address: targetTokenInfo.address,
        abi: erc20Artifact.abi,
        functionName: 'balanceOf',
        args: [userAddress],
      }),
  ])
  const usdcDecimals = usdcResults[0].result
  const usdcRawBalance = usdcResults[1].result

  balances = {
    targetToken: formatUnits(targetRawBalance, targetTokenInfo.decimals),
    usdc: formatUnits(usdcRawBalance, usdcDecimals),
    targetTokenDecimals: targetTokenInfo.decimals,
    targetTokenSymbol: targetTokenInfo.symbol,
    usdcDecimals,
  }

  emit(MODEL_EVENTS.BALANCES_UPDATED, balances)
}

export async function loadMarketModel({ networkKey, tokenAddress, userAddress }) {
  try {
    await Promise.all([
      readOrderbook(networkKey, tokenAddress),
      readUserOrders(networkKey, userAddress),
      readBalances(networkKey, userAddress, tokenAddress),
    ])
  } catch (error) {
    emit(MODEL_EVENTS.ERROR, error)
  }
}
