import { ConnectButton } from '@rainbow-me/rainbowkit'

function GithubIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

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
          <div className="wallet-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a
              className="github-link"
              href="https://github.com/ZKSAFE/pvpmarket-contracts"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
            >
              <GithubIcon size={22} />
            </a>
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
