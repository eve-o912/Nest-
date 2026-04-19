// API Response shapes from backend
// All API responses wrapped in { success, data, error?, meta }

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta: {
    request_id: string
  }
}

// Auth responses
export interface SendOtpResponse {
  message: string
}

export interface VerifyOtpResponse {
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
  user: {
    id: string
    phone: string
    name?: string
    role: 'owner' | 'cashier'
    businessId?: string
    preferredLanguage: 'en' | 'sw'
    isNewUser: boolean
  }
  isNewUser: boolean
}

export interface RefreshTokenResponse {
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

// Business responses
export interface CreateBusinessRequest {
  name: string
  businessType: string
  currency?: string
  autoSaveRate?: number
  savingsGoal?: number
  timezone?: string
}

export interface CreateBusinessResponse {
  business: {
    id: string
    name: string
    ownerId: string
    businessType: string
    currency: string
    autoSaveRate: number
    savingsGoal: number
    timezone: string
    createdAt: string
  }
}

export interface GetBusinessResponse {
  business: {
    id: string
    name: string
    type: string
    paymentMethods: string[]
    autoSaveRate: number
    savingsGoal: number
    tillNumber?: string
    cashVarianceThreshold: number
    savingsBalance?: number
    totalSaved?: number
  }
}

export interface GetTeamResponse {
  team: Array<{
    id: string
    name: string
    phone: string
    role: string
    isActive: boolean
    invitedAt: string
    acceptedAt?: string
    reliabilityScore?: number
    cashScore?: number
    stockScore?: number
    recordScore?: number
    scoreCalculatedAt?: string
  }>
}

// Transaction responses
export interface CreateTransactionRequest {
  items: Array<{
    productId: string
    quantity: number
    unitSellingPrice: number
    unitCostPrice: number
  }>
  paymentMethod: string
  customerPhone?: string
  mpesaReceiptNumber?: string
}

export interface CreateTransactionResponse {
  transaction: {
    id: string
    totalAmount: number
    paymentMethod: string
    receiptToken: string
    receiptUrl: string
    status: string
  }
}

export interface GetTransactionsResponse {
  transactions: Array<{
    id: string
    totalAmount: number
    paymentMethod: string
    status: string
    recordedAt: string
    cashierName?: string
    itemCount: number
  }>
}

// P&L responses
export interface GetDailyPnlResponse {
  pnl: {
    date: string
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
  }
}

export interface GetPnlSummaryResponse {
  summary: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    avgDailyRevenue: number
    bestDay: {
      date: string
      revenue: number
    }
  }
  dailyPnls: Array<{
    date: string
    totalRevenue: number
    netProfit: number
    isReconciled: boolean
  }>
}

// Savings responses
export interface GetSavingsResponse {
  wallet: {
    balance: number
    totalSaved: number
    totalWithdrawn: number
    goalAmount: number
    autoSaveRate: number
  }
  recentEntries: Array<{
    id: string
    entryType: string
    amount: number
    balanceAfter: number
    createdAt: string
  }>
}

export interface UpdateSavingsRateRequest {
  autoSaveRate: number
}

// Reconciliation
export interface ReconcileRequest {
  date: string
  cashActual: number
}

export interface ReconcileResponse {
  pnl: {
    date: string
    totalRevenue: number
    netProfit: number
    cashVariance: number
    isReconciled: boolean
  }
}

// Receipt
export interface SendReceiptRequest {
  phone: string
  method: 'whatsapp' | 'sms'
}

// WebSocket messages
export interface WebSocketMessage {
  type: 'new_sale' | 'mismatch_alert' | 'ping'
  data: any
  timestamp: string
}

export interface NewSaleMessage {
  type: 'new_sale'
  data: {
    id: string
    totalAmount: number
    paymentMethod: string
    cashierName: string
    recordedAt: string
  }
}

export interface MismatchAlertMessage {
  type: 'mismatch_alert'
  data: {
    shiftId: string
    variance: number
    cashierName: string
  }
}
