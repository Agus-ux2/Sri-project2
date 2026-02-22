import crypto from 'crypto';

export class CookieEncryptionService {
    private algorithm = 'aes-256-gcm';
    private encryptionKey: Buffer;

    constructor(secret: string) {
        // Derivar clave de 256 bits
        this.encryptionKey = crypto.scryptSync(
            secret,
            'sri-cookie-salt-v1',
            32 // 256 bits
        );
    }

    encrypt(data: any): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;

        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        // Formato: iv:tag:encrypted
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedData: string): any {
        const [ivHex, tagHex, encrypted] = encryptedData.split(':');

        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');

        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }
}

export default new CookieEncryptionService(process.env.COOKIE_ENCRYPTION_SECRET!);
