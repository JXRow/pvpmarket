import { ArrowRight } from 'lucide-react'
import { orders as modelOrders } from '../model/model'

export default function MyOrders({ orders = modelOrders }) {
  return (
    <section className="card activity-table">
      <div className="activity-tabs">
        <button className="active">Open Orders ({orders.length})</button>
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
