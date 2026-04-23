import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nest - Sales Identity OS',
  description: 'Turn your daily sales into a brand identity operating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#050a1e]">
        {children}
      </body>
    </html>
  )
}
