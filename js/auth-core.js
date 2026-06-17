// =====================================================
// CSAP - auth-core.js
// Pure login helpers shared by browser code and unit tests.
// =====================================================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CSAP_AUTH_CORE = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const SESSION_KEY = 'csapSession';
  const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;
  const VALID_ROLES = ['admin', 'superuser', 'user'];
  const VALID_STATUSES = ['active', 'pending', 'suspended'];

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
  }

  function normalizeLastNames(value) {
    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['-]/g, ' ')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isValidLastNames(value) {
    return normalizeLastNames(value).length > 0;
  }

  function formatLastNamesInput(value) {
    return String(value || '').replace(/\s+/g, ' ').trimStart();
  }

  function validateLoginFields(email, lastNames) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedLastNames = normalizeLastNames(lastNames);
    const errors = [];

    if (!isValidEmail(normalizedEmail)) errors.push('Enter a valid email address.');
    if (!normalizedLastNames) errors.push('Enter your last name(s).');

    return {
      ok: errors.length === 0,
      errors,
      email: normalizedEmail,
      lastNames: normalizedLastNames,
    };
  }

  function base64Url(input) {
    if (typeof btoa === 'function') {
      return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(input, 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
    return encodeURIComponent(input).replace(/[.#$\[\]\/]/g, '_');
  }

  function emailToUserKey(email) {
    return base64Url(normalizeEmail(email));
  }

  function normalizeRole(role) {
    return VALID_ROLES.includes(role) ? role : 'user';
  }

  function normalizeStatus(status) {
    return VALID_STATUSES.includes(status) ? status : 'pending';
  }

  function isActiveUser(user) {
    return !!user && normalizeStatus(user.status) === 'active';
  }

  function canManage(roleOrUser) {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser?.role;
    return ['admin', 'superuser'].includes(role);
  }

  function canPromote(roleOrUser) {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser?.role;
    return role === 'admin';
  }

  function matchesLastNameCredential(user, lastNames) {
    if (!user) return false;
    const normalized = normalizeLastNames(lastNames);
    if (!normalized) return false;
    return normalizeLastNames(user.last_names) === normalized;
  }

  function sanitizeUserForSession(user) {
    if (!user) return null;
    return {
      id: user.id || emailToUserKey(user.email),
      name: user.name || '',
      email: normalizeEmail(user.email),
      role: normalizeRole(user.role),
      status: normalizeStatus(user.status),
    };
  }

  function createSessionPayload(user, now) {
    const safeUser = sanitizeUserForSession(user);
    if (!safeUser) return null;
    return {
      ...safeUser,
      logged_in_at: now || new Date().toISOString(),
    };
  }

  function getStorage() {
    try { return root.localStorage || null; }
    catch (e) { return null; }
  }

  function saveSession(user) {
    const storage = getStorage();
    const session = createSessionPayload(user);
    if (storage && session) storage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    const storage = getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session?.logged_in_at) return null;
      if (Date.now() - new Date(session.logged_in_at).getTime() > MAX_SESSION_AGE_MS) {
        storage.removeItem(SESSION_KEY);
        return null;
      }
      return sanitizeUserForSession(session);
    } catch (e) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function clearSession() {
    const storage = getStorage();
    if (storage) storage.removeItem(SESSION_KEY);
  }

  return {
    SESSION_KEY,
    MAX_SESSION_AGE_MS,
    normalizeEmail,
    isValidEmail,
    normalizeLastNames,
    isValidLastNames,
    formatLastNamesInput,
    validateLoginFields,
    emailToUserKey,
    normalizeRole,
    normalizeStatus,
    isActiveUser,
    canManage,
    canPromote,
    matchesLastNameCredential,
    sanitizeUserForSession,
    createSessionPayload,
    saveSession,
    getSession,
    clearSession,
  };
});
