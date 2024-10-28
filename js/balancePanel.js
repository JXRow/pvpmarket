import * as viem from 'viem'
import { createApp, ref } from 'vue'
import * as dialog from './dialog.js'
import * as util from './util.js'
import * as model from './model.js'
import * as orderbookPanel from './orderbookPanel.js'


const balancePanel = createApp({
	setup() {
		const usdt = ref('____________')
		const meme = ref('____________')
		
		function onUSDTClick() {
			if (parseFloat(usdt.value) > 0) orderbookPanel.setBuyTotal(parseFloat(usdt.value))
		}
		
		function onMEMEClick() {
			if (parseFloat(meme.value) > 0) orderbookPanel.setSellAmount(parseFloat(meme.value))
		}
		
		return {
			usdt, meme, onUSDTClick, onMEMEClick
		}
	}
}).mount('#balancePanel')


function onBalanceChange(e) {
	let meme = viem.formatUnits(model.memeInfo.balance, model.memeInfo.decimals)
	let usdt = viem.formatUnits(model.usdtInfo.balance, model.usdtInfo.decimals)
	balancePanel.meme = util.maxPrecision(meme, 6) + '(' + model.memeInfo.symbol + ')'
	balancePanel.usdt = util.maxPrecision(usdt, 6) + '(' + model.usdtInfo.symbol + ')'
}

model.addEventListener('BalanceChange', onBalanceChange)