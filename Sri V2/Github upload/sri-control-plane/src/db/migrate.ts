import fs from 'fs';
import path from 'path';
import db from './client';

const runMigrations = async () => {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
        if (file.endsWith('.sql')) {
            console.log(`Running migration: ${file}`);
            const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                await db.query(content);
                console.log(`✓ ${file} applied`);
            } catch (err) {
                console.error(`Status: Failed to apply ${file}`, err);
                process.exit(1);
            }
        }
    }
    process.exit(0);
};

runMigrations();
