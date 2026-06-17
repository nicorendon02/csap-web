// =====================================================
// CSAP - login.js
// Email + last name login for the static Supabase site.
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const lastNamesInput = document.getElementById('loginLastNames');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmitBtn');

  const messages = {
    invalid: 'Incorrect email or last name(s). Please try again.',
    empty: 'Please enter your email and last name(s).',
    inactive: 'Your account is not active. Contact an administrator.',
    session: 'Your session has expired. Please sign in again.',
    server: 'A server error occurred. Please try again later.',
  };

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get('error');
  if (code) {
    showError(messages[code] || 'Login failed. Please try again.');
    history.replaceState(null, '', window.location.pathname);
  }

  if (window.CSAP_AUTH?.getCurrentUser()) {
    window.location.href = 'members.html';
    return;
  }

  lastNamesInput?.addEventListener('input', () => {
    lastNamesInput.value = window.CSAP_AUTH.formatLastNamesInput(lastNamesInput.value);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      await window.CSAP_AUTH.login(emailInput.value, lastNamesInput.value);
      window.location.href = 'members.html';
    } catch (err) {
      showError(err.message || 'Login failed. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});
