import { Wallet } from 'lucide-react'

export default function SellPanel() {
  return (
    <>
      <div className="balance-line">
        <span>Avail: 8.240 ETH</span>
        <Wallet size={16} />
      </div>
      <div className="field-stack">
        <label className="trade-field">
          <span><em>Price</em><b>USDC per ETH</b></span>
          <input value="2,455.50" readOnly />
        </label>
        <label className="trade-field">
          <span><em>Amount</em><b>ETH</b></span>
          <input placeholder="0.00" readOnly />
        </label>
        <div className="chips">
          {['25%', '50%', '75%', '100%'].map((item) => <button key={item}>{item}</button>)}
        </div>
        <div className="total-box">
          <span><em>Total</em><b>USDC</b></span>
          <strong>0.00</strong>
        </div>
      </div>
    </>
  )
}
