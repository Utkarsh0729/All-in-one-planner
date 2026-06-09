import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SALT = 'all-in-one-planner-salt'; // Salt for key derivation

export const encrypt = (text, password) => {
  try {
    const key = crypto.scryptSync(password, SALT, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
};

export const decrypt = (encryptedText, password) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedContent = parts.join(':');
    
    const key = crypto.scryptSync(password, SALT, 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Incorrect password');
  }
};
