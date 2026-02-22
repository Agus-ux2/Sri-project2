import crypto from 'crypto';
import db from '../db/client';

export class KeyRotationService {
    private keys: Map<number, SigningKey> = new Map();
    private currentVersion: number = 0;

    async rotateKey(): Promise<void> {
        // Generar nueva clave
        const newKey = crypto.randomBytes(32).toString('hex');
        const newVersion = this.currentVersion + 1;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 días grace period

        // Guardar en DB
        await db.query(
            `INSERT INTO signing_keys (version, key, expires_at, status)
       VALUES ($1, $2, $3, 'active')`,
            [newVersion, newKey, expiresAt]
        );

        // Deprecar anterior
        if (this.currentVersion > 0) {
            await db.query(
                `UPDATE signing_keys SET status = 'deprecated' WHERE version = $1`,
                [this.currentVersion]
            );
        }

        this.currentVersion = newVersion;
    }

    sign(script: string): { signature: string; version: number } {
        const key = this.keys.get(this.currentVersion)!;

        const signature = crypto
            .createHmac('sha256', key.key)
            .update(script, 'utf8')
            .digest('hex');

        return { signature, version: this.currentVersion };
    }

    verify(script: string, signature: string, version: number): boolean {
        const key = this.keys.get(version);
        if (!key || key.status === 'revoked') return false;

        const expected = crypto
            .createHmac('sha256', key.key)
            .update(script, 'utf8')
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expected, 'hex')
        );
    }
}

interface SigningKey {
    version: number;
    key: string;
    expires_at: Date;
    status: 'active' | 'deprecated' | 'revoked';
}
