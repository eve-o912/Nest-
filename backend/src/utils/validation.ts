import { z } from 'zod';

// Phone number validation (Kenya format)
export const phoneSchema = z.string()
    .regex(/^\+254[0-9]{9}$/, 'Phone must be in format +254XXXXXXXXX');

// Money amounts (bigint cents validation)
export const moneySchema = z.number()
    .int()
    .min(0, 'Amount cannot be negative')
    .max(999999999999, 'Amount exceeds maximum allowed');

// UUID validation
export const uuidSchema = z.string().uuid();

// Auth schemas
export const sendOtpSchema = z.object({
    phone: phoneSchema
});

export const verifyOtpSchema = z.object({
    phone: phoneSchema,
    code: z.string().length(6, 'OTP must be 6 digits')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(10)
});

// Business schemas
export const createBusinessSchema = z.object({
    name: z.string().min(2).max(200),
    businessType: z.enum(['retail', 'wholesale', 'service', 'food', 'other']),
    currency: z.string().length(3).default('KES'),
    autoSaveRate: z.number().int().min(0).max(50).default(5),
    savingsGoal: moneySchema.default(0),
    timezone: z.string().default('Africa/Nairobi')
});

export const updateBusinessSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    autoSaveRate: z.number().int().min(0).max(50).optional(),
    savingsGoal: moneySchema.optional(),
    cashVarianceThreshold: moneySchema.optional()
});

// User schemas
export const updateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    preferredLanguage: z.enum(['en', 'sw']).optional()
});

// Invite schemas
export const inviteCashierSchema = z.object({
    phone: phoneSchema,
    name: z.string().min(2).max(100)
});

// Transaction schemas
export const transactionItemSchema = z.object({
    productId: uuidSchema,
    quantity: z.number().int().positive(),
    unitSellingPrice: moneySchema,
    unitCostPrice: moneySchema
});

export const createTransactionSchema = z.object({
    items: z.array(transactionItemSchema).min(1),
    paymentMethod: z.enum(['cash', 'mpesa', 'card']),
    customerPhone: phoneSchema.optional(),
    mpesaReceiptNumber: z.string().optional()
});

export const reconcileSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cashActual: moneySchema
});

// Product schemas
export const createProductSchema = z.object({
    name: z.string().min(2).max(200),
    description: z.string().optional(),
    category: z.string().optional(),
    unit: z.string().default('piece'),
    sellingPrice: moneySchema,
    costPrice: moneySchema,
    stockQty: z.number().int().min(0).default(0),
    reorderLevel: z.number().int().min(0).default(10),
    barcode: z.string().optional()
});

export const updateProductSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    sellingPrice: moneySchema.optional(),
    costPrice: moneySchema.optional(),
    reorderLevel: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
});

// Expense schemas
export const createExpenseSchema = z.object({
    category: z.string().min(1),
    amount: moneySchema,
    description: z.string().optional(),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(['daily', 'weekly', 'monthly']).optional()
});

// Stock schemas
export const stockCountSchema = z.object({
    productId: uuidSchema,
    countedQty: z.number().int().min(0),
    notes: z.string().optional()
});

export const stockReceiveSchema = z.object({
    productId: uuidSchema,
    quantity: z.number().int().positive(),
    unitCost: moneySchema.optional(),
    supplierName: z.string().optional(),
    notes: z.string().optional()
});

export const stockAdjustSchema = z.object({
    productId: uuidSchema,
    quantity: z.number().int(),
    reason: z.enum(['damage', 'return', 'correction', 'other']),
    notes: z.string().optional()
});

// Savings schemas
export const updateSavingsRateSchema = z.object({
    autoSaveRate: z.number().int().min(0).max(50)
});

export const withdrawSavingsSchema = z.object({
    amount: moneySchema,
    reason: z.string().optional()
});

// Types
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type InviteCashierInput = z.infer<typeof inviteCashierSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
