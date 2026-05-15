// AES Encryption Utility for sensitive data fields
import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY || 'default_secret_key_for_demo_mode_32ch';

/**
 * Encrypt a plaintext string using AES-256
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  try {
    return CryptoJS.AES.encrypt(plaintext, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return plaintext;
  }
}

/**
 * Decrypt an AES-encrypted string
 */
export function decrypt(ciphertext) {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return ciphertext;
  }
}

/**
 * Hash a string using SHA-256 (for non-reversible data)
 */
export function hashData(data) {
  return CryptoJS.SHA256(data).toString();
}

export default { encrypt, decrypt, hashData };
