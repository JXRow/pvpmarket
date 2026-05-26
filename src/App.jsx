import { useCallback, useEffect, useRef, useState } from 'react'
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
import { getChartData, getMarketInfo } from './model/api'
import {
  MODEL_EVENTS,
  asks,
  bids,
  clearUserData,
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
  const refreshTimer = useRef(null)
  const chartRangeRef = useRef('24H')
  const initialWalletPromptShown = useRef(false)
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [activeDialog, setActiveDialog] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [callout, setCallout] = useState(null)
  const [marketInfo, setMarketInfo] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [chartRange, setChartRange] = useState('24H')
  const [orderbook, setOrderbook] = useState({ asks, bids, pairInfo })
  const [userOrders, setUserOrders] = useState(orders)

  const refreshMarketData = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    const { network, token } = parseMarketRoute()
    const currentChartRange = chartRangeRef.current

    await Promise.all([
      loadMarketModel({ networkKey: network, tokenAddress: token, userAddress: address }),
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
        })),
      getChartData(network, token, currentChartRange)
        .then((data) => {
          if (data?.range === chartRangeRef.current) {
            setChartData(data)
          }
        })
        .catch(() => {
          if (currentChartRange === chartRangeRef.current) {
            setChartData(null)
          }
        }),
    ])
  }, [address, isConnected])

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(async () => {
      await refreshMarketData()
      scheduleRefresh()
    }, 3000)
  }, [refreshMarketData])

  const refreshNow = useCallback(async () => {
    window.clearTimeout(refreshTimer.current)
    await refreshMarketData()
    scheduleRefresh()
  }, [refreshMarketData, scheduleRefresh])

  const changeChartRange = useCallback((range) => {
    chartRangeRef.current = range
    setChartRange(range)
    refreshNow()
  }, [refreshNow])

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
    if (!isConnected || !address) {
      clearUserData()
      setMarketInfo(null)
      setChartData(null)
      return
    }

    refreshNow()

    return () => {
      window.clearTimeout(refreshTimer.current)
    }
  }, [address, isConnected, refreshNow])

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

  return (
    <div className="app-shell">
      <NavBar
        onConnect={connectWallet}
        onShowDialog={showDialog}
      />
      <main className="dashboard">
        <OrderBook orderbook={orderbook} />
        <TradePanel
          tokenSymbol={orderbook.pairInfo.name.split('-')[0]?.trim() || '---'}
          onShowToast={showToast}
          onShowCallout={showCallout}
          onHideCallout={hideCallout}
          onShowDialog={showDialog}
          onRefreshNow={refreshNow}
          userAddress={address}
          networkKey={parseMarketRoute().network}
        />
        <aside className="right-column">
          <MarketStats marketInfo={marketInfo} />
          <ChartPanel chartData={chartData} chartRange={chartRange} onRangeChange={changeChartRange} />
        </aside>
        <MyOrders
          orders={userOrders}
          onShowToast={showToast}
          onShowCallout={showCallout}
          onHideCallout={hideCallout}
          onShowDialog={showDialog}
          onRefreshNow={refreshNow}
          userAddress={address}
          networkKey={parseMarketRoute().network}
          tokenSymbol={orderbook.pairInfo.name.split('-')[0]?.trim() || '---'}
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
