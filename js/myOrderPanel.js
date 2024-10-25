import * as viem from 'viem'
import { createApp, ref } from 'vue'
import erc20Json from './abi/MockERC20.json' with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as util from './util.js'
import * as model from './model.js'


const myOrderPanel = createApp({
	setup() {
		const tab = ref('open')
		const openOrders = ref([])
		const historyOrders = ref([])

		function onSwitchTab(_tab) {
			tab.value = _tab
		}

		function onCancelBtn(order) {
			let progress = (model.MAX_UINT32 - order.progress) / model.MAX_UINT32
			let left, symbol
			if (order.side == 'Buy') {
				left = util.maxPrecision(order.total * progress, 5)
				symbol = model.usdtInfo.symbol
			} else {
				left = util.maxPrecision(order.amount * progress, 5)
				symbol = model.memeInfo.symbol
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


async function updateView() {
	let openOrders = []
	let historyOrders = []

	model.userOrderArr.forEach(function(order) {
		const copy = Object.assign({}, order)
		copy.date = util.toDateStr(order.createTime)
		copy.price = util.maxPrecision(order.price, 5)
		copy.amount = util.maxPrecision(order.amount, 5)
		copy.total = util.maxPrecision(order.total, 5)
		copy.filled = (100 * order.filled).toPrecision(3) + '%'

		if (copy.status == 'Pend') {
			openOrders.push(copy)
		} else {
			historyOrders.push(copy)
		}
	})

	myOrderPanel.openOrders = openOrders
	myOrderPanel.historyOrders = historyOrders
}

model.addEventListener('GotUserOrders', updateView)


export function insertPendingOrder(pendingOrder) {
	myOrderPanel.openOrders.unshift(pendingOrder)
}


async function cencelOrder(order) {
	let confirmations = model.confirmations
	let hash = await model.walletClient.writeContract({
		address: order.trade,
		abi: tradeJson.abi,
		functionName: 'cancelOrder',
		args: [order.orderId],
		account: model.walletClient.account
	})

	//updatePanel
	for (let copy of myOrderPanel.openOrders) {
		if (copy.index == order.index) {
			copy.index = -1
		}
	}

	await model.publicClient.waitForTransactionReceipt({ confirmations, hash })
	model.getChanges()
}