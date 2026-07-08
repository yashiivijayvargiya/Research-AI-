/* ============================================================
   ReachAI — Password Hashing
   ============================================================
   Uses Node's built-in crypto.scrypt (no native/compiled deps,
   no bcrypt install headaches) with a random per-user salt.
   Format stored: "<salt-hex>:<hash-hex>"
   ============================================================ */

const crypto = require('crypto');

const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

module.exports = { hashPassword, verifyPassword };
