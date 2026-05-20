import { createPublicClient, formatEther, formatUnits, http } from 'viem'
import { networks } from './const.js'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const USER_ADDRESS = '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D'
const USDC_ADDRESS = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'
const TRADE_SERVICE_ADDRESS = '0x11344C1ebcFd7EEb4d4BAA18A0312aEa854493A7'
const ORDER_LIMIT = 10

const tradeServiceAbi = [
  {
    type: 'function',
    name: 'getPair',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
    ],
    outputs: [
      { name: 'tradeAB', type: 'address' },
      { name: 'tradeBA', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'getPendingOrdersTopId',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
    ],
    outputs: [{ name: 'topOrderId', type: 'uint48' }],
  },
  {
    type: 'function',
    name: 'getPendingOrders',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fromOrderId', type: 'uint48' },
      { name: 'num', type: 'uint8' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'orderId', type: 'uint48' },
          { name: 'amountIn', type: 'uint112' },
          { name: 'amountWant', type: 'uint112' },
          { name: 'progress', type: 'uint32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'userOrdersLength',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint48' }],
  },
  {
    type: 'function',
    name: 'getUserOrders',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'lastIndex', type: 'uint48' },
      { name: 'num', type: 'uint48' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'index', type: 'uint48' },
          { name: 'trade', type: 'address' },
          { name: 'tokenInSymbol', type: 'string' },
          { name: 'tokenOutSymbol', type: 'string' },
          { name: 'orderId', type: 'uint48' },
          { name: 'createTime', type: 'uint32' },
          { name: 'amountIn', type: 'uint112' },
          { name: 'amountOut', type: 'uint112' },
          { name: 'progress', type: 'uint32' },
          { name: 'isRemoved', type: 'bool' },
        ],
      },
    ],
  },
]

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
]

const client = createPublicClient({
  chain: {
    id: networks.monad.id,
    name: networks.monad.name,
    nativeCurrency: networks.monad.nativeCurrency,
    rpcUrls: {
      default: { http: [networks.monad.rpc] },
    },
  },
  transport: http(networks.monad.rpc),
})

function toPlainOrder(order, tokenInDecimals, tokenOutDecimals) {
  return {
    orderId: order.orderId.toString(),
    amountIn: formatUnits(order.amountIn, tokenInDecimals),
    amountWant: formatUnits(order.amountWant, tokenOutDecimals),
    progress: order.progress.toString(),
  }
}

function toPlainUserOrder(order) {
  return {
    index: order.index.toString(),
    trade: order.trade,
    tokenInSymbol: order.tokenInSymbol,
    tokenOutSymbol: order.tokenOutSymbol,
    orderId: order.orderId.toString(),
    createTime: order.createTime.toString(),
    amountIn: order.amountIn.toString(),
    amountOut: order.amountOut.toString(),
    progress: order.progress.toString(),
    isRemoved: order.isRemoved,
  }
}

async function readPendingOrders(tokenIn, tokenOut, tokenInDecimals, tokenOutDecimals) {
  const topOrderId = await client.readContract({
    address: TRADE_SERVICE_ADDRESS,
    abi: tradeServiceAbi,
    functionName: 'getPendingOrdersTopId',
    args: [tokenIn, tokenOut],
  })

  const orders = await client.readContract({
    address: TRADE_SERVICE_ADDRESS,
    abi: tradeServiceAbi,
    functionName: 'getPendingOrders',
    args: [tokenIn, tokenOut, topOrderId, ORDER_LIMIT],
  })

  return orders
    .filter((order) => order.orderId !== 0n)
    .map((order) => toPlainOrder(order, tokenInDecimals, tokenOutDecimals))
}

async function main() {
  const [tradeMonUsdc, tradeUsdcMon] = await client.readContract({
    address: TRADE_SERVICE_ADDRESS,
    abi: tradeServiceAbi,
    functionName: 'getPair',
    args: [ZERO_ADDRESS, USDC_ADDRESS],
  })

  const [usdcSymbol, usdcDecimals, usdcRawBalance, monRawBalance] = await Promise.all([
    client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'symbol' }),
    client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'decimals' }),
    client.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [USER_ADDRESS] }),
    client.getBalance({ address: USER_ADDRESS }),
  ])

  const buyOrders = await readPendingOrders(USDC_ADDRESS, ZERO_ADDRESS, usdcDecimals, 18)
  const sellOrders = await readPendingOrders(ZERO_ADDRESS, USDC_ADDRESS, 18, usdcDecimals)
  const userOrdersLength = await client.readContract({
    address: TRADE_SERVICE_ADDRESS,
    abi: tradeServiceAbi,
    functionName: 'userOrdersLength',
    args: [USER_ADDRESS],
  })
  const userOrders = await client.readContract({
    address: TRADE_SERVICE_ADDRESS,
    abi: tradeServiceAbi,
    functionName: 'getUserOrders',
    args: [USER_ADDRESS, userOrdersLength, ORDER_LIMIT],
  })

  console.log('Network:', networks.monad.name)
  console.log('TradeService:', TRADE_SERVICE_ADDRESS)
  console.log('MON/USDC pair:', { tradeMonUsdc, tradeUsdcMon })
  console.log('User:', USER_ADDRESS)
  console.log('MON balance:', formatEther(monRawBalance))
  console.log(`${usdcSymbol} balance:`, formatUnits(usdcRawBalance, usdcDecimals))
  console.log('Buy orders USDC -> MON:', buyOrders)
  console.log('Sell orders MON -> USDC:', sellOrders)
  console.log('User orders:', userOrders.map(toPlainUserOrder))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
