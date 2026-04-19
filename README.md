# Nest — Financial Operating System for Informal Businesses

> Built for Kenya. Designed to scale to 2 billion businesses globally.

## System Architecture

Nest is structured in 6 layers, following strict separation of concerns:

```
Client Layer (React Native + Web)
    ↓
API Gateway (Node.js + Express)
    ↓
Core Services (8 service modules)
    ↓
Data Layer (PostgreSQL on Railway)
    ↓
AI Agents Layer (6 agents, cron-driven)
    ↓
Financial Identity Layer (Blockchain-ready)
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile App | React Native + Expo | Single codebase for iOS/Android |
| Backend API | Node.js + Express | API Gateway and services |
| Database | PostgreSQL | ACID transactions, financial data integrity |
| Hosting | Railway | Deploy on git push, auto-scaling |
| SMS/OTP | Africa's Talking | Kenya-optimized messaging |
| M-Pesa | Safaricom Daraja | Real-time payment verification |
| Bank Feeds | Stitch/Mono | African open banking aggregation |
| AI | Claude API | Plain-language insights (EN/SW) |
| Validation | Zod | Schema validation on all inputs |

## Project Structure

```
New folder (2)/
├── backend/                  # Node.js API Gateway & Services
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql    # 22-table PostgreSQL schema
│   │   │   ├── connection.ts # Database connection pool
│   │   │   └── migrate.ts    # Migration runner
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts      # JWT validation
│   │   │   └── validation.middleware.ts # Zod request validation
│   │   ├── routes/
│   │   │   ├── auth.routes.ts          # OTP, JWT endpoints
│   │   │   └── business.routes.ts      # Business CRUD
│   │   ├── services/
│   │   │   ├── auth.service.ts         # Africa's Talking OTP
│   │   │   └── business.service.ts     # Business logic
│   │   ├── utils/
│   │   │   ├── validation.ts           # Zod schemas
│   │   │   ├── jwt.ts                  # Token generation
│   │   │   └── crypto.ts               # Hashing & encryption
│   │   └── index.ts                    # API entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── mobile/                   # React Native + Expo
│   ├── app/
│   │   ├── (auth)/           # Auth flow screens
│   │   │   ├── splash.tsx
│   │   │   ├── phone.tsx
│   │   │   ├── otp.tsx
│   │   │   └── setup.tsx
│   │   ├── (owner)/          # Owner experience
│   │   │   ├── _layout.tsx   # Tab navigation
│   │   │   └── dashboard.tsx # Home screen
│   │   ├── (cashier)/        # Cashier experience
│   │   │   └── pos.tsx       # Minimal POS screen
│   │   └── index.tsx         # Root navigator
│   ├── store/
│   │   └── auth.store.ts     # Zustand auth state
│   ├── services/
│   │   └── api.service.ts    # Axios API client
│   ├── styles/
│   │   └── theme.ts          # Colors, typography
│   ├── package.json
│   └── app.json
│
└── package.json              # Workspace root
```

## Design Principles

### Money is Sacred
- All amounts as **bigint cents** — KES 450 = 45000
- **Atomic DB operations** for balance mutations
- **Double-entry accounting** for savings ledger
- **No floats** anywhere in financial calculations

### Every Record is Immutable
- Transactions lock on QR generation (status: `draft` → `locked`)
- Savings entries never deleted — only counter-entries
- Stock movements never edited — void = reversal

### Hash Everything Financial
- **SHA-256** on every transaction, daily_pnl, and financial_passport row
- Tamper-evident without blockchain
- Blockchain-upgradeable when ready (chain_tx_id column exists)

### Owner Controls Their Data
- Financial passport belongs to the business owner
- Explicit, logged, revocable sharing with lenders
- Never raw transactions shared — only aggregated scores

### SMS-First Resilience
- Every alert, receipt, and insight can deliver by SMS
- App notifications preferred but system degrades gracefully
- Africa's Talking handles all Kenyan networks

## Database Schema (22 Tables)

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Phone-based identity, no passwords |
| `businesses` | Business profile, auto-save settings |
| `business_users` | Staff relationships (owner/cashier) |
| `sessions` | Refresh token storage |
| `otp_records` | OTP attempt tracking |

### Transaction Tables
| Table | Purpose |
|-------|---------|
| `transactions` | Sales with immutable status |
| `transaction_items` | Line items with snapshot prices |
| `products` | Catalogue with stock tracking |
| `stock_movements` | Immutable inventory ledger |

### Financial Tables
| Table | Purpose |
|-------|---------|
| `expenses` | One-off and recurring expenses |
| `daily_pnl` | Immutable daily P&L with hash |
| `savings_wallets` | Per-business savings balance |
| `savings_entries` | Double-entry savings ledger |

### Intelligence Tables
| Table | Purpose |
|-------|---------|
| `shifts` | Cashier shift tracking |
| `cashier_scores` | 90-day rolling reliability scores |
| `financial_passports` | Business credit identity |
| `passport_shares` | Consent log for lender sharing |

### Integration Tables
| Table | Purpose |
|-------|---------|
| `account_connections` | M-Pesa Till/Bank connections |
| `account_transactions` | External feed transactions |
| `receipts` | Receipt metadata & delivery status |
| `notifications` | SMS/WhatsApp queue |

## API Endpoints

### Authentication (Public)
```
POST /api/v1/auth/otp/send    → Send OTP via Africa's Talking
POST /api/v1/auth/otp/verify  → Verify OTP, return JWT tokens
POST /api/v1/auth/refresh     → Exchange refresh token
POST /api/v1/auth/logout      → Revoke session
```

### Business (Owner only)
```
POST   /api/v1/businesses              → Create business
GET    /api/v1/businesses/:id          → Get profile
PUT    /api/v1/businesses/:id          → Update settings
POST   /api/v1/businesses/:id/invite    → Invite cashier
GET    /api/v1/businesses/:id/team     → List staff
PUT    /api/v1/businesses/:id/users/:uid → Update member
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Africa's Talking account
- (Optional) Safaricom Daraja credentials for M-Pesa

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Mobile
cd ../mobile
npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

Key variables:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_64_char_secret
AT_API_KEY=your_africas_talking_key
AT_USERNAME=sandbox_or_live
```

### 3. Initialize Database

```bash
cd backend
npm run migrate
```

### 4. Start Development Servers

```bash
# Backend API
cd backend
npm run dev
# → API running on http://localhost:3000

# Mobile (new terminal)
cd mobile
npx expo start
# → Scan QR with Expo Go app
```

## Week 1-2: Foundation (Complete ✓)

- [x] PostgreSQL migrations (core 4 tables)
- [x] Auth service with OTP via Africa's Talking
- [x] JWT access + refresh tokens
- [x] API gateway with rate limiting
- [x] Business setup endpoints
- [x] React Native + Expo project structure
- [x] Auth screens (Splash → Phone → OTP → Setup)
- [x] Role-based routing (Owner vs Cashier)

## Next: Week 3-4 Core Transaction Engine

- [ ] Transactions + transaction_items tables
- [ ] Products catalogue API
- [ ] Cashier POS screen with QR generation
- [ ] Receipt service + Next.js receipt page
- [ ] WebSocket real-time updates

## Security Features

- **Phone + OTP only** — no passwords to leak
- **JWT access tokens** — 15 minute expiry
- **Refresh tokens** — 30 days, hashed in DB
- **Rate limiting** — Redis-backed, per IP and user
- **AES-256 encryption** — for account credentials
- **SHA-256 hashing** — all financial records
- **CORS restricted** — only app.nest.app origins
- **HMAC verification** — on all webhooks

## Infrastructure Cost (MVP)

| Service | Cost |
|---------|------|
| Railway API + DB | ~$15/month |
| Vercel (receipts) | Free tier |
| Cloudflare R2 | ~$0.015/GB |
| Upstash Redis | Free tier |
| Africa's Talking | ~KES 0.80/SMS |
| Safaricom Daraja | Free |

**Total MVP: Under $20/month until 500+ active businesses**

## Contributing

This is a financial system. Every PR must:
1. Include tests for money-touching code
2. Maintain immutable ledger principles
3. Use bigint cents, never floats
4. Hash financial records
5. Respect the 6-layer architecture

## License

Proprietary - All rights reserved.

---

Built with 💙 for Kenya's 7.5 million informal businesses.
