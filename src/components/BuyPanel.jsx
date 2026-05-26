import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { balances, modelEvents, MODEL_EVENTS } from '../model/model'
import { formatNumber, cleanNumberInput, formatInputDisplay } from '../utils/util'

export default function BuyPanel({
  tokenSymbol = '---',
  price,
  amount,
  onPriceChange,
  onAmountChange,
}) {
  const [usdc, setUsdc] = useState('--')

  useEffect(() => {
    if (balances.usdc !== '---') {
      setUsdc(balances.usdc)
    }

    function updateBalances() {
      setUsdc(balances.usdc)
    }

    modelEvents.addEventListener(MODEL_EVENTS.BALANCES_UPDATED, updateBalances)
    return () => {
      modelEvents.removeEventListener(MODEL_EVENTS.BALANCES_UPDATED, updateBalances)
    }
  }, [])

  const total = useMemo(() => {
    const p = Number(price)
    const a = Number(amount)
    if (!p || !a || p <= 0) return ''
    return (a * p).toString()
  }, [price, amount])

  function handlePriceChange(e) {
    onPriceChange(cleanNumberInput(e.target.value))
  }

  function handleAmountChange(e) {
    const maxDecimals = balances.targetTokenDecimals ?? 18
    onAmountChange(cleanNumberInput(e.target.value, maxDecimals))
  }

  function setAmountPercent(percent) {
    const balance = Number(usdc)
    const p = Number(price)
    if (Number.isNaN(balance) || balance <= 0 || !p || p <= 0) return
    const maxDecimals = balances.targetTokenDecimals ?? 18
    const factor = 10 ** maxDecimals
    const totalUsdc = balance * percent
    const value = Math.floor((totalUsdc / p) * factor) / factor
    onAmountChange(value.toString())
  }

  return (
    <>
      <div className="balance-line">
        <span>Avail: {formatNumber(usdc)} USDC</span>
        <Wallet size={16} />
      </div>
      <div className="field-stack">
        <label className="trade-field">
          <span><em>Price</em><b>USDC per {tokenSymbol}</b></span>
          <input
            type="text"
            inputMode="decimal"
            value={formatInputDisplay(price)}
            onChange={handlePriceChange}
            placeholder="0.00"
          />
        </label>
        <label className="trade-field">
          <span><em>Amount</em><b>{tokenSymbol}</b></span>
          <input
            type="text"
            inputMode="decimal"
            value={formatInputDisplay(amount)}
            onChange={handleAmountChange}
            placeholder="0.00"
          />
        </label>
        <div className="chips">
          {[
            { label: '25%', value: 0.25 },
            { label: '50%', value: 0.5 },
            { label: '75%', value: 0.75 },
            { label: '100%', value: 1 },
          ].map((item) => (
            <button key={item.label} onClick={() => setAmountPercent(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="trade-field total-readonly">
          <span><em>Total</em><b>USDC</b></span>
          <span>{formatNumber(total)}</span>
        </div>
      </div>
    </>
  )
}
