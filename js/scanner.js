// =====================================================
// CSAP - scanner.js
// QR ticket scanner with static Supabase check-in.
// =====================================================

let html5QrCode = null;
let isScanning = false;
let lastScanned = '';
let scanCooldown = false;

document.addEventListener('DOMContentLoaded', async () => {
  const user = window.CSAP_AUTH.requireSession({ manageOnly: true });
  if (!user) return;

  const nameEl = document.getElementById('scannerUserName');
  if (nameEl) nameEl.textContent = user.name;

  await loadEventDropdown();
});

async function loadEventDropdown() {
  const sel = document.getElementById('scanEventSelect');
  try {
    const events = await window.CSAP_DB.getEvents({ admin: true });
    const active = Array.isArray(events) ? events.filter(e => e.status === 'active') : [];
    if (active.length === 0) {
      sel.innerHTML = '<option value="">No active events</option>';
      return;
    }
    sel.innerHTML =
      '<option value="">Select event</option>' +
      active.map(e =>
        `<option value="${escHtml(e.id)}">${escHtml(e.title)} - ${e.event_date_formatted ?? ''}</option>`
      ).join('');
  } catch (err) {
    sel.innerHTML = `<option value="">${escHtml(err.message || 'Failed to load events')}</option>`;
  }
}

async function startScanner() {
  const eventId = document.getElementById('scanEventSelect').value;
  if (!eventId) {
    Swal.fire({ icon: 'warning', title: 'Select an event', text: 'Please choose the event you are scanning tickets for.', confirmButtonColor: '#c2971a' });
    return;
  }

  setStatus('scanning', '<i class="fa-solid fa-camera"></i> Camera active - point at a ticket QR code.');

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-reader');
  }

  const config = { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 };

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      decodedText => onQrScanned(decodedText, eventId),
      () => {}
    );
    isScanning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = '';
  } catch (err) {
    setStatus('error', '<i class="fa-solid fa-circle-xmark"></i> Camera access denied. Please allow camera permissions and try again.');
    console.error('QR scanner error:', err);
  }
}

async function stopScanner() {
  if (html5QrCode && isScanning) {
    try { await html5QrCode.stop(); } catch (e) {}
    isScanning = false;
  }
  document.getElementById('startBtn').style.display = '';
  document.getElementById('stopBtn').style.display = 'none';
  setStatus('idle', '<i class="fa-solid fa-circle-info"></i> Scanner stopped.');
}

async function onQrScanned(rawText, eventId) {
  if (scanCooldown || rawText === lastScanned) return;
  lastScanned = rawText;
  scanCooldown = true;
  setTimeout(() => { scanCooldown = false; lastScanned = ''; }, 2500);

  const ticketId = rawText.trim();
  if (!ticketId || ticketId.length > 128) {
    setStatus('error', '<i class="fa-solid fa-triangle-exclamation"></i> Invalid QR code - not a valid ticket.');
    return;
  }

  setStatus('scanning', `<i class="fa-solid fa-spinner fa-spin"></i> Looking up ticket ${escHtml(formatTicketId(ticketId))}...`);

  try {
    const data = await window.CSAP_DB.checkIn(eventId, ticketId);

    if (data.already_checked_in) {
      Swal.fire({
        icon: 'warning',
        title: 'Already checked in!',
        html: `<strong>${escHtml(data.first_name)} ${escHtml(data.last_name)}</strong>
               <br>Ticket: ${escHtml(formatTicketId(data.id))}<br>
               <span style="color:#888;font-size:0.85rem;">This attendee was already scanned in.</span>`,
        confirmButtonColor: '#c2971a',
      }).then(() => {
        setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready - scan next ticket.');
      });
      return;
    }

    if (data.error || !data.success) {
      const msg = data.message || data.error || 'Not found.';
      Swal.fire({
        icon: 'error',
        title: 'Ticket not found',
        text: msg,
        confirmButtonColor: '#c2971a',
      }).then(() => {
        setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready - scan next ticket.');
      });
      return;
    }

    showCheckinOverlay(data);
    setStatus('found', `<i class="fa-solid fa-circle-check"></i> Checked in: ${escHtml(data.first_name)} ${escHtml(data.last_name)}`);
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Network error', text: err.message || 'Could not reach the database.', confirmButtonColor: '#c2971a' });
    setStatus('error', '<i class="fa-solid fa-wifi"></i> Network error.');
  }
}

function showCheckinOverlay(data) {
  const overlay = document.getElementById('checkinOverlay');
  document.getElementById('overlayName').textContent = `${data.first_name} ${data.last_name}`;
  document.getElementById('overlayTicket').innerHTML = `<i class="fa-solid fa-ticket"></i> Ticket ${escHtml(formatTicketId(data.id))}`;
  document.getElementById('overlayGuests').innerHTML = `<i class="fa-solid fa-user-group"></i> +${data.guests} guest${data.guests !== 1 ? 's' : ''}`;

  const chips = [];
  if (data.entry_ticket) chips.push('<span class="checkin-chip"><i class="fa-solid fa-ticket"></i> Entry</span>');
  if (data.food_ticket) chips.push('<span class="checkin-chip"><i class="fa-solid fa-utensils"></i> Food</span>');
  document.getElementById('overlayChips').innerHTML = chips.join('');

  overlay.style.display = 'flex';
}

function dismissOverlay() {
  document.getElementById('checkinOverlay').style.display = 'none';
  setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready - scan next ticket.');
}

function setStatus(type, html) {
  const el = document.getElementById('scanStatus');
  el.className = `scanner-status status-${type}`;
  el.innerHTML = html;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTicketId(ticketId) {
  const id = String(ticketId || '');
  return id.length > 22 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id;
}
