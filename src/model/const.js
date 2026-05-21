export const networks = {
    monad: {
        id: 143,
        name: 'Monad Mainnet',
        nativeCurrency: {
            decimals: 18,
            name: 'Monad',
            symbol: 'MON',
            wrappedToken: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
        },
        rpc: 'https://rpc.monad.xyz',
        blockExplorer: 'https://monadscan.com',
        contracts: {
            multicall3: {
                address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            },
            usdc: {
                address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
            },
            tradeService: {
                address: '0x11344C1ebcFd7EEb4d4BAA18A0312aEa854493A7',
            },
        },
    },
}