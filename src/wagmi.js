import { defineChain, http } from 'viem'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { networks } from './model/const'

const monad = defineChain({
  id: networks.monad.id,
  name: networks.monad.name,
  nativeCurrency: networks.monad.nativeCurrency,
  rpcUrls: {
    default: { http: [networks.monad.rpc] },
  },
  blockExplorers: {
    default: { name: 'Monadscan', url: networks.monad.blockExplorer },
  },
  contracts: networks.monad.contracts,
})

export const config = getDefaultConfig({
  appName: 'PvP Market',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [monad],
  transports: {
    [monad.id]: http(),
  },
})
