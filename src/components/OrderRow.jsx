export default function OrderRow({ row, type }) {
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
