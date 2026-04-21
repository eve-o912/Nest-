'use client'

import Link from 'next/link'

interface FeatureCardProps {
  href: string
  icon: string
  title: string
  description: string
  color: string
}

function FeatureCard({ href, icon, title, description, color }: FeatureCardProps) {
  return (
    <Link 
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        background: color + '20',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#f0f0e8',
          marginBottom: '4px'
        }}>
          {title}
        </h3>
        <p style={{ 
          fontSize: '13px', 
          color: '#999992',
          lineHeight: '1.4'
        }}>
          {description}
        </p>
      </div>
      <span style={{ fontSize: '20px', color: '#666660' }}>›</span>
    </Link>
  )
}

export default function Home() {
  const features: FeatureCardProps[] = [
    { 
      href: '/dashboard', 
      icon: '📊', 
      title: 'Dashboard', 
      description: 'Live sales, savings, and daily insights',
      color: '#e8c547'
    },
    { 
      href: '/pnl', 
      icon: '💰', 
      title: 'P&L Report', 
      description: 'Profit & loss with date range analysis',
      color: '#22c55e'
    },
    { 
      href: '/stock', 
      icon: '📦', 
      title: 'Stock Management', 
      description: 'Inventory, counts, and shrinkage tracking',
      color: '#3b82f6'
    },
    { 
      href: '/expenses', 
      icon: '📝', 
      title: 'Expenses', 
      description: 'Track costs with AI anomaly detection',
      color: '#f97316'
    },
    { 
      href: '/team', 
      icon: '👥', 
      title: 'Team', 
      description: 'Cashier reliability scoring & shifts',
      color: '#8b5cf6'
    },
    { 
      href: '/passport', 
      icon: '🛂', 
      title: 'Financial Passport', 
      description: 'Credit score, loan limit, blockchain',
      color: '#14b8a6'
    },
    { 
      href: '/settings', 
      icon: '⚙️', 
      title: 'Settings', 
      description: 'Business, notifications, security',
      color: '#64748b'
    },
    { 
      href: '/r/lookup', 
      icon: '🧾', 
      title: 'Receipt Lookup', 
      description: 'Find and verify customer receipts',
      color: '#e11d48'
    },
  ]

  return (
    <main 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0e0e0c 0%, #141412 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px'
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto 32px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #e8c547 0%, #d4a73a 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🏪
          </div>
          <div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#f0f0e8'
            }}>
              Nest POS
            </h1>
            <p style={{ fontSize: '14px', color: '#666660' }}>
              Business Management Portal
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {[
            { icon: '➕', label: 'New Sale', href: '/sale' },
            { icon: '📥', label: 'Receive Stock', href: '/stock/receive' },
            { icon: '💵', label: 'Add Expense', href: '/expenses/add' },
            { icon: '🌙', label: 'Close Day', href: '/close' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'rgba(232, 197, 71, 0.1)',
                borderRadius: '100px',
                border: '1px solid rgba(232, 197, 71, 0.2)',
                color: '#e8c547',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#666660',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px'
        }}>
          All Features
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '12px'
        }}>
          {features.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '48px auto 0',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <p style={{ fontSize: '13px', color: '#666660' }}>
            © 2026 Nest POS. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/help" style={{ fontSize: '13px', color: '#999992', textDecoration: 'none' }}>
              Help Center
            </Link>
            <Link href="/support" style={{ fontSize: '13px', color: '#999992', textDecoration: 'none' }}>
              Support
            </Link>
            <Link href="/privacy" style={{ fontSize: '13px', color: '#999992', textDecoration: 'none' }}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
