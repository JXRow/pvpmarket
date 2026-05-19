import { useRef, useState } from 'react'
import { Activity, ArrowRight, BarChart3, ChevronDown, Menu, TrendingUp, Wallet } from 'lucide-react'

const asks = [
  ['2,456.80', '1.250', '3,071.00', 86],
  ['2,456.50', '0.800', '1,965.20', 62],
  ['2,456.20', '0.500', '1,228.10', 42],
  ['2,455.90', '0.250', '613.97', 28],
  ['2,455.75', '0.100', '245.57', 16],
]

const bids = [
  ['2,455.20', '0.150', '368.28', 22],
  ['2,455.00', '0.400', '982.00', 36],
  ['2,454.80', '0.750', '1,841.10', 52],
  ['2,454.50', '1.100', '2,699.95', 72],
  ['2,454.00', '2.500', '6,135.00', 90],
]

const orders = [
  ['10/24 14:32', 'ETH-USDC', 'Buy', '2,450.00', '1.500', '3,675.00', '0.00%'],
  ['10/24 10:15', 'WBTC-USDC', 'Sell', '65,100.00', '0.250', '16,275.00', '45.00%'],
  ['10/23 22:08', 'MON-USDC', 'Buy', '0.0421', '12,000', '505.20', '100%'],
]

function NavBar({ onConnect, onTokens, onPool, onActivity }) {
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
        <button className="network-btn">Monad Mainnet <ChevronDown size={16} /></button>
        <button className="connect-btn" onClick={onConnect}>Connect Wallet</button>
        <button className="mobile-menu"><Menu size={22} /></button>
      </div>
    </header>
  )
}

function PromptDialog({ dialog, isOpen, onClose, onExited }) {
  if (!dialog) {
    return null
  }

  function handleAnimationEnd(event) {
    if (!isOpen && event.target === event.currentTarget) {
      onExited()
    }
  }

  function handleButtonClick(button) {
    button.onClick?.()
    onClose()
  }

  const buttons = dialog.buttons?.length ? dialog.buttons : [{ text: 'OK' }]

  return (
    <div className={`dialog-overlay ${isOpen ? 'open' : 'closing'}`} onAnimationEnd={handleAnimationEnd}>
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="prompt-dialog-title">
        <h2 id="prompt-dialog-title">{dialog.title}</h2>
        <p>{dialog.content}</p>
        <div className="dialog-actions">
          {buttons.map((button) => (
            <button className="dialog-action-btn" key={button.text} onClick={() => handleButtonClick(button)}>
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`toast-card ${toast.closing ? 'closing' : 'open'}`} key={toast.id}>
          {toast.content}
        </div>
      ))}
    </div>
  )
}

function CalloutNotice({ notice, onHide }) {
  if (!notice) {
    return null
  }

  return (
    <aside className={`callout-notice ${notice.closing ? 'closing' : ''} ${notice.instant ? 'instant' : 'open'}`}>
      <div className="callout-content">{notice.content}</div>
      {notice.showHide && (
        <button className="callout-hide-btn" onClick={onHide}>Hide</button>
      )}
    </aside>
  )
}

function OrderRow({ row, type }) {
  const [price, size, total, depth] = row
  return (
    <div className={`order-row ${type}`}>
      <span className="depth" style={{ width: `${depth}%` }} />
      <span>{price}</span>
      <span>{size}</span>
      <span>{total}</span>
    </div>
  )
}

function OrderBook() {
  return (
    <section className="card order-book">
      <div className="section-heading">
        <h2>Order Book</h2>
        <span>ETH / USDC</span>
      </div>
      <div className="book-header">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      <div className="book-side asks">
        {asks.map((row) => <OrderRow key={row[0]} row={row} type="ask" />)}
      </div>
      <div className="spread-line">
        <strong>2,455.50</strong>
        <span><TrendingUp size={16} /> $2,455.50</span>
      </div>
      <div className="book-side bids">
        {bids.map((row) => <OrderRow key={row[0]} row={row} type="bid" />)}
      </div>
    </section>
  )
}

function TradePanel() {
  const [side, setSide] = useState('buy')
  const isBuy = side === 'buy'
  const panel = isBuy
    ? {
        balance: 'Avail: 10,450.00 USDC',
        amountToken: 'USDC',
        totalToken: 'ETH',
        buttonText: 'Buy ETH',
      }
    : {
        balance: 'Avail: 8.240 ETH',
        amountToken: 'ETH',
        totalToken: 'USDC',
        buttonText: 'Sell ETH',
      }

  return (
    <section className="card trade-panel">
      <div className="trade-tabs">
        <button className={isBuy ? 'selected buy' : ''} onClick={() => setSide('buy')}>Buy</button>
        <button className={!isBuy ? 'selected sell' : ''} onClick={() => setSide('sell')}>Sell</button>
      </div>
      <div className={`trade-panel-body ${side}`} key={side}>
        <div className="balance-line">
          <span>{panel.balance}</span>
          <Wallet size={16} />
        </div>
        <div className="field-stack">
          <label className="trade-field">
            <span><em>Price</em><b>USDC per ETH</b></span>
            <input value="2,455.50" readOnly />
          </label>
          <label className="trade-field">
            <span><em>Amount</em><b>{panel.amountToken}</b></span>
            <input placeholder="0.00" readOnly />
          </label>
          <div className="chips">
            {['25%', '50%', '75%', '100%'].map((item) => <button key={item}>{item}</button>)}
          </div>
          <div className="total-box">
            <span><em>Total</em><b>{panel.totalToken}</b></span>
            <strong>0.00</strong>
          </div>
        </div>
      </div>
      <button className={`submit-trade ${isBuy ? 'buy' : 'sell'}`}>{panel.buttonText}</button>
    </section>
  )
}

function MarketStats() {
  const stats = [
    ['24h High', '2,510.00'],
    ['24h Low', '2,320.50'],
    ['24h Vol(ETH)', '45,210'],
    ['24h Vol(USDC)', '110.5M'],
  ]
  return (
    <aside className="right-column">
      <section className="card market-card">
        <div className="pair-title">
          <span className="coin-icon">Ξ</span>
          <h2>ETH-USDC</h2>
        </div>
        <div className="market-price">2,455.50</div>
        <div className="market-change"><TrendingUp size={16} /> +5.24%</div>
        <div className="stats-grid">
          {stats.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="card chart-placeholder">
        <BarChart3 size={52} />
        <span>Chart view disabled</span>
      </section>
    </aside>
  )
}

function ActivityTable() {
  return (
    <section className="card activity-table">
      <div className="activity-tabs">
        <button className="active">Open Orders (2)</button>
        <button>Order History</button>
      </div>
      <div className="table-row table-head">
        <span>Date</span><span>Pair</span><span>Side</span><span>Price</span><span>Amount</span><span>Total</span><span>Filled</span><span>Action</span>
      </div>
      {orders.map((order) => (
        <div className="table-row" key={`${order[0]}-${order[1]}`}>
          <span>{order[0]}</span>
          <span>{order[1]}</span>
          <span className={order[2] === 'Buy' ? 'green' : 'red'}>{order[2]}</span>
          <span>{order[3]}</span>
          <span>{order[4]}</span>
          <span>{order[5]}</span>
          <span>{order[6]}</span>
          <button>Cancel</button>
        </div>
      ))}
      <button className="view-all">View All <ArrowRight size={16} /></button>
    </section>
  )
}

export default function App() {
  const dialogQueue = useRef([])
  const toastTimers = useRef(new Map())
  const calloutTimers = useRef([])
  const [activeDialog, setActiveDialog] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [callout, setCallout] = useState(null)

  function showDialog(dialog) {
    const nextDialog = {
      id: crypto.randomUUID(),
      title: 'Wallet Connection',
      ...dialog,
    }

    if (activeDialog) {
      dialogQueue.current.push(nextDialog)
      return
    }

    setActiveDialog(nextDialog)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
  }

  function showNextDialog() {
    const nextDialog = dialogQueue.current.shift()

    if (!nextDialog) {
      setActiveDialog(null)
      return
    }

    setActiveDialog(nextDialog)
    setIsDialogOpen(true)
  }

  function testConnectDialog() {
    showDialog({
      title: 'Connect Wallet',
      content: 'Wallet connection is not wired yet. This dialog is a queued UI test.',
      buttons: [{ text: 'OK' }],
    })
  }

  function testTokensConfirm() {
    showDialog({
      title: 'Open Tokens',
      content: 'Do you want to open the token list panel? This is a queued confirm dialog test.',
      buttons: [{ text: 'Confirm' }, { text: 'Cancel' }],
    })
  }

  function closeToast(id) {
    setToasts((current) => current.map((toast) => (
      toast.id === id ? { ...toast, closing: true } : toast
    )))

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      toastTimers.current.delete(id)
    }, 260)
  }

  function showToast(content) {
    const id = crypto.randomUUID()

    setToasts((current) => {
      const nextToasts = [{ id, content, closing: false }, ...current].slice(0, 3)
      const visibleIds = new Set(nextToasts.map((toast) => toast.id))

      for (const [toastId, timer] of toastTimers.current.entries()) {
        if (!visibleIds.has(toastId)) {
          window.clearTimeout(timer)
          toastTimers.current.delete(toastId)
        }
      }

      return nextToasts
    })

    const timer = window.setTimeout(() => {
      closeToast(id)
    }, 5000)

    toastTimers.current.set(id, timer)
  }

  function testPoolToast() {
    showToast(`Pool message ${new Date().toLocaleTimeString()}`)
  }

  function clearCalloutTimers() {
    calloutTimers.current.forEach((timer) => window.clearTimeout(timer))
    calloutTimers.current = []
  }

  function hideCallout() {
    setCallout((current) => current ? { ...current, closing: true, instant: false } : current)

    const removeTimer = window.setTimeout(() => {
      setCallout(null)
    }, 260)

    calloutTimers.current.push(removeTimer)
  }

  function showCallout({ content, autoClose = true }) {
    clearCalloutTimers()

    setCallout((current) => ({
      id: crypto.randomUUID(),
      content,
      autoClose,
      showHide: false,
      closing: false,
      instant: Boolean(current),
    }))

    const timer = window.setTimeout(() => {
      if (autoClose) {
        hideCallout()
      } else {
        setCallout((current) => current ? { ...current, showHide: true } : current)
      }
    }, 5000)

    calloutTimers.current.push(timer)
  }

  function testActivityCallout() {
    showCallout({
      content: `Activity callout ${new Date().toLocaleTimeString()}. Click again to replace instantly.`,
      autoClose: false,
    })
  }

  return (
    <div className="app-shell">
      <NavBar onConnect={testConnectDialog} onTokens={testTokensConfirm} onPool={testPoolToast} onActivity={testActivityCallout} />
      <main className="dashboard">
        <OrderBook />
        <TradePanel />
        <MarketStats />
        <ActivityTable />
      </main>
      <div className="ambient one" />
      <div className="ambient two" />
      <ToastStack toasts={toasts} />
      <CalloutNotice notice={callout} onHide={hideCallout} />
      <PromptDialog dialog={activeDialog} isOpen={isDialogOpen} onClose={closeDialog} onExited={showNextDialog} />
      <Activity className="sr-only" />
    </div>
  )
}
