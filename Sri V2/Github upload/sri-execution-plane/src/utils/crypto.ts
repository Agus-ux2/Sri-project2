import crypto from 'crypto';
import config from '../config';

/**
 * Generar hash SHA-256 de un script
 */
export function generateScriptHash(scriptContent: string): string {
  return crypto
    .createHash('sha256')
    .update(scriptContent, 'utf8')
    .digest('hex');
}

/**
 * Verificar hash SHA-256 de un script
 */
export function verifyScriptHash(
  scriptContent: string,
  expectedHash: string
): boolean {
  try {
    const actualHash = generateScriptHash(scriptContent);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Verificar firma HMAC de un script
 */
export function verifyScriptSignature(
  scriptContent: string,
  expectedSignature: string
): boolean {
  try {
    const signature = crypto
      .createHmac('sha256', config.signing.secret)
      .update(scriptContent, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizar nombre de archivo
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}
