import * as viem from 'viem'
import { createApp, ref } from 'vue'
import * as dialog from './dialog.js'
import * as util from './util.js'
import * as model from './model.js'


const balancePanel = createApp({
	setup() {
		const usdt = ref('____________')
		const meme = ref('____________')
		
		return {
			usdt, meme
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