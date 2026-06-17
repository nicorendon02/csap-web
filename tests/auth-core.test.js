const assert = require('assert');
const AuthCore = require('../js/auth-core.js');

async function run() {
  assert.strictEqual(AuthCore.normalizeEmail('  USER@Purdue.EDU '), 'user@purdue.edu');
  assert.strictEqual(AuthCore.isValidEmail('student@purdue.edu'), true);
  assert.strictEqual(AuthCore.isValidEmail('student@'), false);

  assert.strictEqual(AuthCore.normalizeLastNames('  García-Márquez  '), 'garcia marquez');
  assert.strictEqual(AuthCore.normalizeLastNames("O'Connor"), 'o connor');
  assert.strictEqual(AuthCore.normalizeLastNames('123'), '');
  assert.strictEqual(AuthCore.formatLastNamesInput('  García   Márquez'), 'García Márquez');

  const valid = AuthCore.validateLoginFields('student@purdue.edu', 'García Márquez');
  assert.strictEqual(valid.ok, true);
  assert.strictEqual(valid.email, 'student@purdue.edu');
  assert.strictEqual(valid.lastNames, 'garcia marquez');

  const invalid = AuthCore.validateLoginFields('bad-email', '123');
  assert.strictEqual(invalid.ok, false);
  assert.strictEqual(invalid.errors.length, 2);

  assert.strictEqual(AuthCore.emailToUserKey('admin@csap.purdue.edu'), 'YWRtaW5AY3NhcC5wdXJkdWUuZWR1');

  assert.strictEqual(AuthCore.matchesLastNameCredential({ email: 'admin@csap.purdue.edu', last_names: 'Admin' }, 'admin'), true);
  assert.strictEqual(AuthCore.matchesLastNameCredential({ email: 'admin@csap.purdue.edu', last_names: 'García Márquez' }, 'garcia marquez'), true);
  assert.strictEqual(AuthCore.matchesLastNameCredential({ email: 'admin@csap.purdue.edu', last_names: 'Admin' }, 'different'), false);
  assert.strictEqual(AuthCore.canManage({ role: 'admin' }), true);
  assert.strictEqual(AuthCore.canManage({ role: 'superuser' }), true);
  assert.strictEqual(AuthCore.canManage({ role: 'user' }), false);
  assert.strictEqual(AuthCore.canPromote({ role: 'admin' }), true);
  assert.strictEqual(AuthCore.canPromote({ role: 'superuser' }), false);

  const session = AuthCore.createSessionPayload({
    id: 'abc', name: 'Test User', email: 'TEST@PURDUE.EDU', role: 'admin', status: 'active', last_names: 'User',
  }, '2026-01-01T00:00:00.000Z');
  assert.deepStrictEqual(session, {
    id: 'abc', name: 'Test User', email: 'test@purdue.edu', role: 'admin', status: 'active', logged_in_at: '2026-01-01T00:00:00.000Z',
  });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(session, 'last_names'), false);

  console.log('auth-core tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
