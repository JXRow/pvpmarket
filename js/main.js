import { createApp, ref } from 'vue'
import * as viem from 'viem'
import { unichainSepolia } from 'viem/chains'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'

//unichainSepolia 2024/10/15
// const USDT_ADDR = '0x99b52f524b70cd0c93bd592b1843bf2f49a5fe75'
// const MEME_ADDR = '0x4355d86e90d1646d0b79a362b7e5b29092047bce'
// const SERVICE_ADDR = '0x9260bb1a28a1fd9f8dbd4386577003b51bb07fa6'
// const USDT_MEME_ADDR = '0x03DF076cA486b570a9Fb24bb77F7687B6e64b4Da'
// const MEME_USDT_ADDR = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'

const initTrdeAddr = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'
const USDs = {
	'0x99b52F524B70CD0c93BD592b1843Bf2f49a5FE75': 'USDT'
}
const SERVICE_ADDR = '0x9260bb1a28a1fd9f8dbd4386577003b51bb07fa6'
const MAX_UINT32 = 4294967295
const confirmations = 2

var USDT_ADDR
var MEME_ADDR
var USDT_MEME_ADDR
var MEME_USDT_ADDR
var fee

var memeInfo
var usdtInfo

var sellOrders
var buyOrders

var userOrderArr

var publicClient
var walletClient
async function updateAll() {
	updateConnetBtn()
	await getTradeInfo()
	await updateOrders()
}

async function updateOrders() {
	await getTokenInfo()
	await updateBalance()
	await getOrderList()
	await updateOrderbook()
	await getUserOrders()
	await updateMyOrderPanel()
}


function updateConnetBtn() {
	let user = viem.getAddress(walletClient.account.address)
	titlePanel.connect = user.slice(0, 5) + '..' + user.slice(-4)
}


async function updateBalance() {
	let meme = viem.formatUnits(memeInfo.balance, memeInfo.decimals)
	let usdt = viem.formatUnits(usdtInfo.balance, usdtInfo.decimals)
	balancePanel.meme = new Number(meme).toPrecision(6) + '(' + memeInfo.symbol + ')'
	balancePanel.usdt = new Number(usdt).toPrecision(6) + '(' + usdtInfo.symbol + ')'
	
	orderbookPanel.usdtSymbol = usdtInfo.symbol
	orderbookPanel.memeSymbol = memeInfo.symbol
}


async function updateOrderbook() {
	if (sellOrders.length == 0 || buyOrders.length == 0) return
	
	let _sellOrders = sellOrders.concat()
	if (_sellOrders.length > 6) _sellOrders.length = 6
	let _buyOrders = buyOrders.concat()
	if (_buyOrders.length > 6) _buyOrders.length = 6
		
	let average = { price: (_sellOrders[0].price + _buyOrders[0].price) / 2, amount: '', total: '' }
	_sellOrders.reverse()
	let orders = _sellOrders.concat(_buyOrders)
	_sellOrders.reverse()
	
	orders.forEach(function(order) {
		order.price = order.price.toPrecision(6)
		order.amount = order.amount.toPrecision(6)
		order.total = order.total.toPrecision(6)
	})
	average.price = average.price.toPrecision(6)
	orders.splice(_sellOrders.length, 0, average)
	
	orderbookPanel.orders = orders
	
	if (orderbookPanel.buyPrice == '') orderbookPanel.buyPrice = _sellOrders[0].price
	if (orderbookPanel.sellPrice == '') orderbookPanel.sellPrice = _buyOrders[0].price
}


async function updateMyOrderPanel() {
	let openOrders = []
	let historyOrders = []
	userOrderArr.forEach(function(order) {
		order.date = toDateStr(order.createTime)
		order.price = maxPrecision(order.price, 5)
		order.amount = maxPrecision(order.amount, 5)
		order.total = maxPrecision(order.total, 5)
		order.filled = (100 * order.filled).toPrecision(3) + '%'
		
		if (order.status == 'Pending') {
			openOrders.push(order)
		} else {
			historyOrders.push(order)
		}
	})
	
	myOrderPanel.openOrders = openOrders
	myOrderPanel.historyOrders = historyOrders
}


async function getTradeInfo() {
	const tradeWagmi = {
		address: initTrdeAddr,
		abi: tradeJson.abi
	}

	let arr = await publicClient.multicall({
		contracts: [
			{ ...tradeWagmi, functionName: 'token0' },
			{ ...tradeWagmi, functionName: 'token1' },
			{ ...tradeWagmi, functionName: 'fee' },
		]
	})
	if ( USDs[arr[1].result] ) {
		MEME_ADDR = arr[0].result
		USDT_ADDR = arr[1].result
		fee = arr[2].result
		const feeTo = '0x50D8aD8e7CC0C9c2236Aac2D2c5141C164168da3'
		
		MEME_USDT_ADDR = initTrdeAddr
		
		//local compute trade address
		let constructorParams = viem.encodeAbiParameters(
			[
			  { type: 'address' },
			  { type: 'address' },
			  { type: 'uint8' },
			  { type: 'address' }
			],
			[USDT_ADDR, MEME_ADDR, fee, feeTo]
		)
		let bytecodeHash = viem.keccak256(
			viem.encodePacked(
				['bytes', 'bytes'],
				[tradeJson.bytecode, constructorParams]
			)
		)
		let salt = viem.keccak256(
			viem.encodePacked(
				['address', 'address'], 
				[USDT_ADDR, MEME_ADDR]
			)
		)
		USDT_MEME_ADDR = viem.getContractAddress({
			bytecodeHash,
			from: SERVICE_ADDR,
			opcode: 'CREATE2', 
			salt
		})
	} else {
		dialog.showError('Trade address (in URL) is Wrong, try another one')
	}
}


async function getTokenInfo() {
	const memeWagmi = {
		address: MEME_ADDR,
		abi: erc20Json.abi
	}

	const usdtWagmi = {
		address: USDT_ADDR,
		abi: erc20Json.abi
	}

	let arr = await publicClient.multicall({
		contracts: [
			{ ...usdtWagmi, functionName: 'name' },
			{ ...usdtWagmi, functionName: 'symbol' },
			{ ...usdtWagmi, functionName: 'decimals' },
			{ ...usdtWagmi, functionName: 'balanceOf', args:[walletClient.account.address] },
			{ ...usdtWagmi, functionName: 'allowance', args:[walletClient.account.address, SERVICE_ADDR] },
			{ ...memeWagmi, functionName: 'name' },
			{ ...memeWagmi, functionName: 'symbol' },
			{ ...memeWagmi, functionName: 'decimals' },
			{ ...memeWagmi, functionName: 'balanceOf', args:[walletClient.account.address] },
			{ ...memeWagmi, functionName: 'allowance', args:[walletClient.account.address, SERVICE_ADDR] },
		]
	})
	
	usdtInfo = {
		name: arr[0].result,
		symbol: arr[1].result,
		decimals: arr[2].result,
		balance: arr[3].result,
		allowance: arr[4].result
	}		
	memeInfo = {
		name: arr[5].result,
		symbol: arr[6].result,
		decimals: arr[7].result,
		balance: arr[8].result,
		allowance: arr[9].result
	}
}


async function getOrderList() {
	//get sell list
	let fromOrderId = 0
	let num = 20
	sellOrders = await publicClient.readContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		args: [USDT_MEME_ADDR, fromOrderId, num],
		functionName: 'getOrderList',
	})
	sellOrders = sellOrders.filter(function(order) {
		let progress = (MAX_UINT32 - order.progress) / MAX_UINT32
		order.amount = parseFloat(viem.formatUnits(order.amountIn, memeInfo.decimals)) * progress
		order.total = parseFloat(viem.formatUnits(order.amountOut, usdtInfo.decimals)) * progress
		order.price = order.total / order.amount
		order.color = 'red'
		return order.orderId > 0
	})
	
	//get buy list
	fromOrderId = 0
	num = 20
	buyOrders = await publicClient.readContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		args: [MEME_USDT_ADDR, fromOrderId, num],
		functionName: 'getOrderList',
	})
	buyOrders = buyOrders.filter(function(order) {
		let progress = (MAX_UINT32 - order.progress) / MAX_UINT32
		order.amount = parseFloat(viem.formatUnits(order.amountOut, memeInfo.decimals)) * progress
		order.total = parseFloat(viem.formatUnits(order.amountIn, usdtInfo.decimals)) * progress
		order.price = order.total / order.amount
		order.color = 'green'
		return order.orderId > 0
	})
}


async function getUserOrders() {
	let lastIndex = 0
	let num = 20
	userOrderArr = await publicClient.readContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		args: [walletClient.account.address, lastIndex, num],
		functionName: 'getUserOrders',
	})
	console.log('userOrderArr:', userOrderArr)
	// userOrderArr:[{
	//     index: 7,
	//     trade: '0x566137bC9A4a28214B4407dd6dE8bff291C4C21F',
	//     token0: '0xD6B0cD180639D9464f51A0ECb816A22ADd26f701',
	//     token1: '0x89491dd50EdbEE8CaAE912cbA162a6b2C6aC69ce',
	//     orderId: 4,
	//     createTime: 1725165097,
	//     amountIn: 100000000000000000000n,
	//     amountOut: 130000000n,
	//     progress: 0,
	//     isRemoved: false
	//   },
	//   ...
	// ]
	
	userOrderArr = userOrderArr.filter(function(order) {
		order.pair = memeInfo.symbol + '/' + usdtInfo.symbol
		if (order.orderId == 0) {
			order.type = 'Take'
			if (USDs[order.token0]) {
				order.side = 'Buy'
				order.amount = parseFloat(viem.formatUnits(order.amountOut, memeInfo.decimals))
				order.total = parseFloat(viem.formatUnits(order.amountIn, usdtInfo.decimals))
			} else {
				order.side = 'Sell'
				order.amount = parseFloat(viem.formatUnits(order.amountIn, memeInfo.decimals))
				order.total = parseFloat(viem.formatUnits(order.amountOut, usdtInfo.decimals))
			}
		} else {
			order.type = 'Make'
			if (USDs[order.token1]) {
				order.side = 'Buy'
				order.amount = parseFloat(viem.formatUnits(order.amountOut, memeInfo.decimals))
				order.total = parseFloat(viem.formatUnits(order.amountIn, usdtInfo.decimals))
			} else {
				order.side = 'Sell'
				order.amount = parseFloat(viem.formatUnits(order.amountIn, memeInfo.decimals))
				order.total = parseFloat(viem.formatUnits(order.amountOut, usdtInfo.decimals))
			}
		}
		order.price = order.total / order.amount
		order.filled = parseFloat(order.progress / MAX_UINT32)
		if (order.progress == MAX_UINT32) {
			order.status = 'Done'
		} else if (order.isRemoved) {
			order.status = 'Cancelled'
		} else {
			order.status = 'Pending'
		}
		return order.index > 0
	})
}


const titlePanel = createApp({
	setup() {
		const connect = ref('Connect')
		
		async function onConnectBtn() {
			if (window.ethereum == undefined) {
				dialog.showError('It seems that you dont have wallet extension..')
			}
			
			publicClient = viem.createPublicClient({
				chain: unichainSepolia,
				transport: viem.http()
			})
			
			if (walletClient) {
				const [ address ] = await window.ethereum.request({
					method: "wallet_requestPermissions",
					params: [{
						eth_accounts: {}
					}]
				}).then(() => ethereum.request({
					method: 'eth_requestAccounts'
				}))
				
				walletClient = viem.createWalletClient({
					account: address,
					chain: unichainSepolia,
					transport: viem.custom(window.ethereum)
				})
				await updateAll()

			} else {
				const [ address ] = await window.ethereum.request({
					method: 'eth_requestAccounts'
				})
				walletClient = viem.createWalletClient({
					account: address,
					chain: unichainSepolia,
					transport: viem.custom(window.ethereum)
				})
				await updateAll()
			}
		}

		return {
			connect, onConnectBtn
		}
	}
}).mount('#titlePanel')


const balancePanel = createApp({
	setup() {
		const usdt = ref('____________')
		const meme = ref('____________')
		
		return {
			usdt, meme
		}
	}
}).mount('#balancePanel')


const orderbookPanel = createApp({
	setup() {
		const usdtSymbol = ref('???')
		const memeSymbol = ref('???')
		const orders = ref([])
		const buyPrice = ref('')
		const buyAmount = ref('')
		const buyTotal = ref('')
		const sellPrice = ref('')
		const sellAmount = ref('')
		const sellTotal = ref('')
		
		function onInput(e) {
			let value = parseFloat(e.target.value)
			if (isNaN(value)) {
				dialog.showTip('That\'s not a number')
				return
			}
			
			switch (e.target.id){
				case 'buyPriceInput':
					buyPrice.value = value
					buyTotal.value = maxPrecision(value * buyAmount.value, 6)
					break;
				case 'buyAmountInput':
					buyAmount.value = value
					buyTotal.value = maxPrecision(value * buyPrice.value, 6)
					break;
				case 'buyTotalInput':
					buyTotal.value = value
					if (buyPrice.value > 0) buyAmount.value = maxPrecision(value / buyPrice.value, 6)
					break;
				case 'sellPriceInput':
					sellPrice.value = value
					sellTotal.value = maxPrecision(value * sellAmount.value, 6)
					break;
				case 'sellAmountInput':
					sellAmount.value = value
					sellTotal.value = maxPrecision(value * sellPrice.value, 6)
					break;
				case 'sellTotalInput':
					sellTotal.value = value
					if (sellPrice.value > 0) sellAmount.value = maxPrecision(value / sellPrice.value, 6)
					break;
				default:
					break;
			}
		}
		
		async function onSellBtn() {
			let memeIn = viem.parseUnits(sellAmount.value.toString(), memeInfo.decimals)
			let usdtWant = viem.parseUnits(sellTotal.value.toString(), usdtInfo.decimals)
			await placeSellOrder(memeIn, usdtWant)
			
			await updateOrders()
		}	
		
		async function onBuyBtn() {
			let usdtIn = viem.parseUnits(buyTotal.value.toString(), usdtInfo.decimals)
			let memeWant = viem.parseUnits(buyAmount.value.toString(), memeInfo.decimals)
			await placeBuyOrder(usdtIn, memeWant)
			
			await updateOrders()
		}
		
		return {
			usdtSymbol, memeSymbol, orders, 
			buyPrice, buyAmount, buyTotal,
			sellPrice, sellAmount, sellTotal,
			onInput, onSellBtn, onBuyBtn
		}
	}
}).mount('#orderbookPanel')


const myOrderPanel = createApp({
	setup() {
		const tab = ref('open')
		const openOrders = ref([])
		const historyOrders = ref([])
		
		function onSwitchTab(_tab) {
			tab.value = _tab
		}
		
		function onCancelBtn(order) {
			let progress = (MAX_UINT32 - order.progress) / MAX_UINT32
			let left, symbol
			if (order.side == 'Buy') {
				left = maxPrecision(order.total * progress, 5)
				symbol = usdtInfo.symbol
			} else {
				left = maxPrecision(order.amount * progress, 5)
				symbol = memeInfo.symbol
			}
			dialog.showDialog('Cancel order to get back ' + left + ' ' + symbol, function() {
				cencelOrder(order)
			})
		}
		
		return {
			tab, openOrders, historyOrders, onSwitchTab, onCancelBtn
		}
	}
}).mount('#myOrderPanel')


async function cencelOrder(order) {
	let hash = await walletClient.writeContract({
		address: order.trade,
		abi: tradeJson.abi,
		functionName: 'cancelOrder',
		args: [order.orderId],
		account: walletClient.account
	})
	
	//updatePanel
	order.index = -1
	
	await publicClient.waitForTransactionReceipt({ confirmations, hash })
	await updateOrders()
}


async function placeSellOrder(memeIn, usdtWant) {
	let memeWithFee = memeIn * BigInt(fee) / 10000n + memeIn
	if (memeInfo.allowance < memeWithFee) {
		let hash = await walletClient.writeContract({
			address: MEME_ADDR,
			abi: erc20Json.abi,
			functionName: 'approve',
			args: [SERVICE_ADDR, memeWithFee],
			account: walletClient.account
		})
		await publicClient.waitForTransactionReceipt({ confirmations, hash })
		console.log('approve done')
	}
	
	let hash = await walletClient.writeContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		functionName: 'placeOrder',
		args: [MEME_USDT_ADDR, memeIn, usdtWant],
		account: walletClient.account
	})
	
	//insert PendingOrder
	let pendingOrder = {
		date: 'Committing',
		pair: memeInfo.symbol + '/' + usdtInfo.symbol,
		side: 'Sell',
		amount: parseFloat(viem.formatUnits(memeIn, memeInfo.decimals)),
		total: parseFloat(viem.formatUnits(usdtWant, usdtInfo.decimals)),
		filled: '0%'
	}
	pendingOrder.price = pendingOrder.total / pendingOrder.amount
	myOrderPanel.openOrders.unshift(pendingOrder)
	if (myOrderPanel.openOrders.length > 1) myOrderPanel.openOrders.pop()
	
	await publicClient.waitForTransactionReceipt({ confirmations, hash })
}


async function placeBuyOrder(usdtIn, memeWant) {
	let usdtWithFee = usdtIn * BigInt(fee) / 10000n + usdtIn
	if (usdtInfo.allowance < usdtWithFee) {
		let hash = await walletClient.writeContract({
			address: USDT_ADDR,
			abi: erc20Json.abi,
			functionName: 'approve',
			args: [SERVICE_ADDR, usdtWithFee],
			account: walletClient.account
		})
		await publicClient.waitForTransactionReceipt({ confirmations, hash })
		console.log('approve done')
	}

	let hash = await walletClient.writeContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		functionName: 'placeOrder',
		args: [USDT_MEME_ADDR, usdtIn, memeWant],
		account: walletClient.account
	})
	
	//insert PendingOrder
	let pendingOrder = {
		date: 'Committing',
		pair: memeInfo.symbol + '/' + usdtInfo.symbol,
		side: 'Buy',
		amount: parseFloat(viem.formatUnits(memeWant, memeInfo.decimals)),
		total: parseFloat(viem.formatUnits(usdtIn, usdtInfo.decimals)),
		filled: '0%'
	}
	pendingOrder.price = pendingOrder.total / pendingOrder.amount
	myOrderPanel.openOrders.unshift(pendingOrder)
	if (myOrderPanel.openOrders.length > 1) myOrderPanel.openOrders.pop()
	
	await publicClient.waitForTransactionReceipt({ confirmations, hash })
}


function maxPrecision(num, len) {
	let n = num.toPrecision(len)
	return parseFloat(n).toString()
}

function toDateStr(time) {
	let now = parseInt(Date.now() / 1000)
	if (now - time < 60) {
		return 'Recently'
	} else if (now - time < 60 * 60) {
		return parseInt((now - time) / 60) + ' min ago'
	} else if (now - time < 60 * 60 * 24) {
		return parseInt((now - time) / 60 / 60) + ' hrs ago'
	}
	return new Date(time * 1000).toLocaleDateString()
}