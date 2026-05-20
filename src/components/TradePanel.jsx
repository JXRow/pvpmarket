import { useState } from 'react'
import BuyPanel from './BuyPanel'
import SellPanel from './SellPanel'

export default function TradePanel() {
  const [side, setSide] = useState('buy')
  const isBuy = side === 'buy'

  return (
    <section className="card trade-panel">
      <div className="trade-tabs">
        <button className={isBuy ? 'selected buy' : ''} onClick={() => setSide('buy')}>Buy</button>
        <button className={!isBuy ? 'selected sell' : ''} onClick={() => setSide('sell')}>Sell</button>
      </div>
      <div className={`trade-panel-body ${side}`} key={side}>
        {isBuy ? <BuyPanel /> : <SellPanel />}
      </div>
      <button className={`submit-trade ${isBuy ? 'buy' : 'sell'}`}>
        {isBuy ? 'Buy ETH' : 'Sell ETH'}
      </button>
    </section>
  )
}
