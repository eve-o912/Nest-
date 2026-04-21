import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export interface SavingsWallet {
    id: string;
    business_id: string;
    balance: number;
    total_saved: number;
    total_withdrawn: number;
    goal_amount: number;
    auto_save_rate: number;
    is_active: boolean;
    last_auto_save_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface SavingsEntry {
    id: string;
    wallet_id: string;
    entry_type: 'auto_save' | 'manual' | 'withdrawal' | 'reversal';
    amount: number;
    balance_after: number;
    reference_id: string | null;
    reference_type: string | null;
    notes: string | null;
    created_at: Date;
}

export interface WithdrawalRequest {
    amount: number;
    reason?: string;
}

class SavingsService {
    // Get or create wallet for business
    async getOrCreateWallet(businessId: string): Promise<SavingsWallet> {
        const existing = await db.query<SavingsWallet>(
            'SELECT * FROM savings_wallets WHERE business_id = $1',
            [businessId]
        );
        
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        
        // Get business auto-save rate
        const businessResult = await db.query(
            'SELECT auto_save_rate FROM businesses WHERE id = $1',
            [businessId]
        );
        
        const autoSaveRate = businessResult.rows[0]?.auto_save_rate || 5;
        
        const id = uuidv4();
        const result = await db.query<SavingsWallet>(
            `INSERT INTO savings_wallets (
                id, business_id, balance, total_saved, total_withdrawn,
                goal_amount, auto_save_rate, is_active, created_at, updated_at
            ) VALUES ($1, $2, 0, 0, 0, 0, $3, true, NOW(), NOW())
            RETURNING *`,
            [id, businessId, autoSaveRate]
        );
        
        return result.rows[0];
    }

    // Get wallet with entries
    async getWalletWithHistory(businessId: string, limit: number = 50): Promise<{
        wallet: SavingsWallet;
        entries: SavingsEntry[];
    }> {
        const wallet = await this.getOrCreateWallet(businessId);
        
        const entriesResult = await db.query<SavingsEntry>(
            `SELECT se.*, t.recorded_at as transaction_date
             FROM savings_entries se
             LEFT JOIN transactions t ON se.reference_id = t.id
             WHERE se.wallet_id = $1
             ORDER BY se.created_at DESC
             LIMIT $2`,
            [wallet.id, limit]
        );
        
        return { wallet, entries: entriesResult.rows };
    }

    // Manual deposit
    async manualDeposit(
        businessId: string,
        amount: number,
        notes?: string
    ): Promise<{ wallet: SavingsWallet; entry: SavingsEntry }> {
        return await db.transaction(async (client) => {
            const wallet = await this.getOrCreateWallet(businessId);
            
            const newBalance = wallet.balance + amount;
            
            // Update wallet
            await client.query(
                `UPDATE savings_wallets 
                 SET balance = $1, total_saved = total_saved + $2, updated_at = NOW()
                 WHERE id = $3`,
                [newBalance, amount, wallet.id]
            );
            
            // Create entry
            const entryResult = await client.query<SavingsEntry>(
                `INSERT INTO savings_entries (
                    id, wallet_id, entry_type, amount, balance_after,
                    reference_type, notes, created_at
                ) VALUES ($1, $2, 'manual', $3, $4, 'manual_deposit', $5, NOW())
                RETURNING *`,
                [uuidv4(), wallet.id, amount, newBalance, notes || null]
            );
            
            const updatedWallet = await client.query<SavingsWallet>(
                'SELECT * FROM savings_wallets WHERE id = $1',
                [wallet.id]
            );
            
            return { wallet: updatedWallet.rows[0], entry: entryResult.rows[0] };
        });
    }

    // Withdraw
    async withdraw(
        businessId: string,
        request: WithdrawalRequest
    ): Promise<{ wallet: SavingsWallet; entry: SavingsEntry }> {
        return await db.transaction(async (client) => {
            const wallet = await this.getOrCreateWallet(businessId);
            
            if (wallet.balance < request.amount) {
                throw new Error(`Insufficient funds. Available: ${wallet.balance}, Requested: ${request.amount}`);
            }
            
            const newBalance = wallet.balance - request.amount;
            
            // Update wallet
            await client.query(
                `UPDATE savings_wallets 
                 SET balance = $1, total_withdrawn = total_withdrawn + $2, updated_at = NOW()
                 WHERE id = $3`,
                [newBalance, request.amount, wallet.id]
            );
            
            // Create entry
            const entryResult = await client.query<SavingsEntry>(
                `INSERT INTO savings_entries (
                    id, wallet_id, entry_type, amount, balance_after,
                    reference_type, notes, created_at
                ) VALUES ($1, $2, 'withdrawal', $3, $4, 'withdrawal_request', $5, NOW())
                RETURNING *`,
                [uuidv4(), wallet.id, -request.amount, newBalance, request.reason || null]
            );
            
            const updatedWallet = await client.query<SavingsWallet>(
                'SELECT * FROM savings_wallets WHERE id = $1',
                [wallet.id]
            );
            
            return { wallet: updatedWallet.rows[0], entry: entryResult.rows[0] };
        });
    }

    // Update auto-save rate
    async updateAutoSaveRate(businessId: string, rate: number): Promise<SavingsWallet> {
        if (rate < 0 || rate > 50) {
            throw new Error('Auto-save rate must be between 0 and 50');
        }
        
        const result = await db.query<SavingsWallet>(
            `UPDATE savings_wallets 
             SET auto_save_rate = $1, updated_at = NOW()
             WHERE business_id = $2
             RETURNING *`,
            [rate, businessId]
        );
        
        if (result.rows.length === 0) {
            // Create wallet with new rate
            return await this.getOrCreateWallet(businessId);
        }
        
        return result.rows[0];
    }

    // Update savings goal
    async updateGoal(businessId: string, goalAmount: number): Promise<SavingsWallet> {
        const wallet = await this.getOrCreateWallet(businessId);
        
        const result = await db.query<SavingsWallet>(
            `UPDATE savings_wallets 
             SET goal_amount = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [goalAmount, wallet.id]
        );
        
        return result.rows[0];
    }
}

export const savingsService = new SavingsService();
