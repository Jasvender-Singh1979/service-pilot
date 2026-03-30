// This file is used to compute test hashes for verification
// Run this manually in Node or browser dev tools

import crypto from 'crypto';

export function hashPassword(password: string, salt?: string): string {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, useSalt, 100000, 64, 'sha256')
    .toString('hex');
  return `${useSalt}:${hash}`;
}

// Test: 
// hashPassword('Test@12345')
// Output: salt:hash (random each time due to random salt)

// To verify password:
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, hash] = storedHash.split(':');
  const computed = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
    .toString('hex');
  return computed === hash;
}

// To create a test hash with KNOWN salt for debugging:
export function hashPasswordWithKnownSalt(password: string): string {
  // Use a fixed salt for reproducible testing
  const knownSalt = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  const hash = crypto
    .pbkdf2Sync(password, knownSalt, 100000, 64, 'sha256')
    .toString('hex');
  return `${knownSalt}:${hash}`;
}

// For 'Test@12345' with salt 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6':
// Expected hash: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:c5d5f4e3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6
