/* ============================================================
   ReachAI — Express Server with LinkedIn OAuth 2.0
   Production-Ready 3-Legged OAuth Flow (Member Authorization)
   ============================================================

   ARCHITECTURE OVERVIEW:
   ──────────────────────
   1. GET  /auth/linkedin          → Redirects user to LinkedIn consent screen
   2. GET  /auth/linkedin/callback → Handles OAuth callback, exchanges code for token
   3. GET  /api/user               → Returns current user data + token health
   4. POST /api/logout             → Destroys session
   5. POST /api/token/refresh      → Attempts silent token refresh

   ENVIRONMENT VARIABLES REQUIRED:
   ──────────────────────────────
   LINKEDIN_CLIENT_ID      → From LinkedIn Developer Portal → Auth tab
   LINKEDIN_CLIENT_SECRET  → From LinkedIn Developer Portal → Auth tab
   BASE_URL                → Your app's origin (e.g., http://localhost:3000)
   SESSION_SECRET           → Random string for cookie signing
   PORT                     → Server port (default: 3000)
   ============================================================ */

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('./db');
const { hashPassword, verifyPassword } = require('./auth');
const resumeAnalysis = require('./resumeAnalysis');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ─── Load .env manually (zero external dependencies) ────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
loadEnv();

// ─── Configuration ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'reachai-dev-secret-change-me';

// ┌─────────────────────────────────────────────────────────────┐
// │  CRITICAL: BASE_URL controls the redirect_uri.              │
// │  This MUST match EXACTLY what is registered in the          │
// │  LinkedIn Developer Portal → Auth → Redirect URLs.          │
// │                                                             │
// │  Common causes of "Invalid redirect_uri":                   │
// │  • http vs https mismatch                                   │
// │  • Port present/absent (localhost:3000 vs localhost)         │
// │  • Trailing slash (/callback vs /callback/)                 │
// │  • Path mismatch (/callback vs /auth/linkedin/callback)     │
// └─────────────────────────────────────────────────────────────┘
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const REDIRECT_URI = `${BASE_URL}/auth/linkedin/callback`;

// LinkedIn OAuth endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

// OpenID Connect scopes for "Sign In with LinkedIn"
const OAUTH_SCOPES = ['openid', 'profile', 'email'];

// ─── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // In production with HTTPS, set secure: true
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',       // Required for OAuth redirects
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));


// ═════════════════════════════════════════════════════════════
// LINKEDIN OAUTH 2.0 — 3-LEGGED FLOW
// ═════════════════════════════════════════════════════════════

/**
 * ──────────────────────────────────────────────────────────────
 * STEP 1: Initiate OAuth — Redirect to LinkedIn Authorization
 * ──────────────────────────────────────────────────────────────
 *
 * GET /auth/linkedin
 *
 * Constructs the authorization URL with:
 *   - response_type=code  (authorization code grant)
 *   - client_id           (from env)
 *   - redirect_uri        (from BASE_URL + /auth/linkedin/callback)
 *   - scope               (openid profile email)
 *   - state               (CSRF token — crypto random, stored in session)
 */
app.get('/auth/linkedin', (req, res) => {
  // ── Guard: Ensure credentials are configured ──
  if (!LINKEDIN_CLIENT_ID) {
    console.error('✗ LINKEDIN_CLIENT_ID is not set in .env');
    return res.status(500).json({
      error: 'LinkedIn OAuth not configured',
      fix: 'Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your .env file. See .env.example for details.',
    });
  }

  // ── Generate cryptographically secure state for CSRF protection ──
  // Using 32 bytes = 256-bit entropy, hex-encoded to 64 characters.
  // This is stored server-side in the session and verified on callback.
  // Math.random() is NOT safe for this — it's predictable.
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  req.session.oauthTimestamp = Date.now(); // Track when auth was initiated

  // ── Build the LinkedIn authorization URL ──
  const authUrl = new URL(LINKEDIN_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '));
  authUrl.searchParams.set('state', state);

  console.log(`→ OAuth initiated: redirecting to LinkedIn (state: ${state.substring(0, 8)}...)`);

  res.redirect(authUrl.toString());
});


/**
 * ──────────────────────────────────────────────────────────────
 * STEP 2: OAuth Callback — Exchange Code for Access Token
 * ──────────────────────────────────────────────────────────────
 *
 * GET /auth/linkedin/callback?code=...&state=...
 *
 * LinkedIn redirects here after user grants/denies consent.
 * This handler:
 *   1. Validates the state parameter (CSRF check)
 *   2. Exchanges the authorization code for an access token
 *   3. Fetches the user profile from LinkedIn's userinfo endpoint
 *   4. Stores everything in the session
 *   5. Redirects to the app with a success/error flag
 */
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // ── Handle LinkedIn-side errors (user denied, etc.) ──
  if (error) {
    console.error(`✗ LinkedIn OAuth error: ${error} — ${error_description || 'No description'}`);
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`);
  }

  // ── Validate authorization code is present ──
  if (!code) {
    console.error('✗ No authorization code received from LinkedIn');
    return res.redirect('/?auth_error=missing_code');
  }

  // ── CSRF Protection: Validate state parameter ──
  // The state we stored in the session (Step 1) must match what LinkedIn sent back.
  // If they don't match, this could be a CSRF attack or a stale/replayed request.
  if (!state || !req.session.oauthState || state !== req.session.oauthState) {
    console.error(`✗ State mismatch — possible CSRF attack`);
    console.error(`  Expected: ${req.session.oauthState?.substring(0, 8)}...`);
    console.error(`  Received: ${state?.substring(0, 8)}...`);
    // Clear the used state
    delete req.session.oauthState;
    return res.redirect('/?auth_error=state_mismatch');
  }

  // ── Check for stale auth requests (older than 10 minutes) ──
  const authAge = Date.now() - (req.session.oauthTimestamp || 0);
  if (authAge > 10 * 60 * 1000) {
    console.error(`✗ OAuth callback too slow — ${Math.round(authAge / 1000)}s elapsed (max 600s)`);
    delete req.session.oauthState;
    return res.redirect('/?auth_error=auth_timeout');
  }

  // Clear the state — it's single-use
  delete req.session.oauthState;
  delete req.session.oauthTimestamp;

  try {
    // ── Exchange authorization code for access token ──
    // POST to LinkedIn's token endpoint with URL-encoded body.
    // The client_secret is ONLY used server-side — never exposed to the browser.
    console.log('→ Exchanging authorization code for access token...');

    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,           // Must match Step 1 exactly
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET, // ← Stored in .env, never sent to client
    });

    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenPayload.toString(),
    });

    // ── Handle token exchange failure ──
    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errBody);
      } catch {
        parsedError = { raw: errBody };
      }

      console.error('✗ Token exchange failed:');
      console.error(`  Status: ${tokenResponse.status}`);
      console.error(`  Response:`, parsedError);

      // Provide specific guidance for common errors
      if (parsedError.error === 'invalid_redirect_uri') {
        console.error('  ╔═══════════════════════════════════════════════════════════╗');
        console.error('  ║  FIX: The redirect_uri does not match your LinkedIn app. ║');
        console.error(`  ║  Your server is sending: ${REDIRECT_URI}`);
        console.error('  ║  Go to LinkedIn Developer Portal → Auth → Redirect URLs ║');
        console.error('  ║  and add the EXACT URL shown above (no trailing slash).  ║');
        console.error('  ╚═══════════════════════════════════════════════════════════╝');
      } else if (parsedError.error === 'invalid_grant') {
        console.error('  → The authorization code has expired or was already used.');
        console.error('  → Each code is single-use and expires in ~30 seconds.');
      }

      return res.redirect(`/?auth_error=token_exchange_failed&detail=${encodeURIComponent(parsedError.error || 'unknown')}`);
    }

    const tokenData = await tokenResponse.json();

    /*
     * tokenData contains:
     * {
     *   access_token:  "AQV...",          // The bearer token for API calls
     *   expires_in:    5184000,           // Seconds until expiration (60 days = 5,184,000)
     *   scope:         "openid profile email",
     *   token_type:    "Bearer",
     *   id_token:      "eyJ...",          // JWT with basic user claims (OpenID Connect)
     *   refresh_token: "AQX..." (optional) // Only if your app has refresh token approval
     * }
     */
    console.log(`✓ Access token received (expires in ${Math.round(tokenData.expires_in / 86400)} days)`);

    // ── Fetch user profile from LinkedIn ──
    // The userinfo endpoint (OpenID Connect) returns basic profile data.
    console.log('→ Fetching user profile from LinkedIn...');

    const profileResponse = await fetch(LINKEDIN_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errBody = await profileResponse.text();
      console.error(`✗ Profile fetch failed (${profileResponse.status}):`, errBody);
      return res.redirect('/?auth_error=profile_fetch_failed');
    }

    const profileData = await profileResponse.json();

    /*
     * profileData (OpenID Connect userinfo) contains:
     * {
     *   sub:            "abc123",        // LinkedIn member ID (unique, stable)
     *   name:           "John Doe",      // Full display name
     *   given_name:     "John",          // First name
     *   family_name:    "Doe",           // Last name
     *   picture:        "https://...",   // Profile photo URL
     *   email:          "john@example.com",
     *   email_verified: true,
     *   locale: {
     *     country: "US",
     *     language: "en"
     *   }
     * }
     */

    // ── Store EVERYTHING in session ──
    // We persist the access token, expiration, and profile data so we can:
    // 1. Make API calls on behalf of the user later
    // 2. Track token expiration and trigger refresh
    // 3. Display profile data in the frontend

    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    req.session.user = {
      // Profile data
      linkedinId: profileData.sub,
      firstName: profileData.given_name || '',
      lastName: profileData.family_name || '',
      fullName: profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim(),
      email: profileData.email || '',
      emailVerified: profileData.email_verified || false,
      picture: profileData.picture || '',
      locale: profileData.locale || '',
      provider: 'linkedin',
    };

    req.session.tokens = {
      accessToken: tokenData.access_token,
      // Refresh token — only available if LinkedIn has approved your app for it.
      // Most apps using "Sign In with LinkedIn" do NOT get refresh tokens.
      // If your app has "Advertising API" or similar products, you may have it.
      refreshToken: tokenData.refresh_token || null,
      idToken: tokenData.id_token || null,
      expiresAt: expiresAt,
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
    };

    console.log(`✓ LinkedIn login successful: ${req.session.user.fullName} (${req.session.user.email})`);
    console.log(`  Token expires: ${new Date(expiresAt).toISOString()}`);

    // ── Tie this LinkedIn identity to a real, persisted account ──
    // Without this, LinkedIn logins would have no per-user storage at all
    // (no onboarding data, no saved analyses) — same bug as the mock login.
    if (req.session.user.email) {
      try {
        const account = await db.findOrCreateOAuthUser({
          name: req.session.user.fullName,
          email: req.session.user.email,
          provider: 'linkedin',
        });
        req.session.userId = account.id;
      } catch (e) {
        console.error('✗ Could not link LinkedIn account to local user store:', e.message);
      }
    }

    // ── Redirect back to the app with success flag ──
    res.redirect('/?auth_success=true');

  } catch (err) {
    console.error('✗ OAuth callback error:', err.message);
    console.error('  Stack:', err.stack);
    res.redirect('/?auth_error=server_error');
  }
});


// ═════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═════════════════════════════════════════════════════════════

/**
 * ──────────────────────────────────────────────────────────────
 * Get Current User — Returns profile + token health
 * ──────────────────────────────────────────────────────────────
 *
 * GET /api/user
 *
 * The frontend calls this on page load to check if a user
 * is logged in and whether their token is still valid.
 */
app.get('/api/user', (req, res) => {
  if (req.session.user && req.session.tokens) {
    const now = Date.now();
    const expiresAt = req.session.tokens.expiresAt;
    const remainingMs = expiresAt - now;
    const remainingDays = Math.max(0, Math.floor(remainingMs / (24 * 60 * 60 * 1000)));

    // Warn if token is expiring within 7 days
    const isExpiringSoon = remainingMs < 7 * 24 * 60 * 60 * 1000;
    // Token is already expired
    const isExpired = remainingMs <= 0;
    // Whether we can attempt a refresh
    const canRefresh = !!req.session.tokens.refreshToken;

    res.json({
      loggedIn: true,
      user: req.session.user,
      tokenHealth: {
        expiresAt: new Date(expiresAt).toISOString(),
        remainingDays: remainingDays,
        isExpiringSoon: isExpiringSoon,
        isExpired: isExpired,
        canRefresh: canRefresh,
      },
    });
  } else {
    res.json({ loggedIn: false, user: null, tokenHealth: null });
  }
});


/**
 * ──────────────────────────────────────────────────────────────
 * Token Refresh — Silently refresh an expiring access token
 * ──────────────────────────────────────────────────────────────
 *
 * POST /api/token/refresh
 *
 * LinkedIn access tokens last 60 days. Refresh tokens (if granted)
 * last 365 days. This endpoint attempts to use the refresh token
 * to get a new access token without requiring user interaction.
 *
 * NOTE: Refresh tokens are ONLY available for apps with specific
 * LinkedIn product approvals (e.g., Advertising API). Most apps
 * using "Sign In with LinkedIn" will NOT have refresh tokens.
 * In that case, the user must re-authenticate via the OAuth flow.
 */
app.post('/api/token/refresh', async (req, res) => {
  if (!req.session.tokens?.refreshToken) {
    return res.status(400).json({
      error: 'no_refresh_token',
      message: 'No refresh token available. User must re-authenticate.',
      action: 'redirect_to_login',
      // LinkedIn's "Sign In with LinkedIn using OpenID Connect" product
      // typically does not grant refresh tokens. The user will need to
      // go through the OAuth flow again when their token expires.
    });
  }

  try {
    console.log('→ Attempting token refresh...');

    const refreshPayload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: req.session.tokens.refreshToken,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    });

    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: refreshPayload.toString(),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error(`✗ Token refresh failed (${tokenResponse.status}):`, errBody);
      return res.status(401).json({
        error: 'refresh_failed',
        message: 'Token refresh failed. User must re-authenticate.',
        action: 'redirect_to_login',
      });
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = Date.now() + (tokenData.expires_in * 1000);

    // Update session with new tokens
    req.session.tokens = {
      ...req.session.tokens,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || req.session.tokens.refreshToken,
      expiresAt: expiresAt,
    };

    console.log(`✓ Token refreshed successfully (expires: ${new Date(expiresAt).toISOString()})`);

    res.json({
      success: true,
      tokenHealth: {
        expiresAt: new Date(expiresAt).toISOString(),
        remainingDays: Math.floor((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)),
      },
    });
  } catch (err) {
    console.error('✗ Token refresh error:', err.message);
    res.status(500).json({
      error: 'refresh_error',
      message: 'Internal error during token refresh.',
      action: 'redirect_to_login',
    });
  }
});


/**
 * ──────────────────────────────────────────────────────────────
 * Logout — Destroy session and clear cookies
 * ──────────────────────────────────────────────────────────────
 *
 * POST /api/logout
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('✗ Session destroy error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});


// ═════════════════════════════════════════════════════════════
// LOCAL ACCOUNTS — Real signup / login / onboarding / analysis
// ═════════════════════════════════════════════════════════════

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  next();
}

/**
 * POST /api/signup
 * body: { name, email, password }
 * Creates a real persisted account (hashed password, never plaintext).
 */
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'missing_fields', message: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters.' });
  }
  if (db.findUserByEmail(email)) {
    return res.status(409).json({ error: 'email_taken', message: 'An account with that email already exists.' });
  }
  try {
    const user = await db.createUser({ name, email, passwordHash: hashPassword(password), provider: 'local' });
    req.session.userId = user.id;
    console.log(`✓ New account created: ${email}`);
    res.json({ success: true, user: db.publicUser(user) });
  } catch (err) {
    console.error('✗ Signup error:', err.message);
    res.status(500).json({ error: 'signup_failed', message: 'Could not create account.' });
  }
});

/**
 * POST /api/login
 * body: { email, password }
 * Validates against the stored password hash — no more "any input works".
 */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields', message: 'Email and password are required.' });
  }
  const user = db.findUserByEmail(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password.' });
  }
  req.session.userId = user.id;
  res.json({ success: true, user: db.publicUser(user) });
});

/**
 * GET /api/me
 * Unified session check for local (email/password) or LinkedIn-linked accounts.
 * Returns onboarding status so the client knows whether to show the wizard.
 */
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false, user: null });
  }
  const user = db.findUserById(req.session.userId);
  if (!user) {
    return res.json({ loggedIn: false, user: null });
  }
  res.json({ loggedIn: true, user: db.publicUser(user), linkedInProfile: req.session.user || null });
});

/**
 * POST /api/onboarding
 * body: { role, ...fields }
 * Persists onboarding answers + locks the account's persona server-side
 * (not just in localStorage, so it survives across devices/browsers).
 */
app.post('/api/onboarding', requireAuth, async (req, res) => {
  const data = req.body || {};
  if (!data.role || (data.role !== 'seeker' && data.role !== 'employee')) {
    return res.status(400).json({ error: 'invalid_role' });
  }
  try {
    const user = await db.saveOnboarding(req.session.userId, { ...data, completedAt: new Date().toISOString() });
    res.json({ success: true, user: db.publicUser(user) });
  } catch (err) {
    console.error('✗ Onboarding save error:', err.message);
    res.status(500).json({ error: 'save_failed' });
  }
});

/**
 * POST /api/analyze
 * multipart form: resume (file, optional), resumeText (string, optional), jobText (string)
 * Performs REAL analysis: extracts resume text, detects skills in both
 * texts, computes an actual score/skill-gap breakdown — not a fixed 78.
 */
app.post('/api/analyze', requireAuth, upload.single('resume'), async (req, res) => {
  try {
    const jobText = (req.body.jobText || '').trim();
    let resumeText = (req.body.resumeText || '').trim();

    if (!jobText) {
      return res.status(400).json({ error: 'missing_job_text', message: 'Paste or provide a job description first.' });
    }

    if (req.file) {
      try {
        resumeText = (await resumeAnalysis.extractTextFromFile(req.file)).trim();
      } catch (e) {
        console.error('✗ Resume file parse error:', e.message);
        return res.status(400).json({ error: 'resume_parse_failed', message: 'Could not read that resume file. Try a PDF, DOCX, or TXT, or paste the text instead.' });
      }
    }

    if (!resumeText) {
      return res.status(400).json({ error: 'missing_resume', message: 'Upload a resume file or paste resume/LinkedIn text first.' });
    }

    const result = resumeAnalysis.analyze(jobText, resumeText);
    const saved = await db.saveAnalysis(req.session.userId, {
      jobTextPreview: jobText.slice(0, 300),
      score: result.score,
    });

    res.json({ success: true, analysisId: saved.id, ...result });
  } catch (err) {
    console.error('✗ Analysis error:', err.message);
    res.status(500).json({ error: 'analysis_failed', message: 'Something went wrong analyzing that resume.' });
  }
});


// ─── Fallback: serve index.html for all other routes ─────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// ═════════════════════════════════════════════════════════════
// STARTUP — Configuration Validation & Server Launch
// ═════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              ReachAI Server — Startup Report             ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Server:         http://localhost:${PORT}`);
  console.log(`║  Base URL:       ${BASE_URL}`);
  console.log(`║  Redirect URI:   ${REDIRECT_URI}`);
  console.log('╠═══════════════════════════════════════════════════════════╣');

  // Configuration status checks
  const checks = [
    { label: 'Client ID', ok: !!LINKEDIN_CLIENT_ID },
    { label: 'Client Secret', ok: !!LINKEDIN_CLIENT_SECRET },
    { label: 'Base URL', ok: !!BASE_URL },
    { label: 'Session Secret', ok: SESSION_SECRET !== 'reachai-dev-secret-change-me' },
  ];

  checks.forEach(({ label, ok }) => {
    const icon = ok ? '✓' : '✗';
    const status = ok ? 'Configured' : 'NOT SET';
    console.log(`║  ${icon} ${label.padEnd(16)} ${status}`);
  });

  console.log('╠═══════════════════════════════════════════════════════════╣');

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    console.log('║  ⚠  LinkedIn OAuth is NOT configured.                    ║');
    console.log('║                                                          ║');
    console.log('║  To fix:                                                 ║');
    console.log('║  1. Go to https://www.linkedin.com/developers/apps       ║');
    console.log('║  2. Create an app & request "Sign In with LinkedIn"      ║');
    console.log('║  3. Copy Client ID + Secret into .env file               ║');
    console.log('║  4. Add this Redirect URL in LinkedIn Developer Portal:  ║');
    console.log(`║     → ${REDIRECT_URI}`);
  } else {
    console.log('║  ✓  LinkedIn OAuth is ready!                             ║');
    console.log('║                                                          ║');
    console.log('║  Ensure this Redirect URL is registered in the LinkedIn  ║');
    console.log('║  Developer Portal → Auth → Redirect URLs:                ║');
    console.log(`║     → ${REDIRECT_URI}`);
  }

  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});
