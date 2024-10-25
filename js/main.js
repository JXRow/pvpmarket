import { createApp, ref } from 'vue'
import * as viem from 'viem'
import { unichainSepolia } from 'viem/chains'
import erc20Json from './abi/MockERC20.json'
with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as util from './util.js'
import * as model from './model.js'
import * as balancePanel from './balancePanel.js'
import * as orderbookPanel from './orderbookPanel.js'
import * as myOrderPanel from './myOrderPanel.js'

//unichainSepolia 2024/10/15
// const USDT_ADDR = '0x99b52f524b70cd0c93bd592b1843bf2f49a5fe75'
// const MEME_ADDR = '0x4355d86e90d1646d0b79a362b7e5b29092047bce'
// const SERVICE_ADDR = '0x9260bb1a28a1fd9f8dbd4386577003b51bb07fa6'
// const USDT_MEME_ADDR = '0x03DF076cA486b570a9Fb24bb77F7687B6e64b4Da'
// const MEME_USDT_ADDR = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'

const initTrdeAddr = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'


var publicClient
var walletClient


window.onload = async () => {
	const accounts = await window.ethereum.request({
		method: 'eth_accounts'
	})
	console.log('eth_accounts:', accounts)
	if (accounts.length > 0) {
		await createConnect()
	}
}


const titlePanel = createApp({
	setup() {
		const connect = ref('Connect')
		
		async function onConnectBtn() {
			await createConnect()
		}
		
		return {
			connect,
			onConnectBtn
		}
	}
}).mount('#titlePanel')


async function createConnect() {
	if (window.ethereum == undefined) {
		dialog.showError('It seems that you dont have wallet extension..')
	}

	publicClient = viem.createPublicClient({
		chain: unichainSepolia,
		// transport: viem.webSocket('wss://sepolia.unichain.org')
		transport: viem.http()
	})

	if (walletClient) {
		const [address] = await window.ethereum.request({
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

	} else {
		const [address] = await window.ethereum.request({
			method: 'eth_requestAccounts'
		})
		walletClient = viem.createWalletClient({
			account: address,
			chain: unichainSepolia,
			transport: viem.custom(window.ethereum)
		})
	}

	updateView()
	await model.reset(initTrdeAddr, publicClient, walletClient)
}


function updateView() {
	let user = viem.getAddress(walletClient.account.address)
	titlePanel.connect = user.slice(0, 5) + '..' + user.slice(-4)
}