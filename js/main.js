import { createApp, ref, toRef } from 'vue'
import * as viem from 'viem'
import { unichainSepolia } from 'viem/chains'
import erc20Json from './abi/MockERC20.json'with { type: "json" }
import serviceJson from './abi/TradeService.json' with { type: "json" }
import tradeJson from './abi/MonoTrade.json' with { type: "json" }
import * as dialog from './dialog.js'
import * as balloon from './balloon.js'
import * as util from './util.js'
import * as model from './model.js'
import * as balancePanel from './balancePanel.js'
import * as orderbookPanel from './orderbookPanel.js'
import * as myOrderPanel from './myOrderPanel.js'

const monadTestnet = viem.defineChain({
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Monad',
        symbol: 'MON',
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-rpc.monad.xyz/']
        },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: 'https://monad-testnet.socialscan.io/' },
    },
    contracts: {
        multicall3: {
            address: '0xa877a2247b318b40935e102926ba5ff4f3b0e8b1',
            // blockCreated: 5882,
        },
    },
})

//unichainSepolia 2024/10/15
// const USDT_ADDR = '0x99b52f524b70cd0c93bd592b1843bf2f49a5fe75'
// const MEME_ADDR = '0x4355d86e90d1646d0b79a362b7e5b29092047bce'
// const SERVICE_ADDR = '0x9260bb1a28a1fd9f8dbd4386577003b51bb07fa6'
// const USDT_MEME_ADDR = '0x03DF076cA486b570a9Fb24bb77F7687B6e64b4Da'
// const MEME_USDT_ADDR = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'

//monadDevnet 2024/10/26
// var USDT_ADDR = '0x43d42d3e31e03f898e901fa948165f50f67ff5ac'
// var MEME_ADDR = '0x11344c1ebcfd7eeb4d4baa18a0312aea854493a7'
// var SERVICE_ADDR = '0x072777f02ad827079f188d8175fb155b0e75343d'
// var USDT_MEME_ADDR = '0xB2129Db9ed160e01CdeBB01EdD7f01774810a178'
// var MEME_USDT_ADDR = '0x6eE62a29eaDfFb1e27d5C9525a3C3540D8264652'

//monadTestnet 2025/2/20
// var USDT_ADDR = '0x6d288698986a3b1c1286fb074c45ac2f10409e28'
// var MEME_ADDR = '0x072777f02ad827079f188d8175fb155b0e75343d'
// var SERVICE_ADDR = '0x36c2a57bdb0ce4082da82a1a8e84ae5f490f0134'
// var USDT_MEME_ADDR = '0xd315D242c31de0ecbE15eCAf0f1D6B729A9bE9F4'
// var MEME_USDT_ADDR = '0x1b09c7013a439dFdDC0453bEc454BCD2b3Fb7fFD'

// unichainSepolia.initTrdeAddr = '0x9b16489771c8D3DaD4aA8e09A6B540B0A02D24F6'
// monadDevnet.initTrdeAddr = '0x6eE62a29eaDfFb1e27d5C9525a3C3540D8264652'
monadTestnet.initTrdeAddr = '0x1b09c7013a439dFdDC0453bEc454BCD2b3Fb7fFD'
var currChain = monadTestnet

var publicClient
var walletClient


window.onload = async () => {
	const accounts = await window.ethereum.request({
		method: 'eth_accounts'
	})
	if (accounts.length > 0) {
		await createConnect()
	}
}

const titlePanel = createApp({
	setup() {
		const connect = ref('Connect')
		
		return {
			connect,
			onConnectBtn: createConnect,
			onClaimBtn: claim,
			onSelectChain: switchChain
		}
	}
}).mount('#titlePanel')


async function switchChain(e) {
	switch (e.target.value){
		case '1301':
			currChain = unichainSepolia
			await createConnect()
			break;
		case '10143':
			currChain = monadTestnet
			await createConnect()
			break;
	}
}


async function createConnect() {
	if (window.ethereum == undefined) {
		dialog.showError('It seems that you dont have wallet extension..')
	}
	
	util.loading(toRef(titlePanel, 'connect'), 'Connect *')
	
	try {
		publicClient = viem.createPublicClient({
			chain: currChain,
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
				chain: currChain,
				transport: viem.custom(window.ethereum)
			})
		
		} else {
			const [address] = await window.ethereum.request({
				method: 'eth_requestAccounts'
			})
			walletClient = viem.createWalletClient({
				account: address,
				chain: currChain,
				transport: viem.custom(window.ethereum)
			})
		}
		
		await window.ethereum.request({
			method: "wallet_switchEthereumChain",
			params: [{
				chainId: '0x' + currChain.id.toString(16)
			}]
		})
	} catch(e) {
		dialog.showError('Connect wallet failed')
		titlePanel.connect = 'Connect'
	}

	updateView()
	await model.reset(currChain.initTrdeAddr, publicClient, walletClient)
}


async function claim() {
	if (!walletClient) {
		dialog.showTip('You need connect wallet first')
		return
	}
	
	let confirmations = model.confirmations
	let hash = await walletClient.writeContract({
		address: model.USDT_ADDR,
		abi: erc20Json.abi,
		functionName: 'mint',
		args: [walletClient.account.address, viem.parseUnits('100', model.usdtInfo.decimals)],
		account: model.walletClient.account
	})
	
	hash = await model.walletClient.writeContract({
		address: model.MEME_ADDR,
		abi: erc20Json.abi,
		functionName: 'mint',
		args: [walletClient.account.address, viem.parseUnits('100', model.memeInfo.decimals)],
		account: model.walletClient.account
	})

	await model.publicClient.waitForTransactionReceipt({ confirmations, hash })
	dialog.showTip('100 USDT and 100 MEME had sent to you')
	model.getChanges()
}


function updateView() {
	let user = viem.getAddress(walletClient.account.address)
	titlePanel.connect = user.slice(0, 5) + '..' + user.slice(-4)
}