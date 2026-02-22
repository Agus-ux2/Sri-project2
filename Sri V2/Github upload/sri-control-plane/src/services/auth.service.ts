import bcrypt from 'bcrypt';
import db from '../db/client';

export interface UserRegistrationData {
    email: string;
    password_hash: string;
    name: string;
    username?: string;
    company: string;
    phone?: string;
}

export interface ZoneData {
    location: string;
    hectares: number;
}

class AuthService {
    /**
     * Hash a plain text password
     */
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare a plain text password with a hash
     */
    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Create a new user with zones
     */
    async registerUser(userData: UserRegistrationData, zones: ZoneData[]) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const userInsertQuery = `
                INSERT INTO users (email, password_hash, name, username, company, phone)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email, name, username, company, role
            `;

            const userRes = await client.query(userInsertQuery, [
                userData.email,
                userData.password_hash,
                userData.name,
                userData.username,
                userData.company,
                userData.phone
            ]);

            const user = userRes.rows[0];

            if (zones && zones.length > 0) {
                const zoneInsertQuery = `
                    INSERT INTO production_zones (user_id, location, hectares)
                    VALUES ($1, $2, $3)
                `;

                for (const zone of zones) {
                    await client.query(zoneInsertQuery, [user.id, zone.location, zone.hectares]);
                }
            }

            await client.query('COMMIT');
            return user;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find a user by email
     */
    async findUserByEmail(email: string) {
        const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    }

    /**
     * Get production zones for a user
     */
    async getZonesByUserId(userId: number) {
        const res = await db.query('SELECT * FROM production_zones WHERE user_id = $1', [userId]);
        return res.rows;
    }
}

export default new AuthService();
