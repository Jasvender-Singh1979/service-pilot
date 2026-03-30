#!/usr/bin/env node

/**
 * Script to reset a manager password using the app's auth utils
 * Usage: node scripts/reset-password.js bani@bani.com Test@12345
 */

const crypto = require('crypto');

function hashPassword(password, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha256').toString('hex');
  return `${useSalt}:${hash}`;
}

const email = process.argv[2] || 'bani@bani.com';
const password = process.argv[3] || 'Test@12345';

const hash = hashPassword(password);
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);
console.log(`Generated Hash: ${hash}`);

// Output SQL to update the database
console.log(`\nSQL to execute:`);
console.log(`UPDATE account SET password = '${hash}', "updatedAt" = NOW() WHERE "userId" = (SELECT id FROM "user" WHERE LOWER(email) = LOWER('${email}'));`);
