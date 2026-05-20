import { Menu } from 'lucide-react'
import ConnectWallet from './ConnectWallet'

export default function NavBar({ onConnect, onTokens, onPool, onActivity }) {
  return (
    <header className="top-nav">
      <div className="nav-left">
        <a className="brand" href="#">PvP Market</a>
        <nav className="nav-links">
          <a className="active" href="#">Trade</a>
          <a href="#" onClick={onTokens}>Tokens</a>
          <a href="#" onClick={onPool}>Pool</a>
          <a href="#" onClick={onActivity}>Activity</a>
        </nav>
      </div>
      <div className="nav-actions">
        <ConnectWallet onConnect={onConnect} />
        <button className="mobile-menu"><Menu size={22} /></button>
      </div>
    </header>
  )
}
