// =====================================================
// CSAP - ticket-download.js
// Ticket lookup from Supabase by event + email.
// =====================================================

document.addEventListener('DOMContentLoaded', loadEventDropdown);

async function loadEventDropdown() {
  const sel = document.getElementById('dlEvent');
  const btn = document.getElementById('dlBtn');

  if (!window.CSAP_DB?.isConfigured?.()) {
    sel.innerHTML = '<option value="">Ticket lookup unavailable</option>';
    if (btn) btn.disabled = true;
    return;
  }

  try {
    const events = await window.CSAP_DB.getEvents();

    if (!Array.isArray(events) || events.length === 0) {
      sel.innerHTML = '<option value="">No events available</option>';
      return;
    }

    sel.innerHTML =
      '<option value="">Select an event</option>' +
      events.map(e =>
        `<option value="${escHtml(e.id)}">${escHtml(e.title)} - ${e.event_date_formatted ?? 'Date TBD'}</option>`
      ).join('');
  } catch (err) {
    sel.innerHTML = `<option value="">${escHtml(err.message || 'Failed to load events')}</option>`;
  }
}

function onEmailInput(input) {
  const hint = document.getElementById('dlEmailHint');
  const val = input.value.trim();
  hint.textContent = '';
  hint.className = 'email-hint';
  if (val.length > 0 && !isValidEmail(val)) {
    hint.textContent = 'Enter a valid email address.';
    hint.className = 'email-hint warn';
  } else if (isValidEmail(val)) {
    hint.textContent = 'Looks good!';
    hint.className = 'email-hint ok';
  }
}

async function downloadTicket() {
  const eventId = document.getElementById('dlEvent').value;
  const email = document.getElementById('dlEmail').value.trim();
  const btn = document.getElementById('dlBtn');

  if (!eventId) {
    Swal.fire({ icon: 'warning', title: 'Select an event', text: 'Please choose your event from the dropdown.', confirmButtonColor: '#c2971a' });
    return;
  }
  if (!isValidEmail(email)) {
    Swal.fire({ icon: 'warning', title: 'Invalid email', text: 'Enter the email address you used during registration.', confirmButtonColor: '#c2971a' });
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Looking up ticket...';

  try {
    const data = await window.CSAP_DB.getTicket(eventId, email);
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
    await generateTicketPDF(data.registration, data.event);

    Swal.fire({
      icon: 'success',
      title: 'Ticket downloaded!',
      text: 'Your ticket PDF has been saved. Keep it handy for the event!',
      confirmButtonColor: '#c2971a',
    });
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Ticket not found',
      html: `<p style="font-size:0.95rem;color:#555;">${escHtml(err.message)}</p>
             <p style="font-size:0.82rem;color:#888;margin-top:8px;">
                Make sure your email matches exactly what you used during registration, and that you selected the correct event.
              </p>`,
      confirmButtonText: 'Try again',
      confirmButtonColor: '#c2971a',
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-download"></i> Download Ticket';
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
