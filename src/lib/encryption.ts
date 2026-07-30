import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY must be a 64-character hex string (32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn('WARNING: ENCRYPTION_KEY is not properly set in environment variables. It must be a 64-character hex string.');
}

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key is missing');
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key is missing');
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function encryptJSON(data: any): string {
  return encrypt(JSON.stringify(data));
}

export function decryptJSON(encryptedData: string): any {
  return JSON.parse(decrypt(encryptedData));
}
