'use client'

import { useState } from 'react'
import { formatMoney, formatDate, formatTime, generateWhatsAppLink } from '@/lib/utils'

interface ReceiptItem {
  productName: string
  quantity: number
  unitSellingPrice: number
  lineTotal: number
}

interface Receipt {
  token: string
  businessName: string
  businessPhone?: string
  totalAmount: number
  itemCount: number
  paymentMethod: string
  items: ReceiptItem[]
  cashierName?: string
  recordedAt: string
  customerPhone?: string
}

interface ReceiptDisplayProps {
  receipt: Receipt
}

export function ReceiptDisplay({ receipt }: ReceiptDisplayProps) {
  const [showItems, setShowItems] = useState(false)
  
  const receiptUrl = typeof window !== 'undefined' ? window.location.href : ''
  const whatsappLink = generateWhatsAppLink(
    receiptUrl,
    formatMoney(receipt.totalAmount),
    receipt.businessName
  )

  return (
    <div className="p-6">
      {/* Business Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-accent/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">🧾</span>
        </div>
        <h1 className="text-xl font-bold text-text mb-1">{receipt.businessName}</h1>
        <p className="text-sub text-sm">Official Receipt</p>
      </div>

      {/* Receipt Meta */}
      <div className="bg-bg-2 rounded-xl p-4 mb-6 border border-line">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted mb-1">Receipt #</p>
            <p className="text-text font-mono">{receipt.token.slice(0, 8)}...</p>
          </div>
          <div>
            <p className="text-muted mb-1">Date</p>
            <p className="text-text">{formatDate(receipt.recordedAt)}</p>
          </div>
          <div>
            <p className="text-muted mb-1">Time</p>
            <p className="text-text">{formatTime(receipt.recordedAt)}</p>
          </div>
          <div>
            <p className="text-muted mb-1">Payment</p>
            <p className="text-text capitalize">{receipt.paymentMethod}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      {receipt.items && receipt.items.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowItems(!showItems)}
            className="w-full flex items-center justify-between text-text mb-3"
          >
            <span className="font-medium">{receipt.itemCount} item(s)</span>
            <span className="text-accent">{showItems ? '▲' : '▼'}</span>
          </button>
          
          {showItems && (
            <div className="bg-bg-2 rounded-xl border border-line overflow-hidden">
              {receipt.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 border-b border-line last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-text">{item.productName}</p>
                    <p className="text-muted text-sm">
                      {item.quantity} × {formatMoney(item.unitSellingPrice)}
                    </p>
                  </div>
                  <p className="text-text font-mono font-medium">
                    {formatMoney(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Total */}
      <div className="bg-accent/10 rounded-xl p-6 mb-6 border border-accent/20">
        <div className="flex justify-between items-center">
          <span className="text-sub">Total Amount</span>
          <span className="text-2xl font-bold text-accent font-mono">
            {formatMoney(receipt.totalAmount)}
          </span>
        </div>
      </div>

      {/* Share Actions */}
      <div className="space-y-3">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-medium py-3 rounded-xl transition-colors"
        >
          <span>💬</span>
          Share on WhatsApp
        </a>
        
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Receipt from ${receipt.businessName}`,
                text: `Receipt for ${formatMoney(receipt.totalAmount)}`,
                url: receiptUrl,
              })
            } else {
              navigator.clipboard.writeText(receiptUrl)
              alert('Receipt link copied to clipboard!')
            }
          }}
          className="flex items-center justify-center gap-2 w-full bg-bg-2 hover:bg-bg-3 text-text font-medium py-3 rounded-xl border border-line transition-colors"
        >
          <span>🔗</span>
          Share Link
        </button>
        
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 w-full bg-bg-2 hover:bg-bg-3 text-text font-medium py-3 rounded-xl border border-line transition-colors"
        >
          <span>🖨️</span>
          Print / Save PDF
        </button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-muted text-sm mb-2">Thank you for your business!</p>
        <div className="flex items-center justify-center gap-2 text-muted text-xs">
          <span className="font-bold text-accent">N</span>
          <span>Powered by Nest — Financial OS for businesses</span>
        </div>
      </div>
    </div>
  )
}
