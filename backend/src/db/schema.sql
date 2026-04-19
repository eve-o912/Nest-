-- Nest Financial OS Database Schema
-- Money is sacred. All amounts stored as bigint cents.
-- UUID v4 for all IDs. timestamptz everywhere.
-- Every financial record is hashed. Never delete, only void.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'cashier', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    preferred_language VARCHAR(2) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'sw')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    last_login_at timestamptz
);

-- Core Businesses Table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('retail', 'wholesale', 'service', 'food', 'other')),
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    auto_save_rate INTEGER NOT NULL DEFAULT 5 CHECK (auto_save_rate >= 0 AND auto_save_rate <= 50),
    savings_goal BIGINT NOT NULL DEFAULT 0,
    cash_variance_threshold BIGINT NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT true,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    onboarded_at timestamptz
);

-- Junction: Business Users (staff relationships)
CREATE TABLE business_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES users(id),
    invited_at timestamptz NOT NULL DEFAULT NOW(),
    accepted_at timestamptz,
    restricted_at timestamptz,
    restricted_reason TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Sessions (for refresh tokens and device tracking)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    last_used_at timestamptz NOT NULL DEFAULT NOW()
);

-- OTP Records
CREATE TABLE otp_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Products/Catalogue
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'piece',
    selling_price BIGINT NOT NULL,
    cost_price BIGINT NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    barcode VARCHAR(100),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Transactions (Sales)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    customer_phone VARCHAR(20),
    total_amount BIGINT NOT NULL,
    total_cogs BIGINT NOT NULL DEFAULT 0,
    gross_profit BIGINT NOT NULL GENERATED ALWAYS AS (total_amount - total_cogs) STORED,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card', 'bank')),
    mpesa_receipt_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'voided')),
    receipt_token VARCHAR(64) UNIQUE,
    receipt_url VARCHAR(500),
    hash VARCHAR(64),
    voided_at timestamptz,
    voided_by UUID REFERENCES users(id),
    void_reason TEXT,
    recorded_at timestamptz NOT NULL DEFAULT NOW(),
    locked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Transaction Items
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_selling_price BIGINT NOT NULL,
    unit_cost_price BIGINT NOT NULL,
    total_amount BIGINT NOT NULL GENERATED ALWAYS AS (quantity * unit_selling_price) STORED,
    total_cogs BIGINT NOT NULL GENERATED ALWAYS AS (quantity * unit_cost_price) STORED,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('sale', 'receipt', 'adjustment', 'damage', 'return')),
    quantity INTEGER NOT NULL,
    unit_cost BIGINT,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    recorded_by UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT,
    receipt_photo_url VARCHAR(500),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Daily P&L (immutable, hashed)
CREATE TABLE daily_pnl (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    date DATE NOT NULL,
    total_revenue BIGINT NOT NULL DEFAULT 0,
    total_cogs BIGINT NOT NULL DEFAULT 0,
    gross_profit BIGINT NOT NULL DEFAULT 0,
    total_expenses BIGINT NOT NULL DEFAULT 0,
    net_profit BIGINT NOT NULL DEFAULT 0,
    cash_expected BIGINT NOT NULL DEFAULT 0,
    cash_actual BIGINT,
    cash_variance BIGINT,
    mpesa_received BIGINT NOT NULL DEFAULT 0,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    itemised_sales INTEGER NOT NULL DEFAULT 0,
    auto_saved BIGINT NOT NULL DEFAULT 0,
    hash VARCHAR(64) NOT NULL,
    reconciled_at timestamptz,
    reconciled_by UUID REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, date)
);

-- Savings Wallet
CREATE TABLE savings_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(id),
    balance BIGINT NOT NULL DEFAULT 0,
    total_saved BIGINT NOT NULL DEFAULT 0,
    total_withdrawn BIGINT NOT NULL DEFAULT 0,
    goal_amount BIGINT NOT NULL DEFAULT 0,
    auto_save_rate INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_auto_save_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Savings Entries (ledger)
CREATE TABLE savings_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES savings_wallets(id),
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('auto_save', 'manual', 'withdrawal', 'reversal')),
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Shifts (for cashier reliability scoring)
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    started_at timestamptz NOT NULL DEFAULT NOW(),
    ended_at timestamptz,
    starting_cash BIGINT,
    ending_cash BIGINT,
    expected_cash BIGINT,
    cash_variance BIGINT,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Cashier Scores (90-day rolling)
CREATE TABLE cashier_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    reliability_score INTEGER NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 100),
    cash_score INTEGER NOT NULL DEFAULT 100,
    stock_score INTEGER NOT NULL DEFAULT 100,
    record_score INTEGER NOT NULL DEFAULT 100,
    void_score INTEGER NOT NULL DEFAULT 100,
    receipt_score INTEGER NOT NULL DEFAULT 100,
    calculated_at timestamptz NOT NULL DEFAULT NOW(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    UNIQUE(business_id, cashier_id, period_end)
);

-- Account Connections (M-Pesa, Bank)
CREATE TABLE account_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('mpesa_till', 'mpesa_paybill', 'bank')),
    provider VARCHAR(50) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(200),
    credentials_enc TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Account Transactions (from M-Pesa/Bank feeds)
CREATE TABLE account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES account_connections(id),
    external_id VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    sender_phone VARCHAR(20),
    sender_name VARCHAR(200),
    reference VARCHAR(255),
    transaction_time timestamptz NOT NULL,
    raw_data JSONB,
    matched_transaction_id UUID REFERENCES transactions(id),
    matched_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, external_id)
);

-- Receipts & Deliveries
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id),
    token VARCHAR(64) UNIQUE NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    total_amount BIGINT NOT NULL,
    item_count INTEGER NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    customer_phone VARCHAR(20),
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('whatsapp', 'sms', 'email')),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    scan_count INTEGER NOT NULL DEFAULT 0,
    first_scanned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Financial Passport (the moat)
CREATE TABLE financial_passports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES businesses(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    revenue_score INTEGER NOT NULL,
    margin_score INTEGER NOT NULL,
    savings_score INTEGER NOT NULL,
    integrity_score INTEGER NOT NULL,
    staff_score INTEGER NOT NULL,
    engagement_score INTEGER NOT NULL,
    avg_daily_revenue BIGINT,
    revenue_consistency DECIMAL(5,2),
    avg_net_margin DECIMAL(5,2),
    loan_limit BIGINT NOT NULL DEFAULT 0,
    data_hash VARCHAR(64) NOT NULL,
    chain_tx_id VARCHAR(66),
    calculated_at timestamptz NOT NULL DEFAULT NOW(),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Passport Shares (consent log)
CREATE TABLE passport_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passport_id UUID NOT NULL REFERENCES financial_passports(id),
    lender_name VARCHAR(200) NOT NULL,
    lender_code VARCHAR(50),
    shared_by UUID NOT NULL REFERENCES users(id),
    snapshot_data JSONB NOT NULL,
    consent_granted_at timestamptz NOT NULL DEFAULT NOW(),
    consent_expires_at timestamptz,
    revoked_at timestamptz,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at timestamptz
);

-- Notification Queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    user_id UUID REFERENCES users(id),
    recipient_phone VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'push')),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'retrying')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    external_id VARCHAR(100),
    delivered_at timestamptz,
    failed_at timestamptz,
    error_message TEXT,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    scheduled_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_business_users_business ON business_users(business_id);
CREATE INDEX idx_business_users_user ON business_users(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token_hash);
CREATE INDEX idx_otp_phone ON otp_records(phone, created_at DESC);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_transactions_business ON transactions(business_id);
CREATE INDEX idx_transactions_business_date ON transactions(business_id, recorded_at);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_token ON transactions(receipt_token);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_daily_pnl_business ON daily_pnl(business_id);
CREATE INDEX idx_daily_pnl_business_date ON daily_pnl(business_id, date);
CREATE INDEX idx_savings_wallet ON savings_entries(wallet_id);
CREATE INDEX idx_shifts_business ON shifts(business_id);
CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_account_transactions_connection ON account_transactions(connection_id);
CREATE INDEX idx_account_transactions_matched ON account_transactions(matched_transaction_id);
CREATE INDEX idx_receipts_token ON receipts(token);
CREATE INDEX idx_passport_business ON financial_passports(business_id);
CREATE INDEX idx_notifications_business ON notifications(business_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_users_updated_at BEFORE UPDATE ON business_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_savings_wallets_updated_at BEFORE UPDATE ON savings_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_passports_updated_at BEFORE UPDATE ON financial_passports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_connections_updated_at BEFORE UPDATE ON account_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
