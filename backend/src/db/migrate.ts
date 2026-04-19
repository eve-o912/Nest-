import fs from 'fs';
import path from 'path';
import { db } from './connection';

async function migrate() {
    try {
        console.log('Starting database migration...');
        
        // Create migrations tracking table
        await db.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at timestamptz NOT NULL DEFAULT NOW()
            )
        `);
        
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Check if already migrated
        const existing = await db.query(
            'SELECT 1 FROM migrations WHERE name = $1',
            ['initial_schema']
        );
        
        if (existing.rowCount === 0) {
            console.log('Executing initial schema migration...');
            
            // Execute schema (split by statements for safety)
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            for (const statement of statements) {
                await db.query(statement + ';');
            }
            
            await db.query(
                'INSERT INTO migrations (name) VALUES ($1)',
                ['initial_schema']
            );
            
            console.log('Initial schema migration completed successfully');
        } else {
            console.log('Initial schema already migrated, skipping...');
        }
        
        console.log('Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
