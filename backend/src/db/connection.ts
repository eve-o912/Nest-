import { Pool, PoolClient, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    process.exit(-1);
});

export const db = {
    query: async <T = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
        const start = Date.now();
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
        }
        
        return result;
    },
    
    getClient: async (): Promise<PoolClient> => {
        return await pool.connect();
    },
    
    transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    close: async (): Promise<void> => {
        await pool.end();
    }
};

export default pool;
