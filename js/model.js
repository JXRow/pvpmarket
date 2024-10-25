import * as viem from 'viem'
import { unichainSepolia } from 'viem/chains'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'

export const USDs = {
	'0x99b52F524B70CD0c93BD592b1843Bf2f49a5FE75': 'USDT'
}
export const SERVICE_ADDR = '0x9260bb1a28a1fd9f8dbd4386577003b51bb07fa6'
export const MAX_UINT32 = 4294967295
export const confirmations = 2

export var publicClient
export var walletClient

export var initTrdeAddr
export var USDT_ADDR
export var MEME_ADDR
export var USDT_MEME_ADDR
export var MEME_USDT_ADDR
export var fee

export var memeInfo = {}
export var usdtInfo = {}
export var sellOrders = []
export var buyOrders = []
export var userOrderArr = []


export async function reset(_initTrdeAddr, _publicClient, _walletClient) {
	initTrdeAddr = _initTrdeAddr
	publicClient = _publicClient
	walletClient = _walletClient
	
	await getTradeInfo()
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
		
		await getTokenInfo()
		await getOrderList()
		await getUserOrders()

		watchEvents()
		
	} else {
		dialog.showError('Trade address (in URL) is Wrong, try another one')
	}
}

var memeWagmi, usdtWagmi
async function getTokenInfo() {
	memeWagmi = {
		address: MEME_ADDR,
		abi: erc20Json.abi
	}

	usdtWagmi = {
		address: USDT_ADDR,
		abi: erc20Json.abi
	}

	let userAddr = walletClient.account.address
	let arr = await publicClient.multicall({
		contracts: [
			{ ...usdtWagmi, functionName: 'name' },
			{ ...usdtWagmi, functionName: 'symbol' },
			{ ...usdtWagmi, functionName: 'decimals' },
			{ ...usdtWagmi, functionName: 'balanceOf', args:[userAddr] },
			{ ...usdtWagmi, functionName: 'allowance', args:[userAddr, SERVICE_ADDR] },
			{ ...memeWagmi, functionName: 'name' },
			{ ...memeWagmi, functionName: 'symbol' },
			{ ...memeWagmi, functionName: 'decimals' },
			{ ...memeWagmi, functionName: 'balanceOf', args:[userAddr] },
			{ ...memeWagmi, functionName: 'allowance', args:[userAddr, SERVICE_ADDR] },
		]
	})
	
	let usdtDelta = 0n
	if (usdtInfo.balance) {
		usdtDelta = arr[3].result - usdtInfo.balance
	}
	let memeDelta = 0n
	if (memeInfo.balance) {
		memeDelta = arr[8].result - memeInfo.balance
	}
	
	usdtInfo.name = arr[0].result
	usdtInfo.symbol = arr[1].result
	usdtInfo.decimals = arr[2].result
	usdtInfo.balance = arr[3].result
	usdtInfo.allowance = arr[4].result
	
	memeInfo.name = arr[5].result
	memeInfo.symbol = arr[6].result
	memeInfo.decimals = arr[7].result
	memeInfo.balance = arr[8].result
	memeInfo.allowance = arr[9].result
	
	await dispatchEvent('GotPair', null)
	await dispatchEvent('BalanceChange', { usdtDelta, memeDelta })
}

var currInterval = -1
function watchEvents() {
	if (currInterval > -1) clearInterval(currInterval)
	
	currInterval = setInterval(doGetChanges, 5000)
}

function doGetChanges() {
	getBalance()
	getOrderList()
	getUserOrders(currInterval)
}

export function getChanges() {
	//reset currInterval
	watchEvents()
	
	getBalance()
	getOrderList()
	getUserOrders(currInterval)
}


async function getBalance() {
	let userAddr = walletClient.account.address
	let arr = await publicClient.multicall({
		contracts: [
			{ ...usdtWagmi, functionName: 'balanceOf', args:[userAddr] },
			{ ...usdtWagmi, functionName: 'allowance', args:[userAddr, SERVICE_ADDR] },
			{ ...memeWagmi, functionName: 'balanceOf', args:[userAddr] },
			{ ...memeWagmi, functionName: 'allowance', args:[userAddr, SERVICE_ADDR] },
		]
	})
	
	let usdtDelta = 0n
	if (usdtInfo.balance) {
		usdtDelta = arr[0].result - usdtInfo.balance
	}
	let memeDelta = 0n
	if (memeInfo.balance) {
		memeDelta = arr[2].result - memeInfo.balance
	}
	
	usdtInfo.balance = arr[0].result
	usdtInfo.allowance = arr[1].result
	
	memeInfo.balance = arr[2].result
	memeInfo.allowance = arr[3].result
	
	if (usdtDelta != 0n || memeDelta != 0n) {
		await dispatchEvent('BalanceChange', { usdtDelta, memeDelta })
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
	
	await dispatchEvent('GotOrderList', null)
}


async function getUserOrders(_Interval) {
	let lastIndex = 0
	let num = 20
	userOrderArr = await publicClient.readContract({
		address: SERVICE_ADDR,
		abi: serviceJson.abi,
		args: [walletClient.account.address, lastIndex, num],
		functionName: 'getUserOrders',
	})
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
			order.status = 'Canc'
		} else {
			order.status = 'Pend'
		}
		return order.index > 0
	})
	
	if (_Interval == currInterval) {
		console.log('GotUserOrders')
		await dispatchEvent('GotUserOrders', null)
	}
}


let typeToListeners = {}
export function addEventListener(type, callback) {
	if (typeToListeners[type] == undefined) {
		typeToListeners[type] = []
	}
	let i = typeToListeners[type].indexOf(callback)
	if (i == -1) {
		typeToListeners[type].push(callback)
	}
}

export function removeEventListener(type, callback) {
	if (typeToListeners[type]) {
		let i = typeToListeners[type].indexOf(callback)
		if (i > -1) {
			typeToListeners[type].splice(i, 1)
		}
	}
}

async function dispatchEvent(type, arg) {
	if (typeToListeners[type]) {
		let e = { type, arg }
		for (let callback of typeToListeners[type]) {
			await callback(e)
		}
	}
}