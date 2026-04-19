export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="w-20 h-20 bg-accent/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <span className="text-4xl">🧾</span>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">Nest Receipts</h1>
        <p className="text-sub mb-6">Digital receipts for modern businesses</p>
        <p className="text-muted text-sm">
          Scan a receipt QR code or click a link to view your receipt
        </p>
      </div>
    </main>
  )
}
