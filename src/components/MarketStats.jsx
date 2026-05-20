import { TrendingDown, TrendingUp } from 'lucide-react'
import { marketStats, pairInfo } from '../model/model'

export default function MarketStats({ marketInfo }) {
  const displaySymbol = marketInfo?.symbol
    ? `${marketInfo.symbol.split('-')[0]}-USDC`
    : pairInfo.name
  const change24h = marketInfo?.change24h || pairInfo.change
  const isEmptyChange = !change24h || change24h === '---' || change24h === '--'
  const isDown = !isEmptyChange && `${change24h}`.trim().startsWith('-')
  const ChangeIcon = isDown ? TrendingDown : TrendingUp

  const stats = marketInfo
    ? [
        ['24h Vol(USD)', marketInfo.volume24hUsd],
        ['Liquidity', marketInfo.liquidity],
        ['Market Cap', marketInfo.marketCap],
        ['FDV', marketInfo.fdv],
      ]
    : marketStats

  return (
    <section className="card market-card">
      <div className="pair-title">
        {marketInfo?.icon?.startsWith?.('http') ? (
          <img className="coin-icon" src={marketInfo.icon} alt={displaySymbol} />
        ) : (
          <span className="coin-icon">{marketInfo?.icon || pairInfo.icon}</span>
        )}
        <h2>{displaySymbol}</h2>
      </div>
      <div className="market-price">{marketInfo?.priceUsd || pairInfo.price}</div>
      <div className={`market-change ${isEmptyChange ? '' : isDown ? 'down' : 'up'}`}>
        {isEmptyChange ? '--' : <><ChangeIcon size={16} /> {change24h}</>}
      </div>
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
