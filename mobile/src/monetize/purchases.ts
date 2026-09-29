import { Platform } from 'react-native'
import { androidPurchases } from './android/purchases'
import type { Product } from './config'
import { iosPurchases } from './ios/purchases'
import type { PurchasesModule } from './types'

export type { BuyResult } from './types'

/** The game imports purchases from here; each platform's logic lives in its own folder. */
const purchases: PurchasesModule = Platform.OS === 'ios' ? iosPurchases : androidPurchases

export const { useStore, initPurchases, buy, restore } = purchases

export const priceLabel = (product: Product, prices: Record<string, string>) => prices[product.id] ?? product.fallbackPrice
