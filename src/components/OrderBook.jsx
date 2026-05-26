import { TrendingUp } from 'lucide-react'
import OrderRow from './OrderRow'
import { asks, bids, pairInfo } from '../model/model'
import { formatNumber } from '../utils/util'

function parseDisplayNumber(value) {
  const number = Number(`${value}`.replaceAll(',', ''))

  return Number.isFinite(number) ? number : 0
}

function mergeRowsByPrice(rows) {
  const rowMap = new Map()

  rows.forEach((row) => {
    const price = parseDisplayNumber(row[0])
    const size = parseDisplayNumber(row[1])
    const total = parseDisplayNumber(row[2])

    if (price <= 0 || size <= 0 || total <= 0) {
      return
    }

    const current = rowMap.get(row[0]) ?? { price, size: 0, total: 0 }
    current.size += size
    current.total += total
    rowMap.set(row[0], current)
  })

  const mergedRows = Array.from(rowMap.values())
  const maxTotal = Math.max(...mergedRows.map((r) => r.total), 0)

  return { rows: mergedRows, maxTotal }
}

function applyDepth(rows, globalMaxTotal) {
  return rows.map((row) => [
    formatNumber(row.price),
    formatNumber(row.size),
    formatNumber(row.total),
    globalMaxTotal > 0 ? Math.max(8, Math.round((row.total / globalMaxTotal) * 100)) : 0,
  ])
}

export default function OrderBook({ orderbook = { asks, bids, pairInfo }, marketSymbol }) {
  const mergedAsks = mergeRowsByPrice(orderbook.asks)
  const mergedBids = mergeRowsByPrice(orderbook.bids)
  const globalMaxTotal = Math.max(mergedAsks.maxTotal, mergedBids.maxTotal, 0)
  const asksWithDepth = applyDepth(mergedAsks.rows.slice(0, 6), globalMaxTotal)
  const bidsWithDepth = applyDepth(mergedBids.rows.slice(0, 6), globalMaxTotal)
  const isEmpty = asksWithDepth.length === 0 && bidsWithDepth.length === 0
  const pairName = orderbook.pairInfo.name === '--- -USDC' ? marketSymbol : orderbook.pairInfo.name

  return (
    <section className="card order-book">
      <div className="section-heading">
        <h2>Order Book</h2>
        <span>{pairName || '--- -USDC'}</span>
      </div>
      {isEmpty ? (
        <div className="orderbook-empty">Orderbook is empty</div>
      ) : (
        <>
          <div className="book-header">
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>
          <div className="book-side asks">
            {asksWithDepth.map((row) => <OrderRow key={`${row[0]}-${row[1]}`} row={row} type="ask" />)}
          </div>
          <div className="spread-line">
            <strong>{orderbook.pairInfo.spread}</strong>
            <span><TrendingUp size={16} /> ${orderbook.pairInfo.spread}</span>
          </div>
          <div className="book-side bids">
            {bidsWithDepth.map((row) => <OrderRow key={`${row[0]}-${row[1]}`} row={row} type="bid" />)}
          </div>
        </>
      )}
    </section>
  )
}
