import { db } from '../db/connection';
import type { CreateBusinessInput, UpdateBusinessInput, InviteCashierInput } from '../utils/validation';

export class BusinessService {
    // Create new business (owner onboarding step 2)
    async createBusiness(ownerId: string, input: CreateBusinessInput): Promise<any> {
        return await db.transaction(async (client) => {
            // Create business
            const businessResult = await client.query(
                `INSERT INTO businesses (
                    owner_id, name, business_type, currency, 
                    auto_save_rate, savings_goal, timezone, onboarded_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING *`,
                [
                    ownerId,
                    input.name,
                    input.businessType,
                    input.currency,
                    input.autoSaveRate,
                    input.savingsGoal,
                    input.timezone
                ]
            );
            
            const business = businessResult.rows[0];
            
            // Create owner-business relationship
            await client.query(
                `INSERT INTO business_users (
                    business_id, user_id, role, invited_by, accepted_at
                ) VALUES ($1, $2, 'owner', $2, NOW())`,
                [business.id, ownerId]
            );
            
            // Create savings wallet
            await client.query(
                `INSERT INTO savings_wallets (
                    business_id, auto_save_rate, goal_amount
                ) VALUES ($1, $2, $3)`,
                [business.id, input.autoSaveRate, input.savingsGoal]
            );
            
            return business;
        });
    }
    
    // Get business by ID
    async getBusiness(businessId: string): Promise<any> {
        const result = await db.query(
            `SELECT b.*, 
                w.balance as savings_balance,
                w.goal_amount as savings_goal,
                w.total_saved
            FROM businesses b
            LEFT JOIN savings_wallets w ON w.business_id = b.id
            WHERE b.id = $1 AND b.is_active = true`,
            [businessId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Business not found');
        }
        
        return result.rows[0];
    }
    
    // Update business settings
    async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<any> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        if (input.name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(input.name);
        }
        if (input.autoSaveRate !== undefined) {
            updates.push(`auto_save_rate = $${paramCount++}`);
            values.push(input.autoSaveRate);
        }
        if (input.savingsGoal !== undefined) {
            updates.push(`savings_goal = $${paramCount++}`);
            values.push(input.savingsGoal);
        }
        if (input.cashVarianceThreshold !== undefined) {
            updates.push(`cash_variance_threshold = $${paramCount++}`);
            values.push(input.cashVarianceThreshold);
        }
        
        if (updates.length === 0) {
            throw new Error('No fields to update');
        }
        
        values.push(businessId);
        
        const result = await db.query(
            `UPDATE businesses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        
        // Update savings wallet if auto_save_rate changed
        if (input.autoSaveRate !== undefined) {
            await db.query(
                'UPDATE savings_wallets SET auto_save_rate = $1 WHERE business_id = $2',
                [input.autoSaveRate, businessId]
            );
        }
        
        return result.rows[0];
    }
    
    // Invite cashier by phone
    async inviteCashier(businessId: string, ownerId: string, input: InviteCashierInput): Promise<any> {
        const { phone, name } = input;
        
        return await db.transaction(async (client) => {
            // Check if user already exists
            let userResult = await client.query(
                'SELECT * FROM users WHERE phone = $1',
                [phone]
            );
            
            let userId: string;
            
            if (userResult.rows.length === 0) {
                // Create new user
                const newUser = await client.query(
                    `INSERT INTO users (phone, name, role, is_verified) 
                     VALUES ($1, $2, 'cashier', false) RETURNING id`,
                    [phone, name]
                );
                userId = newUser.rows[0].id;
            } else {
                userId = userResult.rows[0].id;
                
                // Check if already in this business
                const existing = await client.query(
                    'SELECT * FROM business_users WHERE business_id = $1 AND user_id = $2',
                    [businessId, userId]
                );
                
                if (existing.rows.length > 0) {
                    if (existing.rows[0].is_active) {
                        throw new Error('User is already a member of this business');
                    } else {
                        // Reactivate
                        await client.query(
                            `UPDATE business_users 
                             SET is_active = true, restricted_at = NULL, restricted_reason = NULL, updated_at = NOW()
                             WHERE id = $1`,
                            [existing.rows[0].id]
                        );
                        return existing.rows[0];
                    }
                }
            }
            
            // Create business_user relationship
            const result = await client.query(
                `INSERT INTO business_users (
                    business_id, user_id, role, invited_by, invited_at
                ) VALUES ($1, $2, 'cashier', $3, NOW()) RETURNING *`,
                [businessId, userId, ownerId]
            );
            
            // TODO: Send SMS invitation via notification service
            
            return result.rows[0];
        });
    }
    
    // Get team members (owner view)
    async getTeam(businessId: string): Promise<any[]> {
        const result = await db.query(
            `SELECT 
                u.id,
                u.name,
                u.phone,
                bu.role,
                bu.is_active,
                bu.invited_at,
                bu.accepted_at,
                bu.restricted_at,
                cs.reliability_score,
                cs.cash_score,
                cs.stock_score,
                cs.record_score,
                cs.calculated_at as score_calculated_at
            FROM business_users bu
            JOIN users u ON bu.user_id = u.id
            LEFT JOIN cashier_scores cs ON cs.cashier_id = u.id 
                AND cs.business_id = bu.business_id
                AND cs.period_end = (
                    SELECT MAX(period_end) FROM cashier_scores 
                    WHERE cashier_id = u.id AND business_id = bu.business_id
                )
            WHERE bu.business_id = $1
            ORDER BY bu.role = 'owner' DESC, bu.invited_at DESC`,
            [businessId]
        );
        
        return result.rows;
    }
    
    // Update team member role or status
    async updateTeamMember(
        businessId: string, 
        userId: string, 
        updates: { role?: 'owner' | 'cashier'; isActive?: boolean; restrictReason?: string }
    ): Promise<any> {
        const setClause: string[] = [];
        const values: any[] = [];
        let paramCount = 1;
        
        if (updates.role !== undefined) {
            setClause.push(`role = $${paramCount++}`);
            values.push(updates.role);
        }
        
        if (updates.isActive !== undefined) {
            setClause.push(`is_active = $${paramCount++}`);
            values.push(updates.isActive);
            
            if (!updates.isActive && updates.restrictReason) {
                setClause.push(`restricted_at = NOW()`);
                setClause.push(`restricted_reason = $${paramCount++}`);
                values.push(updates.restrictReason);
            }
        }
        
        if (setClause.length === 0) {
            throw new Error('No updates provided');
        }
        
        values.push(businessId, userId);
        
        const result = await db.query(
            `UPDATE business_users 
             SET ${setClause.join(', ')}, updated_at = NOW()
             WHERE business_id = $${paramCount} AND user_id = $${paramCount + 1}
             RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            throw new Error('Team member not found');
        }
        
        return result.rows[0];
    }
    
    // Get cashier shift history
    async getCashierHistory(businessId: string, cashierId: string): Promise<any> {
        const shifts = await db.query(
            `SELECT * FROM shifts 
             WHERE business_id = $1 AND cashier_id = $2
             ORDER BY started_at DESC`,
            [businessId, cashierId]
        );
        
        const transactions = await db.query(
            `SELECT t.*, 
                COUNT(ti.id) as item_count
            FROM transactions t
            LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
            WHERE t.business_id = $1 AND t.cashier_id = $2
            GROUP BY t.id
            ORDER BY t.recorded_at DESC
            LIMIT 100`,
            [businessId, cashierId]
        );
        
        return {
            shifts: shifts.rows,
            recentTransactions: transactions.rows
        };
    }
}

export const businessService = new BusinessService();
