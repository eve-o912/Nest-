export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-text mb-2">Receipt Not Found</h1>
        <p className="text-sub mb-6">
          This receipt link may have expired or the receipt was removed.
        </p>
        <p className="text-muted text-sm">
          Please contact the business if you need a copy of your receipt.
        </p>
      </div>
    </main>
  )
}
