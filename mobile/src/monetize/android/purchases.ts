import Purchases, {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  type CustomerInfo,
  type PurchasesStoreProduct,
} from 'react-native-purchases'
import { applyOwnership, grantPurchase } from '../../game/wallet'
import { ALL_PRODUCTS, grantFor, productById, type Product } from '../config'
import { observable } from '../observable'
import type { BuyResult, PurchasesModule, StoreState } from '../types'
import { REVENUECAT_KEY } from './keys'

/**
 * Google Play Billing on Android, through RevenueCat.
 * In RevenueCat, mark `remove_ads`, `hero_squad` and `hero_*` as non-consumable so Play keeps them
 * owned (restorable); `coins_*` stay consumable so they can be bought again.
 */

const store = observable<StoreState>({ status: 'loading', prices: {} })
const storeProducts = new Map<string, PurchasesStoreProduct>()

let lastInfo: CustomerInfo | null = null
/** Coin packs paid with a slow method: product id → how many transactions it had when the payment went pending. */
const pendingCoins = new Map<string, number>()

const txsFor = (info: CustomerInfo | null, productId: string) =>
  info?.nonSubscriptionTransactions.filter((t) => t.productIdentifier === productId) ?? []

function onCustomerInfo(info: CustomerInfo) {
  lastInfo = info
  const skins: string[] = []
  let noAds = false
  for (const tx of info.nonSubscriptionTransactions) {
    const product = productById(tx.productIdentifier)
    if (product?.kind === 'skins') skins.push(...product.skins)
    if (product?.kind === 'noAds') noAds = true
  }
  applyOwnership({ skins, noAds })

  for (const [productId, before] of pendingCoins) {
    const txs = txsFor(info, productId)
    const product = productById(productId)
    if (txs.length <= before || !product) continue
    for (const tx of txs.slice(before)) grantPurchase(tx.transactionIdentifier, grantFor(product))
    pendingCoins.delete(productId)
  }
}

let started = false

async function initPurchases() {
  if (started) return
  started = true
  if (!REVENUECAT_KEY) {
    store.set({ status: __DEV__ ? 'test' : 'off' })
    return
  }
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
    Purchases.configure({ apiKey: REVENUECAT_KEY })
    Purchases.addCustomerInfoUpdateListener(onCustomerInfo)
    const products = await Purchases.getProducts(
      ALL_PRODUCTS.map((p) => p.id),
      PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    )
    const prices: Record<string, string> = {}
    for (const p of products) {
      storeProducts.set(p.identifier, p)
      prices[p.identifier] = p.priceString
    }
    store.set({ status: 'ready', prices })
    onCustomerInfo(await Purchases.getCustomerInfo())
  } catch {
    store.set({ status: 'off' })
  }
}

async function buy(product: Product): Promise<BuyResult> {
  const { status } = store.get()
  if (status === 'test') {
    grantPurchase(`test-${product.id}-${Date.now()}`, grantFor(product))
    return 'ok'
  }
  const storeProduct = storeProducts.get(product.id)
  if (status !== 'ready' || !storeProduct) return 'unavailable'
  try {
    const { transaction } = await Purchases.purchaseStoreProduct(storeProduct)
    grantPurchase(transaction.transactionIdentifier, grantFor(product))
    return 'ok'
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string }
    if (err.userCancelled) return 'cancelled'
    if (err.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      // Non-consumables arrive through onCustomerInfo on their own; coin packs need tracking.
      if (product.kind === 'coins') pendingCoins.set(product.id, txsFor(lastInfo, product.id).length)
      return 'pending'
    }
    return 'error'
  }
}

async function restore(): Promise<BuyResult> {
  const { status } = store.get()
  if (status === 'test') return 'ok'
  if (status !== 'ready') return 'unavailable'
  try {
    onCustomerInfo(await Purchases.restorePurchases())
    return 'ok'
  } catch {
    return 'error'
  }
}

export const androidPurchases: PurchasesModule = {
  useStore: store.use,
  initPurchases,
  buy,
  restore,
}
