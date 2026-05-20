import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function ConnectWallet({ onConnect }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div className="wallet-actions" style={{ display: 'flex', gap: '12px' }}>
            {ready && (
              <button
                className="network-btn"
                onClick={openChainModal}
                type="button"
              >
                {chain?.unsupported
                  ? 'Wrong Network'
                  : (chain?.name ?? 'Monad Mainnet')}
              </button>
            )}
            {connected ? (
              <button
                className="connect-btn"
                onClick={openAccountModal}
                type="button"
              >
                {account.displayName}
              </button>
            ) : (
              <button
                className="connect-btn"
                onClick={onConnect ?? openConnectModal}
                type="button"
              >
                Connect Wallet
              </button>
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
