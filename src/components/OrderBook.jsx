import { TrendingUp } from 'lucide-react'
import OrderRow from './OrderRow'
import { asks, bids, pairInfo } from '../model/model'

function parseDisplayNumber(value) {
  const number = Number(`${value}`.replaceAll(',', ''))

  return Number.isFinite(number) ? number : 0
}

function formatDisplayNumber(value) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 })
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

  const mergedRows = Array.from(rowMap.values()).slice(0, 5)
  const maxTotal = Math.max(...mergedRows.map((row) => row.total), 0)

  return mergedRows.map((row) => [
    formatDisplayNumber(row.price),
    formatDisplayNumber(row.size),
    formatDisplayNumber(row.total),
    maxTotal > 0 ? Math.max(8, Math.round((row.total / maxTotal) * 100)) : 0,
  ])
}

export default function OrderBook({ orderbook = { asks, bids, pairInfo } }) {
  const mergedAsks = mergeRowsByPrice(orderbook.asks)
  const mergedBids = mergeRowsByPrice(orderbook.bids)

  return (
    <section className="card order-book">
      <div className="section-heading">
        <h2>Order Book</h2>
        <span>{orderbook.pairInfo.name}</span>
      </div>
      <div className="book-header">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>
      <div className="book-side asks">
        {mergedAsks.map((row) => <OrderRow key={`${row[0]}-${row[1]}`} row={row} type="ask" />)}
      </div>
      <div className="spread-line">
        <strong>{orderbook.pairInfo.spread}</strong>
        <span><TrendingUp size={16} /> ${orderbook.pairInfo.spread}</span>
      </div>
      <div className="book-side bids">
        {mergedBids.map((row) => <OrderRow key={`${row[0]}-${row[1]}`} row={row} type="bid" />)}
      </div>
    </section>
  )
}
