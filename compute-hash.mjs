import crypto from 'crypto';

function hashPassword(password, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, useSalt, 100000, 64, 'sha256').toString('hex');
  return `${useSalt}:${hash}`;
}

const hash = hashPassword('Test@12345');
console.log(hash);
