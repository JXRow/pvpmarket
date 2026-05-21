import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

import NavBar from './components/NavBar'
import OrderBook from './components/OrderBook'
import TradePanel from './components/TradePanel'
import MarketStats from './components/MarketStats'
import ChartPanel from './components/ChartPanel'
import MyOrders from './components/MyOrders'
import ToastStack from './components/ToastStack'
import CalloutNotice from './components/CalloutNotice'
import PromptDialog from './components/PromptDialog'
import { getMarketInfo } from './model/api'
import {
  MODEL_EVENTS,
  asks,
  bids,
  loadMarketModel,
  modelEvents,
  orders,
  pairInfo,
  parseMarketRoute,
} from './model/model'

export default function App() {
  const dialogQueue = useRef([])
  const toastTimers = useRef(new Map())
  const calloutTimers = useRef([])
  const initialWalletPromptShown = useRef(false)
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [activeDialog, setActiveDialog] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [callout, setCallout] = useState(null)
  const [marketInfo, setMarketInfo] = useState(null)
  const [orderbook, setOrderbook] = useState({ asks, bids, pairInfo })
  const [userOrders, setUserOrders] = useState(orders)

  function showDialog(dialog) {
    const nextDialog = {
      id: crypto.randomUUID(),
      title: 'Wallet Connection',
      ...dialog,
    }

    if (activeDialog) {
      dialogQueue.current.push(nextDialog)
      return
    }

    setActiveDialog(nextDialog)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
  }

  function showNextDialog() {
    const nextDialog = dialogQueue.current.shift()

    if (!nextDialog) {
      setActiveDialog(null)
      return
    }

    setActiveDialog(nextDialog)
    setIsDialogOpen(true)
  }

  function connectWallet() {
    openConnectModal?.()
  }

  function showWalletRequiredDialog() {
    showDialog({
      title: 'Connect Wallet Required',
      content: 'PvP Market is a zero-backend application. Please connect your wallet first so the app can read the on-chain data.',
      buttons: [
        { text: 'Connect Wallet', onClick: connectWallet },
        { text: 'Cancel' },
      ],
    })
  }

  useEffect(() => {
    if (initialWalletPromptShown.current || isConnected) {
      return
    }

    initialWalletPromptShown.current = true
    showWalletRequiredDialog()
  }, [isConnected, openConnectModal])

  useEffect(() => {
    function updateOrderbook() {
      setOrderbook({ asks, bids, pairInfo })
    }

    function updateUserOrders() {
      setUserOrders([...orders])
    }

    modelEvents.addEventListener(MODEL_EVENTS.ORDERBOOK_UPDATED, updateOrderbook)
    modelEvents.addEventListener(MODEL_EVENTS.USER_ORDERS_UPDATED, updateUserOrders)

    return () => {
      modelEvents.removeEventListener(MODEL_EVENTS.ORDERBOOK_UPDATED, updateOrderbook)
      modelEvents.removeEventListener(MODEL_EVENTS.USER_ORDERS_UPDATED, updateUserOrders)
    }
  }, [])

  useEffect(() => {
    if (!isConnected) {
      setMarketInfo(null)
      return
    }

    const { network, token } = parseMarketRoute()
    loadMarketModel({ networkKey: network, tokenAddress: token, userAddress: address })
    getMarketInfo(network, token)
      .then(setMarketInfo)
      .catch(() => setMarketInfo({
        icon: '---',
        symbol: '---',
        priceUsd: '---',
        change24h: '--',
        volume24hUsd: '---',
        liquidity: '---',
        marketCap: '---',
        fdv: '---',
      }))
  }, [address, isConnected])

  function testTokensConfirm() {
    showDialog({
      title: 'Open Tokens',
      content: 'Do you want to open the token list panel? This is a queued confirm dialog test.',
      buttons: [{ text: 'Confirm' }, { text: 'Cancel' }],
    })
  }

  function closeToast(id) {
    setToasts((current) => current.map((toast) => (
      toast.id === id ? { ...toast, closing: true } : toast
    )))

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      toastTimers.current.delete(id)
    }, 260)
  }

  function showToast(content) {
    const id = crypto.randomUUID()

    setToasts((current) => {
      const nextToasts = [{ id, content, closing: false }, ...current].slice(0, 3)
      const visibleIds = new Set(nextToasts.map((toast) => toast.id))

      for (const [toastId, timer] of toastTimers.current.entries()) {
        if (!visibleIds.has(toastId)) {
          window.clearTimeout(timer)
          toastTimers.current.delete(toastId)
        }
      }

      return nextToasts
    })

    const timer = window.setTimeout(() => {
      closeToast(id)
    }, 5000)

    toastTimers.current.set(id, timer)
  }

  function testPoolToast() {
    showToast(`Pool message ${new Date().toLocaleTimeString()}`)
  }

  function clearCalloutTimers() {
    calloutTimers.current.forEach((timer) => window.clearTimeout(timer))
    calloutTimers.current = []
  }

  function hideCallout() {
    setCallout((current) => current ? { ...current, closing: true, instant: false } : current)

    const removeTimer = window.setTimeout(() => {
      setCallout(null)
    }, 260)

    calloutTimers.current.push(removeTimer)
  }

  function showCallout({ content, autoClose = true }) {
    clearCalloutTimers()

    setCallout((current) => ({
      id: crypto.randomUUID(),
      content,
      autoClose,
      showHide: false,
      closing: false,
      instant: Boolean(current),
    }))

    const timer = window.setTimeout(() => {
      if (autoClose) {
        hideCallout()
      } else {
        setCallout((current) => current ? { ...current, showHide: true } : current)
      }
    }, 5000)

    calloutTimers.current.push(timer)
  }

  function testActivityCallout() {
    showCallout({
      content: `Activity callout ${new Date().toLocaleTimeString()}. Click again to replace instantly.`,
      autoClose: false,
    })
  }

  return (
    <div className="app-shell">
      <NavBar
        onConnect={connectWallet}
        onTokens={testTokensConfirm}
        onPool={testPoolToast}
        onActivity={testActivityCallout}
      />
      <main className="dashboard">
        <OrderBook orderbook={orderbook} />
        <TradePanel tokenSymbol={orderbook.pairInfo.name.split('-')[0]?.trim() || '---'} />
        <aside className="right-column">
          <MarketStats marketInfo={marketInfo} />
          <ChartPanel />
        </aside>
        <MyOrders
          orders={userOrders}
          onShowToast={showToast}
          onShowCallout={showCallout}
          onHideCallout={hideCallout}
          onShowDialog={showDialog}
          userAddress={address}
          networkKey={parseMarketRoute().network}
        />
      </main>
      <div className="ambient one" />
      <div className="ambient two" />
      <ToastStack toasts={toasts} />
      <CalloutNotice notice={callout} onHide={hideCallout} />
      <PromptDialog dialog={activeDialog} isOpen={isDialogOpen} onClose={closeDialog} onExited={showNextDialog} />
      <Activity className="sr-only" />
    </div>
  )
}
