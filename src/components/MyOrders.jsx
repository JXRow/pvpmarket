import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { useWriteContract } from 'wagmi'
import {
  orders as modelOrders,
  orderHistory as modelHistory,
  modelEvents,
  MODEL_EVENTS,
  createClient,
  readUserOrders,
  readOrderbook,
  readBalances,
  parseMarketRoute,
} from '../model/model'
import monoTradeArtifact from '../model/abi/MonoTrade.json'

export default function MyOrders({
  orders = modelOrders,
  history = modelHistory,
  onShowToast,
  onShowCallout,
  onHideCallout,
  onShowDialog,
  userAddress,
  networkKey,
  tokenSymbol = '---',
}) {
  const [activeTab, setActiveTab] = useState('open')
  const [openOrders, setOpenOrders] = useState(orders)
  const [orderHistory, setOrderHistory] = useState(history)
  const [cancellingId, setCancellingId] = useState(null)
  const { writeContractAsync } = useWriteContract()

  useEffect(() => {
    function onOrdersUpdated() {
      setOpenOrders(modelOrders)
    }
    function onHistoryUpdated() {
      setOrderHistory(modelHistory)
    }
    modelEvents.addEventListener(MODEL_EVENTS.USER_ORDERS_UPDATED, onOrdersUpdated)
    modelEvents.addEventListener(MODEL_EVENTS.ORDER_HISTORY_UPDATED, onHistoryUpdated)
    return () => {
      modelEvents.removeEventListener(MODEL_EVENTS.USER_ORDERS_UPDATED, onOrdersUpdated)
      modelEvents.removeEventListener(MODEL_EVENTS.ORDER_HISTORY_UPDATED, onHistoryUpdated)
    }
  }, [])

  const isOpen = activeTab === 'open'
  const displayOrders = isOpen ? openOrders : orderHistory

  async function handleCancel(order) {
    if (cancellingId) return
    const trade = order[8]
    const orderId = order[9]
    if (!trade || !orderId || orderId === 0n) return

    setCancellingId(order[7])
    try {
      onShowCallout({ content: 'Waiting wallet operate...', autoClose: false })
      
      const hash = await writeContractAsync({
        address: trade,
        abi: monoTradeArtifact.abi,
        functionName: 'cancelOrder',
        args: [orderId],
      })
      onShowCallout({ content: 'Submitting transaction...', autoClose: false })
      
      const client = createClient(networkKey)
      await client.waitForTransactionReceipt({ hash, confirmations: 1 })

      onShowCallout({ content: 'Transaction confirmed', autoClose: true })
      const { token: tokenAddress } = parseMarketRoute()
      await Promise.all([
        readUserOrders(networkKey, userAddress),
        readOrderbook(networkKey, tokenAddress),
        readBalances(networkKey, userAddress),
      ])
    } catch (err) {
      const isRejected =
        err.name === 'UserRejectedRequestError' ||
        err.cause?.name === 'UserRejectedRequestError' ||
        err.cause?.cause?.name === 'UserRejectedRequestError' ||
        err.code === 4001 ||
        err.message?.toLowerCase().includes('rejected') ||
        err.message?.toLowerCase().includes('user denied') ||
        err.message?.toLowerCase().includes('user rejected')

      onHideCallout()
      if (isRejected) {
        onShowToast('Operation cancelled')
      } else {
        onShowDialog({
          title: 'Cancel Order Failed',
          content: err.message || 'Unknown error',
          buttons: [{ text: 'OK' }],
        })
      }
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section className="card activity-table">
      <div className="activity-tabs">
        <button className={isOpen ? 'active' : ''} onClick={() => setActiveTab('open')}>
          Open Orders ({openOrders.length})
        </button>
        <button className={!isOpen ? 'active' : ''} onClick={() => setActiveTab('history')}>
          Order History ({orderHistory.length})
        </button>
      </div>
      <div className="table-row table-head">
        <span>Date</span><span>Pair</span><span>Side</span><span>Price</span><span>Amount ({tokenSymbol})</span><span>Total (USDC)</span><span>Filled</span><span>Action</span>
      </div>
      {displayOrders.map((order) => {
        const canCancel = isOpen && order[8] && order[8] !== '---' && order[9] && order[9] !== 0n
        const isCancelling = cancellingId === order[7]
        return (
          <div className="table-row" key={order[7]}>
            <span>{order[0]}</span>
            <span>{order[1]}</span>
            <span className={order[2] === 'Buy' ? 'green' : 'red'}>{order[2]}</span>
            <span>{order[3]}</span>
            <span>{order[4]}</span>
            <span>{order[5]}</span>
            <span>{order[6]}</span>
            {isOpen ? (
              <button
                className={canCancel ? '' : 'disabled-action'}
                onClick={() => canCancel && handleCancel(order)}
                disabled={!canCancel || isCancelling}
              >
                {isCancelling ? '...' : (canCancel ? 'Cancel' : '---')}
              </button>
            ) : (
              <span className="disabled-action">—</span>
            )}
          </div>
        )
      })}
      <button className="view-all">View All <ArrowRight size={16} /></button>
    </section>
  )
}
