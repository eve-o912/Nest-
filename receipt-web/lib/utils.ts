export function formatMoney(cents: number): string {
  return `KES ${(cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateWhatsAppLink(receiptUrl: string, amount: string, businessName: string): string {
  const text = encodeURIComponent(
    `I received a receipt from ${businessName} for ${amount}\n\n${receiptUrl}`
  )
  return `https://wa.me/?text=${text}`
}
