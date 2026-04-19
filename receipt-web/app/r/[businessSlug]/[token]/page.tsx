import { notFound } from 'next/navigation'
import { formatDate, formatMoney } from '@/lib/utils'
import { ReceiptDisplay } from '@/components/ReceiptDisplay'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nest.app/api/v1'

async function getReceipt(token: string) {
  try {
    const res = await fetch(`${API_URL}/receipts/${token}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    
    if (!res.ok) {
      return null
    }
    
    return res.json()
  } catch (error) {
    console.error('Failed to fetch receipt:', error)
    return null
  }
}

async function logScan(token: string) {
  try {
    await fetch(`${API_URL}/receipts/${token}/scan`, {
      method: 'POST',
    })
  } catch (error) {
    // Silent fail - scan logging is not critical
    console.error('Failed to log scan:', error)
  }
}

interface ReceiptPageProps {
  params: {
    businessSlug: string
    token: string
  }
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { token } = params
  
  // Fetch receipt data
  const response = await getReceipt(token)
  
  if (!response || !response.success) {
    notFound()
  }
  
  const receipt = response.data.receipt
  
  // Log scan event (fire and forget)
  logScan(token)
  
  return (
    <main className="max-w-md mx-auto min-h-screen bg-bg">
      <ReceiptDisplay receipt={receipt} />
    </main>
  )
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: ReceiptPageProps) {
  const { token } = params
  const response = await getReceipt(token)
  
  if (!response || !response.success) {
    return {
      title: 'Receipt Not Found',
    }
  }
  
  const receipt = response.data.receipt
  
  return {
    title: `Receipt from ${receipt.businessName} - KES ${(receipt.totalAmount / 100).toFixed(2)}`,
    description: `Digital receipt for purchase on ${formatDate(receipt.recordedAt)}`,
    openGraph: {
      title: `Receipt from ${receipt.businessName}`,
      description: `KES ${(receipt.totalAmount / 100).toFixed(2)} - ${formatDate(receipt.recordedAt)}`,
      type: 'website',
    },
  }
}
