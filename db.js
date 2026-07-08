/* ============================================================
   ReachAI — Lightweight File-Backed Database
   ============================================================
   A dependency-free JSON-file datastore. Not a toy: it really
   persists to disk (data/db.json) and survives server restarts,
   which is what actually matters for a small single-instance app.
   Writes are serialized through a promise queue so concurrent
   requests can't corrupt the file.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Corrupt file — don't crash the server, start fresh but keep a backup.
    fs.copyFileSync(DB_PATH, DB_PATH + '.corrupt.' + Date.now());
    return { users: [] };
  }
}

// Simple write queue so two concurrent requests never interleave writes.
let writeQueue = Promise.resolve();
function writeDb(data) {
  writeQueue = writeQueue.then(() => new Promise((resolve, reject) => {
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFile(tmpPath, JSON.stringify(data, null, 2), (err) => {
      if (err) return reject(err);
      fs.rename(tmpPath, DB_PATH, (err2) => (err2 ? reject(err2) : resolve()));
    });
  }));
  return writeQueue;
}

function genId() {
  return crypto.randomBytes(12).toString('hex');
}

// ─── Users ───────────────────────────────────────────────────

function findUserByEmail(email) {
  const db = readDb();
  const norm = (email || '').trim().toLowerCase();
  return db.users.find(u => u.email.toLowerCase() === norm) || null;
}

function findUserById(id) {
  const db = readDb();
  return db.users.find(u => u.id === id) || null;
}

async function createUser({ name, email, passwordHash, provider }) {
  const db = readDb();
  const norm = (email || '').trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase() === norm)) {
    throw new Error('EMAIL_TAKEN');
  }
  const user = {
    id: genId(),
    name: name || '',
    email: email,
    passwordHash: passwordHash || null, // null for OAuth-only accounts
    provider: provider || 'local',
    createdAt: new Date().toISOString(),
    onboarding: null,        // { role, ...fields, completedAt }
    personaLocked: false,
    analyses: [],            // history of resume/job analyses
  };
  db.users.push(user);
  await writeDb(db);
  return user;
}

async function findOrCreateOAuthUser({ name, email, provider }) {
  const existing = findUserByEmail(email);
  if (existing) return existing;
  return createUser({ name, email, passwordHash: null, provider });
}

async function saveOnboarding(userId, onboardingData) {
  const db = readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  user.onboarding = onboardingData;
  user.personaLocked = true;
  await writeDb(db);
  return user;
}

async function saveAnalysis(userId, analysis) {
  const db = readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  const record = { id: genId(), createdAt: new Date().toISOString(), ...analysis };
  user.analyses.unshift(record);
  // Keep history bounded
  user.analyses = user.analyses.slice(0, 25);
  await writeDb(db);
  return record;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    onboarding: user.onboarding,
    personaLocked: user.personaLocked,
  };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findOrCreateOAuthUser,
  saveOnboarding,
  saveAnalysis,
  publicUser,
};
