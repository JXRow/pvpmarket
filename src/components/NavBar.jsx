import { Menu } from 'lucide-react'
import ConnectWallet from './ConnectWallet'

export default function NavBar({ onConnect, onShowDialog }) {
  function handleComingSoon(feature) {
    onShowDialog?.({
      title: feature,
      content: 'This feature is under development. Stay tuned!',
      buttons: [{ text: 'OK' }],
    })
  }

  return (
    <header className="top-nav">
      <div className="nav-left">
        <a className="brand" href="#">PvP Market</a>
        <nav className="nav-links">
          <a className="active" href="#">Trade</a>
          <a href="#" onClick={(e) => { e.preventDefault(); handleComingSoon('Listing') }}>Listing</a>
          <a href="#" onClick={(e) => { e.preventDefault(); handleComingSoon('Docs') }}>Docs</a>
        </nav>
      </div>
      <div className="nav-actions">
        <ConnectWallet onConnect={onConnect} />
        <button className="mobile-menu"><Menu size={22} /></button>
      </div>
    </header>
  )
}
