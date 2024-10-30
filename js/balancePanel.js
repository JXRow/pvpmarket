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
			if (parseFloat(usdt.value) > 0) {
				let usdtInput = model.usdtInfo.balance * 10000n / (BigInt(model.fee) + 10000n)
				let usdtInputFormat = util.maxPrecision(viem.formatUnits(usdtInput, model.usdtInfo.decimals), 6)
				orderbookPanel.setBuyTotal(usdtInputFormat)
			}
		}
		
		function onMEMEClick() {
			if (parseFloat(meme.value) > 0) {
				let memeInput = model.memeInfo.balance * 10000n / (BigInt(model.fee) + 10000n)
				let memeInputFormat = util.maxPrecision(viem.formatUnits(memeInput, model.memeInfo.decimals), 6)
				orderbookPanel.setSellAmount(memeInputFormat)
			}
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