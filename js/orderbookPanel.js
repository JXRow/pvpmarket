import * as viem from 'viem'
import { createApp, ref, toRef } from 'vue'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as model from './model.js'
import * as myOrderPanel from './myOrderPanel.js'


const orderbookPanel = createApp({
	setup() {
		const usdtSymbol = ref('???')
		const memeSymbol = ref('???')
		const buyBtnTxt = ref('???')
		const sellBtnTxt = ref('???')
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
					setBuyPrice(value)
					break;
				case 'buyAmountInput':
					setBuyAmount(value)
					break;
				case 'buyTotalInput':
					setBuyTotal(value)
					break;
				case 'sellPriceInput':
					setSellPrice(value)
					break;
				case 'sellAmountInput':
					setSellAmount(value)
					break;
				case 'sellTotalInput':
					setSellTotal(value)
					break;
				default:
					break;
			}
		}

		async function onSellBtn() {
			let memeIn = viem.parseUnits(sellAmount.value.toString(), model.memeInfo.decimals)
			let usdtWant = viem.parseUnits(sellTotal.value.toString(), model.usdtInfo.decimals)
			if (memeIn <= 0n || usdtWant <= 0n) {
				dialog.showTip('Invalid number')
			} else {
				await placeSellOrder(memeIn, usdtWant)
			}
		}	

		async function onBuyBtn() {
			let usdtIn = viem.parseUnits(buyTotal.value.toString(), model.usdtInfo.decimals)
			let memeWant = viem.parseUnits(buyAmount.value.toString(), model.memeInfo.decimals)
			if (usdtIn <= 0n || memeWant <= 0n) {
				dialog.showTip('Invalid number')
			} else {
				await placeBuyOrder(usdtIn, memeWant)
			}
		}
		
		function onPriceClick(order) {
			if (isNaN(order.price)) return
			
			setSellPrice(order.price)
			setBuyPrice(order.price)
		}

		return {
			usdtSymbol, memeSymbol, buyBtnTxt, sellBtnTxt,
			orders, 
			buyPrice, buyAmount, buyTotal,
			sellPrice, sellAmount, sellTotal,
			onInput, onSellBtn, onBuyBtn, onPriceClick,
			toPrecision: util.toPrecision,
			maxPrecision: util.maxPrecision
		}
	}
}).mount('#orderbookPanel')


export function setBuyPrice(value) {
	orderbookPanel.buyPrice = value
	orderbookPanel.buyTotal = util.maxPrecision(value * orderbookPanel.buyAmount, 6)
}

export function setBuyAmount(value) {
	orderbookPanel.buyAmount = value
	orderbookPanel.buyTotal = util.maxPrecision(value * orderbookPanel.buyPrice, 6)
}

export function setBuyTotal(value) {
	orderbookPanel.buyTotal = value
	if (orderbookPanel.buyPrice > 0) orderbookPanel.buyAmount = util.maxPrecision(value / orderbookPanel.buyPrice, 6)
}

export function setSellPrice(value) {
	orderbookPanel.sellPrice = value
	orderbookPanel.sellTotal = util.maxPrecision(value * orderbookPanel.sellAmount, 6)
}

export function setSellAmount(value) {
	orderbookPanel.sellAmount = value
	orderbookPanel.sellTotal = util.maxPrecision(value * orderbookPanel.sellPrice, 6)
}

export function setSellTotal(value) {
	orderbookPanel.sellTotal = value
	if (orderbookPanel.sellPrice > 0) orderbookPanel.sellAmount = util.maxPrecision(value / orderbookPanel.sellPrice, 6)
}


async function updateList() {
	if (model.sellOrders.length == 0 || model.buyOrders.length == 0) return

	//combine the same price orders 
	let _copyArr = model.sellOrders.concat()
	let _sellOrders = []
	for (let a = 0; a < _copyArr.length; a++) {
		let orderA = _copyArr[a]
		let copy = Object.assign({}, orderA)
		let priceA = util.maxPrecision(orderA.price, 6)
		
		for (let b = a + 1; b < _copyArr.length; b++) {
			let orderB = _copyArr[b]
			let priceB = util.maxPrecision(orderB.price, 6)
			if (priceA == priceB) {
				copy.amount += orderB.amount
				copy.total += orderB.total
				_copyArr.splice(b, 1)
				b--
			}
		}
		_sellOrders.push(copy)
	}
	if (_sellOrders.length > 6) _sellOrders.length = 6
	
	_copyArr = model.buyOrders.concat()
	let _buyOrders = []
	for (let a = 0; a < _copyArr.length; a++) {
		let orderA = _copyArr[a]
		let copy = Object.assign({}, orderA)
		let priceA = util.maxPrecision(orderA.price, 6)
		
		for (let b = a + 1; b < _copyArr.length; b++) {
			let orderB = _copyArr[b]
			let priceB = util.maxPrecision(orderB.price, 6)
			if (priceA == priceB) {
				copy.amount += orderB.amount
				copy.total += orderB.total
				_copyArr.splice(b, 1)
				b--
			}
		}
		_buyOrders.push(copy)
	}
	if (_buyOrders.length > 6) _buyOrders.length = 6

	let average = { price: (parseFloat(_sellOrders[0].price) + parseFloat(_buyOrders[0].price)) / 2, amount: '', total: '' }
	while (_sellOrders.length < 6) {
		_sellOrders.push({ price:'-', amount:'', total:'', color:'red' })
	}
	while (_buyOrders.length < 6) {
		_buyOrders.push({ price:'-', amount:'', total:'', color:'green' })
	}
	_sellOrders.reverse()
	let orders = _sellOrders.concat(average, _buyOrders)
	_sellOrders.reverse()

	orderbookPanel.orders = orders

	if (orderbookPanel.buyPrice == '') orderbookPanel.buyPrice = util.maxPrecision(_sellOrders[0].price, 6)
	if (orderbookPanel.sellPrice == '') orderbookPanel.sellPrice = util.maxPrecision(_buyOrders[0].price, 6)
}

model.addEventListener('GotOrderList', updateList)


async function updateSymbol() {
	orderbookPanel.usdtSymbol = model.usdtInfo.symbol
	orderbookPanel.memeSymbol = model.memeInfo.symbol
	orderbookPanel.sellBtnTxt = model.memeInfo.symbol
	orderbookPanel.buyBtnTxt = model.memeInfo.symbol
}

model.addEventListener('GotPair', updateSymbol)


async function placeSellOrder(memeIn, usdtWant) {
	let memeWithFee = memeIn * BigInt(model.fee) / 10000n + memeIn
	if (model.memeInfo.balance < memeWithFee) {
		let memeWithFeeStr = util.maxPrecision(viem.formatUnits(memeWithFee, model.memeInfo.decimals), 6)
		dialog.showTip('You need ' + memeWithFeeStr + ' ' + model.memeInfo.symbol + '(with fee)')
		return
	}
	
	util.loading(toRef(orderbookPanel, 'sellBtnTxt'), model.memeInfo.symbol + ' *')
	let hash
	try {
		if (model.memeInfo.allowance < memeWithFee) {
			hash = await model.walletClient.writeContract({
				address: model.MEME_ADDR,
				abi: erc20Json.abi,
				functionName: 'approve',
				args: [model.SERVICE_ADDR, memeWithFee],
				account: model.walletClient.account
			})
			await model.publicClient.waitForTransactionReceipt({ confirmations: model.confirmations, hash })
		}

		hash = await model.walletClient.writeContract({
			address: model.SERVICE_ADDR,
			abi: serviceJson.abi,
			functionName: 'placeOrder',
			args: [model.MEME_USDT_ADDR, memeIn, usdtWant],
			account: model.walletClient.account
		})
	} catch(e) {
		orderbookPanel.sellBtnTxt = model.memeInfo.symbol
		return
	}
	
	orderbookPanel.sellBtnTxt = model.memeInfo.symbol
	
	//insert PendingOrder
	let pendingOrder = {
		date: 'Updating',
		pair: model.memeInfo.symbol + '/' + model.usdtInfo.symbol,
		side: 'Sell',
		amount: util.maxPrecision(viem.formatUnits(memeIn, model.memeInfo.decimals), 5),
		total: util.maxPrecision(viem.formatUnits(usdtWant, model.usdtInfo.decimals), 5),
		filled: '0%'
	}
	pendingOrder.price = util.maxPrecision(pendingOrder.total / pendingOrder.amount, 5)
	myOrderPanel.insertPendingOrder(pendingOrder)
	
	let tx
	try {
		tx = await model.publicClient.waitForTransactionReceipt({ confirmations: model.confirmations, hash })
	} catch(e) {
		dialog.showError('Network Error')
		myOrderPanel.removePendingOrder(pendingOrder, true)
		return
	}
	
	if (tx.status == 'success') {
		balloon.show('Tx Success', 'https://sepolia.uniscan.xyz/tx/' + hash)
		myOrderPanel.removePendingOrder(pendingOrder, false)
	} else {
		dialog.showError('Tx fail')
		myOrderPanel.removePendingOrder(pendingOrder, true)
	}
}


async function placeBuyOrder(usdtIn, memeWant) {
	let usdtWithFee = usdtIn * BigInt(model.fee) / 10000n + usdtIn
	if (model.usdtInfo.balance < usdtWithFee) {
		let usdtWithFeeStr = util.maxPrecision(viem.formatUnits(usdtWithFee, model.usdtInfo.decimals), 6)
		dialog.showTip('You need ' + usdtWithFeeStr + ' ' + model.usdtInfo.symbol + '(with fee)')
		return
	}
	
	util.loading(toRef(orderbookPanel, 'buyBtnTxt'), model.memeInfo.symbol + ' *')
	let hash
	try {
		if (model.usdtInfo.allowance < usdtWithFee) {
			hash = await model.walletClient.writeContract({
				address: model.USDT_ADDR,
				abi: erc20Json.abi,
				functionName: 'approve',
				args: [model.SERVICE_ADDR, usdtWithFee],
				account: model.walletClient.account
			})
			await model.publicClient.waitForTransactionReceipt({ confirmations: model.confirmations, hash })
		}
		
		hash = await model.walletClient.writeContract({
			address: model.SERVICE_ADDR,
			abi: serviceJson.abi,
			functionName: 'placeOrder',
			args: [model.USDT_MEME_ADDR, usdtIn, memeWant],
			account: model.walletClient.account
		})
	} catch(e) {
		orderbookPanel.buyBtnTxt = model.memeInfo.symbol
		return
	}
	
	orderbookPanel.buyBtnTxt = model.memeInfo.symbol
	
	//insert PendingOrder
	let pendingOrder = {
		date: 'Updating',
		pair: model.memeInfo.symbol + '/' + model.usdtInfo.symbol,
		side: 'Buy',
		amount: util.maxPrecision(viem.formatUnits(memeWant, model.memeInfo.decimals), 5),
		total: util.maxPrecision(viem.formatUnits(usdtIn, model.usdtInfo.decimals), 5),
		filled: '0%'
	}
	pendingOrder.price = util.maxPrecision(pendingOrder.total / pendingOrder.amount, 5)
	myOrderPanel.insertPendingOrder(pendingOrder)
	
	let tx
	try {
		tx = await model.publicClient.waitForTransactionReceipt({ confirmations: model.confirmations, hash })
	} catch(e) {
		dialog.showError('Network Error')
		myOrderPanel.removePendingOrder(pendingOrder, true)
		return
	}
	
	if (tx.status == 'success') {
		balloon.show('Tx Success', 'https://sepolia.uniscan.xyz/tx/' + hash)
		myOrderPanel.removePendingOrder(pendingOrder, false)
	} else {
		dialog.showError('Tx Fail')
		myOrderPanel.removePendingOrder(pendingOrder, true)
	}
}