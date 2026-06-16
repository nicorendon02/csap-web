// =====================================================
// CSAP — ticket-download.js
// Ticket download page logic: populate event dropdown,
// find ticket by PUID + event, generate PDF.
// =====================================================

document.addEventListener('DOMContentLoaded', loadEventDropdown);

async function loadEventDropdown() {
  const sel = document.getElementById('dlEvent');
  try {
    const res    = await fetch('php/events/get-events.php');
    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      sel.innerHTML = '<option value="">No events available</option>';
      return;
    }

    sel.innerHTML =
      '<option value="">— Select an event —</option>' +
      events.map(e =>
        `<option value="${e.id}">${escHtml(e.title)} — ${e.event_date_formatted ?? 'Date TBD'}</option>`
      ).join('');
  } catch {
    sel.innerHTML = '<option value="">Failed to load events</option>';
  }
}

function onPuidInput(input) {
  const hint = document.getElementById('dlPuidHint');
  const val  = input.value.replace(/\D/g, '');
  input.value = val;
  hint.textContent = '';
  hint.className   = 'puid-hint';
  if (val.length > 0 && val.length < 10) {
    hint.textContent = `${10 - val.length} more digit${10 - val.length > 1 ? 's' : ''} needed.`;
    hint.className   = 'puid-hint warn';
  } else if (val.length === 10) {
    hint.textContent = '✓ Looks good!';
    hint.className   = 'puid-hint ok';
  }
}

async function downloadTicket() {
  const eventId = document.getElementById('dlEvent').value;
  const puid    = document.getElementById('dlPuid').value.trim();
  const btn     = document.getElementById('dlBtn');

  if (!eventId) {
    Swal.fire({ icon:'warning', title:'Select an event', text:'Please choose your event from the dropdown.', confirmButtonColor:'#c2971a' });
    return;
  }
  if (!/^\d{10}$/.test(puid)) {
    Swal.fire({ icon:'warning', title:'Invalid PUID', text:'Your Purdue ID must be exactly 10 digits.', confirmButtonColor:'#c2971a' });
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Looking up ticket…';

  const body = new FormData();
  body.append('event_id', eventId);
  body.append('puid', puid);

  try {
    const res  = await fetch('php/events/get-ticket.php', { method: 'POST', body });
    const data = await res.json();

    if (!res.ok || data.error) throw new Error(data.error || 'Ticket not found.');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF…';
    await generateTicketPDF(data.registration, data.event);

    Swal.fire({
      icon:  'success',
      title: 'Ticket downloaded!',
      text:  'Your ticket PDF has been saved. Keep it handy for the event!',
      confirmButtonColor: '#c2971a',
    });
  } catch (err) {
    Swal.fire({
      icon:  'error',
      title: 'Ticket not found',
      html:  `<p style="font-size:0.95rem;color:#555;">${escHtml(err.message)}</p>
              <p style="font-size:0.82rem;color:#888;margin-top:8px;">
                Make sure your PUID matches exactly what you used during registration, and that you selected the correct event.
              </p>`,
      confirmButtonText:  'Try again',
      confirmButtonColor: '#c2971a',
    });
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-download"></i> Download Ticket';
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
