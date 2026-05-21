import { useState, useEffect } from 'react'
import { useSendCalls, useWriteContract } from 'wagmi'
import { encodeFunctionData, parseUnits, maxUint256 } from 'viem'
import BuyPanel from './BuyPanel'
import SellPanel from './SellPanel'
import {
  pairInfo,
  createClient,
  readOrderbook,
  readUserOrders,
  readBalances,
  parseMarketRoute,
  modelEvents,
  MODEL_EVENTS,
  ZERO_ADDRESS,
} from '../model/model'
import tradeServiceArtifact from '../model/abi/TradeService.json'
import erc20Artifact from '../model/abi/MockERC20.json'

export default function TradePanel({
  tokenSymbol = '---',
  onShowToast,
  onShowCallout,
  onHideCallout,
  onShowDialog,
  userAddress,
  networkKey,
}) {
  const [side, setSide] = useState('buy')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPairInfo, setCurrentPairInfo] = useState(pairInfo)
  const isBuy = side === 'buy'
  const { sendCallsAsync } = useSendCalls()
  const { writeContractAsync } = useWriteContract()

  useEffect(() => {
    function onOrderbookUpdated() {
      setCurrentPairInfo({ ...pairInfo })
    }
    modelEvents.addEventListener(MODEL_EVENTS.ORDERBOOK_UPDATED, onOrderbookUpdated)
    return () => {
      modelEvents.removeEventListener(MODEL_EVENTS.ORDERBOOK_UPDATED, onOrderbookUpdated)
    }
  }, [])

  return (
    <section className="card trade-panel">
      <div className="trade-tabs">
        <button className={isBuy ? 'selected buy' : ''} onClick={() => setSide('buy')}>Buy</button>
        <button className={!isBuy ? 'selected sell' : ''} onClick={() => setSide('sell')}>Sell</button>
      </div>
      <div className={`trade-panel-body ${side}`}>
        {isBuy ? (
          <BuyPanel
            tokenSymbol={tokenSymbol}
            price={buyPrice}
            amount={buyAmount}
            onPriceChange={setBuyPrice}
            onAmountChange={setBuyAmount}
          />
        ) : (
          <SellPanel
            tokenSymbol={tokenSymbol}
            price={sellPrice}
            amount={sellAmount}
            onPriceChange={setSellPrice}
            onAmountChange={setSellAmount}
          />
        )}
      </div>
      <button
        className={`submit-trade ${isBuy ? 'buy' : 'sell'}`}
        onClick={handleSubmit}
        disabled={submitting || !currentPairInfo.usdcAddress || !currentPairInfo.tokenAddress || !currentPairInfo.tradeServiceAddress}
      >
        {submitting ? '...' : (isBuy ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`)}
      </button>
    </section>
  )

  async function handleSubmit() {
    if (isBuy) {
      await handleBuy()
    } else {
      await handleSell()
    }
  }

  async function handleBuy() {
    const price = buyPrice.trim()
    const amount = buyAmount.trim()
    if (!price || !amount || Number(price) <= 0 || Number(amount) <= 0) {
      onShowToast('Please enter valid price and amount')
      return
    }

    const {
      usdcAddress,
      tokenAddress,
      usdcDecimals,
      tokenDecimals,
      tradeServiceAddress,
    } = currentPairInfo

    if (!usdcAddress || !tokenAddress || !tradeServiceAddress) {
      onShowToast('Market not loaded')
      return
    }

    const amountInRaw = parseUnits(amount, usdcDecimals)
    const priceRaw = parseUnits(price, usdcDecimals)
    const amountOutRaw = (amountInRaw * 10n**BigInt(tokenDecimals)) / priceRaw

    const approveData = encodeFunctionData({
      abi: erc20Artifact.abi,
      functionName: 'approve',
      args: [tradeServiceAddress, maxUint256],
    })

    const placeOrderData = encodeFunctionData({
      abi: tradeServiceArtifact.abi,
      functionName: 'placeOrder',
      args: [usdcAddress, tokenAddress, amountInRaw, amountOutRaw],
    })

    setSubmitting(true)
    onShowCallout({ content: 'Waiting wallet operate...', autoClose: false })

    try {
      await sendCallsAsync({
        calls: [
          { to: usdcAddress, data: approveData },
          { to: tradeServiceAddress, data: placeOrderData },
        ],
      })
      onShowCallout({ content: 'Transaction confirmed', autoClose: true })
      const { token } = parseMarketRoute()
      await Promise.all([
        readUserOrders(networkKey, userAddress),
        readOrderbook(networkKey, token),
        readBalances(networkKey, userAddress),
      ])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendCallsAsync error:', err)
      const msg = err?.message?.toLowerCase() || ''
      const isUnsupported =
        msg.includes('unsupported') ||
        msg.includes('not supported') ||
        msg.includes('wallet_sendcalls') ||
        msg.includes('does not support') ||
        msg.includes('not available') ||
        msg.includes('method not found')
      if (isUnsupported) {
        await fallbackBuy(usdcAddress, tradeServiceAddress, amountInRaw, amountOutRaw)
      } else {
        const isRejected =
          err?.name === 'UserRejectedRequestError' ||
          err?.cause?.name === 'UserRejectedRequestError' ||
          err?.code === 4001 ||
          msg.includes('rejected') ||
          msg.includes('user denied')
        onHideCallout()
        if (isRejected) {
          onShowToast('Operation cancelled')
        } else {
          onShowDialog({ title: 'Buy Order Failed', content: err?.message || 'Unknown error', buttons: [{ text: 'OK' }] })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSell() {
    const price = sellPrice.trim()
    const amount = sellAmount.trim()
    if (!price || !amount || Number(price) <= 0 || Number(amount) <= 0) {
      onShowToast('Please enter valid price and amount')
      return
    }

    const {
      usdcAddress,
      tokenAddress,
      tokenDecimals,
      usdcDecimals,
      tradeServiceAddress,
    } = currentPairInfo

    if (!usdcAddress || !tokenAddress || !tradeServiceAddress) {
      onShowToast('Market not loaded')
      return
    }

    const amountInRaw = parseUnits(amount, tokenDecimals)
    const priceRaw = parseUnits(price, usdcDecimals)
    const amountOutRaw = (amountInRaw * priceRaw) / (10n ** BigInt(tokenDecimals))

    const isNative = tokenAddress === ZERO_ADDRESS

    const placeOrderData = encodeFunctionData({
      abi: tradeServiceArtifact.abi,
      functionName: 'placeOrder',
      args: [tokenAddress, usdcAddress, amountInRaw, amountOutRaw],
    })

    setSubmitting(true)
    onShowCallout({ content: 'Waiting wallet operate...', autoClose: false })

    try {
      if (isNative) {
        const hash = await writeContractAsync({
          address: tradeServiceAddress,
          abi: tradeServiceArtifact.abi,
          functionName: 'placeOrder',
          args: [tokenAddress, usdcAddress, amountInRaw, amountOutRaw],
          value: amountInRaw,
        })
        const client = createClient(networkKey)
        await client.waitForTransactionReceipt({ hash, confirmations: 1 })
      } else {
        const approveData = encodeFunctionData({
          abi: erc20Artifact.abi,
          functionName: 'approve',
          args: [tradeServiceAddress, maxUint256],
        })
        await sendCallsAsync({
          calls: [
            { to: tokenAddress, data: approveData },
            { to: tradeServiceAddress, data: placeOrderData },
          ],
        })
      }

      onShowCallout({ content: 'Transaction confirmed', autoClose: true })
      const { token } = parseMarketRoute()
      await Promise.all([
        readUserOrders(networkKey, userAddress),
        readOrderbook(networkKey, token),
        readBalances(networkKey, userAddress),
      ])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sell error:', err)
      const msg = err?.message?.toLowerCase() || ''
      const isUnsupported =
        msg.includes('unsupported') ||
        msg.includes('not supported') ||
        msg.includes('wallet_sendcalls') ||
        msg.includes('does not support') ||
        msg.includes('not available') ||
        msg.includes('method not found')
      if (!isNative && isUnsupported) {
        await fallbackSell(tokenAddress, tradeServiceAddress, amountInRaw, amountOutRaw)
      } else {
        const isRejected =
          err?.name === 'UserRejectedRequestError' ||
          err?.cause?.name === 'UserRejectedRequestError' ||
          err?.code === 4001 ||
          msg.includes('rejected') ||
          msg.includes('user denied')
        onHideCallout()
        if (isRejected) {
          onShowToast('Operation cancelled')
        } else {
          onShowDialog({ title: 'Sell Order Failed', content: err?.message || 'Unknown error', buttons: [{ text: 'OK' }] })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function fallbackBuy(usdcAddress, tradeServiceAddress, amountInRaw, amountOutRaw) {
    try {
      onShowCallout({ content: 'Approving USDC...', autoClose: false })
      await writeContractAsync({
        address: usdcAddress,
        abi: erc20Artifact.abi,
        functionName: 'approve',
        args: [tradeServiceAddress, maxUint256],
      })
      onShowCallout({ content: 'Submitting order...', autoClose: false })
      const hash = await writeContractAsync({
        address: tradeServiceAddress,
        abi: tradeServiceArtifact.abi,
        functionName: 'placeOrder',
        args: [usdcAddress, currentPairInfo.tokenAddress, amountInRaw, amountOutRaw],
      })
      const client = createClient(networkKey)
      await client.waitForTransactionReceipt({ hash, confirmations: 1 })
      onShowCallout({ content: 'Transaction confirmed', autoClose: true })
      const { token } = parseMarketRoute()
      await Promise.all([
        readUserOrders(networkKey, userAddress),
        readOrderbook(networkKey, token),
        readBalances(networkKey, userAddress),
      ])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fallbackBuy error:', err)
      const isRejected =
        err?.name === 'UserRejectedRequestError' ||
        err?.cause?.name === 'UserRejectedRequestError' ||
        err?.code === 4001 ||
        (err?.message?.toLowerCase().includes('rejected')) ||
        (err?.message?.toLowerCase().includes('user denied'))
      onHideCallout()
      if (isRejected) {
        onShowToast('Operation cancelled')
      } else {
        onShowDialog({ title: 'Buy Order Failed', content: err?.message || 'Unknown error', buttons: [{ text: 'OK' }] })
      }
    }
  }

  async function fallbackSell(tokenAddress, tradeServiceAddress, amountInRaw, amountOutRaw) {
    try {
      onShowCallout({ content: `Approving ${tokenSymbol}...`, autoClose: false })
      await writeContractAsync({
        address: tokenAddress,
        abi: erc20Artifact.abi,
        functionName: 'approve',
        args: [tradeServiceAddress, maxUint256],
      })
      onShowCallout({ content: 'Submitting order...', autoClose: false })
      const hash = await writeContractAsync({
        address: tradeServiceAddress,
        abi: tradeServiceArtifact.abi,
        functionName: 'placeOrder',
        args: [tokenAddress, currentPairInfo.usdcAddress, amountInRaw, amountOutRaw],
      })
      const client = createClient(networkKey)
      await client.waitForTransactionReceipt({ hash, confirmations: 1 })
      onShowCallout({ content: 'Transaction confirmed', autoClose: true })
      const { token } = parseMarketRoute()
      await Promise.all([
        readUserOrders(networkKey, userAddress),
        readOrderbook(networkKey, token),
        readBalances(networkKey, userAddress),
      ])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fallbackSell error:', err)
      const isRejected =
        err?.name === 'UserRejectedRequestError' ||
        err?.cause?.name === 'UserRejectedRequestError' ||
        err?.code === 4001 ||
        (err?.message?.toLowerCase().includes('rejected')) ||
        (err?.message?.toLowerCase().includes('user denied'))
      onHideCallout()
      if (isRejected) {
        onShowToast('Operation cancelled')
      } else {
        onShowDialog({ title: 'Sell Order Failed', content: err?.message || 'Unknown error', buttons: [{ text: 'OK' }] })
      }
    }
  }
}
