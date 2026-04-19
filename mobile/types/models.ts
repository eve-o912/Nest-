// Core TypeScript types for Nest
// Define these once and import everywhere. Never use any.

export type PaymentMethod = 'cash' | 'mpesa' | 'bank' | 'card'
export type UserRole = 'owner' | 'cashier' | 'admin'
export type BusinessType = 'retail' | 'wholesale' | 'service' | 'food' | 'other'
export type ScoreBand = 'excellent' | 'reliable' | 'watch' | 'urgent' | 'critical' | null

export interface User {
  id: string
  phone: string
  name?: string
  email?: string
  role: UserRole
  isActive: boolean
  preferredLanguage: 'en' | 'sw'
  createdAt: string
}

export interface Business {
  id: string
  ownerId: string
  name: string
  slug: string
  type: BusinessType
  currency: string
  paymentMethods: PaymentMethod[]
  autoSaveRate: number          // 1–20 integer
  savingsGoal: number            // cents
  tillNumber?: string
  cashVarianceThreshold: number // cents
  timezone: string
  isActive: boolean
  onboardedAt?: string
}

export interface TeamMember {
  userId: string
  name: string
  phone: string
  role: 'owner' | 'cashier'
  isActive: boolean
  joinedAt: string
  totalShifts: number
  score: {
    overall: number | null    // null until 30 shifts
    cash: number
    stock: number
    recording: number
    void: number
    receipt: number
    band: ScoreBand
    patternNote: string | null  // AI-detected pattern text
  } | null
  recentShifts: Array<{
    date: string
    status: 'clean' | 'mismatch' | 'stock_gap'
  }>
}

export interface Product {
  id: string
  businessId: string
  name: string
  category: string
  description?: string
  unit: string
  sellingPrice: number          // cents
  costPrice?: number            // cents — optional
  stockQty: number
  reorderLevel: number
  marginPct?: number            // computed: (sell-cost)/sell×100
  isActive: boolean
  barcode?: string
}

export interface TransactionItem {
  productId?: string
  productName: string
  quantity: number
  unitSellingPrice: number      // cents — snapshot
  unitCostPrice?: number        // cents — snapshot
  lineTotal: number
  lineProfit?: number
}

export interface Transaction {
  id: string
  businessId: string
  cashierId: string
  cashierName?: string
  totalAmount: number           // cents
  cogsAmount: number | null    // cents — null if not itemised
  grossProfit: number | null
  paymentMethod: PaymentMethod
  status: 'draft' | 'locked' | 'voided'
  isItemised: boolean
  items: TransactionItem[]
  receiptToken?: string
  customerPhone?: string
  mpesaReceiptNumber?: string
  recordedAt: string
  lockedAt?: string
}

export interface DailyPnl {
  date: string
  businessId: string
  totalRevenue: number
  totalCogs: number
  grossProfit: number
  grossMarginPct: number
  totalExpenses: number
  netProfit: number
  netMarginPct: number
  cashExpected: number
  cashActual?: number
  cashVariance: number
  mpesaReceived: number
  transactionCount: number
  itemisedSales: number
  autoSaved: number
  isReconciled: boolean
  reconciledAt?: string
}

export interface SavingsWallet {
  businessId: string
  balance: number               // cents
  totalSaved: number
  totalWithdrawn: number
  goalAmount: number
  autoSaveRate: number
  lastAutoSaveAt?: string
}

export interface SavingsEntry {
  id: string
  entryType: 'auto_save' | 'manual' | 'withdrawal' | 'reversal'
  amount: number
  balanceAfter: number
  referenceId?: string
  notes?: string
  createdAt: string
}

export interface Expense {
  id: string
  businessId: string
  category: string
  amount: number                // cents
  description?: string
  expenseDate: string
  isRecurring: boolean
  recurringFrequency?: 'daily' | 'weekly' | 'monthly'
  receiptPhotoUrl?: string
  recordedBy: string
  createdAt: string
}

export interface Shift {
  id: string
  businessId: string
  cashierId: string
  cashierName?: string
  startedAt: string
  endedAt?: string
  startingCash?: number
  endingCash?: number
  expectedCash?: number
  cashVariance?: number
  transactionCount: number
  isReconciled: boolean
}

export interface CashierScore {
  businessId: string
  cashierId: string
  reliabilityScore: number
  cashScore: number
  stockScore: number
  recordScore: number
  voidScore: number
  receiptScore: number
  calculatedAt: string
  periodStart: string
  periodEnd: string
}

export interface FinancialPassport {
  businessId: string
  ownerId: string
  overallScore: number
  revenueScore: number
  marginScore: number
  savingsScore: number
  integrityScore: number
  staffScore: number
  engagementScore: number
  avgDailyRevenue?: number
  revenueConsistency: number
  avgNetMargin: number
  loanLimit: number             // cents
  avgMonthlyRevenue?: number
  revenueConsistencyScore?: number
  savingsConsistencyScore?: number
  staffReliabilityScore?: number
  dataHash: string
  calculatedAt: string
  expiresAt: string
}

export interface PassportShare {
  id: string
  lenderName: string
  lenderCode?: string
  sharedAt: string
  expiresAt?: string
  revokedAt?: string
  accessCount: number
}

export interface Alert {
  id: string
  businessId: string
  type: 'mismatch' | 'low_stock' | 'close_reminder' | 'insight' | 'loan_milestone'
  severity: 'info' | 'warning' | 'urgent'
  title: string
  body: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

export interface Receipt {
  token: string
  businessName: string
  totalAmount: number
  itemCount: number
  paymentMethod: PaymentMethod
  items: TransactionItem[]
  cashierName?: string
  recordedAt: string
  customerPhone?: string
}

// Cart types for POS
export interface CartItem {
  product: Product
  quantity: number
  lineTotal: number
}

export interface CartStore {
  items: CartItem[]
  manualAmount: number | null
  method: PaymentMethod
  customerPhone: string
}
