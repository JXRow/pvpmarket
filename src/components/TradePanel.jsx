import { useState } from 'react'
import BuyPanel from './BuyPanel'
import SellPanel from './SellPanel'

export default function TradePanel({ tokenSymbol = '---' }) {
  const [side, setSide] = useState('buy')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const isBuy = side === 'buy'

  return (
    <section className="card trade-panel">
      <div className="trade-tabs">
        <button className={isBuy ? 'selected buy' : ''} onClick={() => setSide('buy')}>Buy</button>
        <button className={!isBuy ? 'selected sell' : ''} onClick={() => setSide('sell')}>Sell</button>
      </div>
      <div className={`trade-panel-body ${side}`}>
        {isBuy ? (
          <BuyPanel
            tokenSymbol={tokenSymbol}
            price={buyPrice}
            amount={buyAmount}
            onPriceChange={setBuyPrice}
            onAmountChange={setBuyAmount}
          />
        ) : (
          <SellPanel
            tokenSymbol={tokenSymbol}
            price={sellPrice}
            amount={sellAmount}
            onPriceChange={setSellPrice}
            onAmountChange={setSellAmount}
          />
        )}
      </div>
      <button className={`submit-trade ${isBuy ? 'buy' : 'sell'}`}>
        {isBuy ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`}
      </button>
    </section>
  )
}
