// =====================================================
// CSAP — scanner.js
// QR ticket scanner: session guard, html5-qrcode,
// check-in POST, fullscreen green overlay.
// =====================================================

let html5QrCode  = null;
let isScanning   = false;
let lastScanned  = '';        // debounce: skip duplicate scans within 2s
let scanCooldown = false;

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session guard (admin/superuser only)
  try {
    const res  = await fetch('php/me.php');
    const user = await res.json();
    if (!res.ok || !user.role || !['admin','superuser'].includes(user.role)) {
      window.location.href = 'login.html?error=session';
      return;
    }
    const nameEl = document.getElementById('scannerUserName');
    if (nameEl) nameEl.textContent = user.name;
  } catch {
    window.location.href = 'login.html?error=session';
    return;
  }

  // 2. Load event dropdown
  await loadEventDropdown();
});

async function loadEventDropdown() {
  const sel = document.getElementById('scanEventSelect');
  try {
    const res    = await fetch('php/events/get-events.php?admin=1');
    const events = await res.json();

    const active = Array.isArray(events) ? events.filter(e => e.status === 'active') : [];
    if (active.length === 0) {
      sel.innerHTML = '<option value="">No active events</option>';
      return;
    }
    sel.innerHTML =
      '<option value="">— Select event —</option>' +
      active.map(e =>
        `<option value="${e.id}">${escHtml(e.title)} — ${e.event_date_formatted ?? ''}</option>`
      ).join('');
  } catch {
    sel.innerHTML = '<option value="">Failed to load events</option>';
  }
}

// ── Scanner start / stop ──────────────────────────────
async function startScanner() {
  const eventId = document.getElementById('scanEventSelect').value;
  if (!eventId) {
    Swal.fire({ icon:'warning', title:'Select an event', text:'Please choose the event you are scanning tickets for.', confirmButtonColor:'#c2971a' });
    return;
  }

  setStatus('scanning', '<i class="fa-solid fa-camera"></i> Camera active — point at a ticket QR code.');

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-reader');
  }

  const config = { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 };

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => onQrScanned(decodedText, eventId),
      () => {}   // silent scan errors (just not found yet)
    );
    isScanning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display  = '';
  } catch (err) {
    setStatus('error', '<i class="fa-solid fa-circle-xmark"></i> Camera access denied. Please allow camera permissions and try again.');
    console.error('QR scanner error:', err);
  }
}

async function stopScanner() {
  if (html5QrCode && isScanning) {
    try { await html5QrCode.stop(); } catch {}
    isScanning = false;
  }
  document.getElementById('startBtn').style.display = '';
  document.getElementById('stopBtn').style.display  = 'none';
  setStatus('idle', '<i class="fa-solid fa-circle-info"></i> Scanner stopped.');
}

// ── QR code decoded ───────────────────────────────────
async function onQrScanned(rawText, eventId) {
  // Debounce: ignore duplicates within 2 seconds
  if (scanCooldown || rawText === lastScanned) return;
  lastScanned  = rawText;
  scanCooldown = true;
  setTimeout(() => { scanCooldown = false; lastScanned = ''; }, 2500);

  // Extract PUID — QR encodes just the 10-digit PUID
  const puid = rawText.trim().replace(/\D/g, '');
  if (puid.length !== 10) {
    setStatus('error', `<i class="fa-solid fa-triangle-exclamation"></i> Invalid QR code — not a valid PUID.`);
    return;
  }

  setStatus('scanning', `<i class="fa-solid fa-spinner fa-spin"></i> Looking up PUID ${puid}…`);

  const body = new FormData();
  body.append('event_id', eventId);
  body.append('puid', puid);

  try {
    const res  = await fetch('php/events/checkin.php', { method: 'POST', body });
    const data = await res.json();

    if (data.already_checked_in) {
      // Warn — already scanned
      Swal.fire({
        icon:  'warning',
        title: 'Already checked in!',
        html:  `<strong>${escHtml(data.first_name)} ${escHtml(data.last_name)}</strong>
                <br>PUID: ${puid}<br>
                <span style="color:#888;font-size:0.85rem;">This attendee was already scanned in.</span>`,
        confirmButtonColor: '#c2971a',
      }).then(() => {
        setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready — scan next ticket.');
      });
      return;
    }

    if (data.error || !data.success) {
      const msg = data.message || data.error || 'Not found.';
      Swal.fire({
        icon:  'error',
        title: 'Ticket not found',
        text:  msg,
        confirmButtonColor: '#c2971a',
      }).then(() => {
        setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready — scan next ticket.');
      });
      return;
    }

    // ── SUCCESS: show fullscreen overlay ─────────────
    showCheckinOverlay(data);
    setStatus('found', `<i class="fa-solid fa-circle-check"></i> Checked in: ${escHtml(data.first_name)} ${escHtml(data.last_name)}`);

  } catch {
    Swal.fire({ icon:'error', title:'Network error', text:'Could not reach the server. Check your connection.', confirmButtonColor:'#c2971a' });
    setStatus('error', '<i class="fa-solid fa-wifi"></i> Network error.');
  }
}

// ── Overlay ───────────────────────────────────────────
function showCheckinOverlay(data) {
  const overlay = document.getElementById('checkinOverlay');
  document.getElementById('overlayName').textContent   = `${data.first_name} ${data.last_name}`;
  document.getElementById('overlayPuid').innerHTML = `<i class="fa-solid fa-id-card"></i> ${data.puid}`;
  document.getElementById('overlayGuests').innerHTML = `<i class="fa-solid fa-user-group"></i> +${data.guests} guest${data.guests !== 1 ? 's' : ''}`;

  const chips = [];
  if (data.entry_ticket) chips.push('<span class="checkin-chip"><i class="fa-solid fa-ticket"></i> Entry</span>');
  if (data.food_ticket)  chips.push('<span class="checkin-chip"><i class="fa-solid fa-utensils"></i> Food</span>');
  document.getElementById('overlayChips').innerHTML = chips.join('');

  overlay.style.display = 'flex';
}

function dismissOverlay() {
  document.getElementById('checkinOverlay').style.display = 'none';
  setStatus('scanning', '<i class="fa-solid fa-camera"></i> Ready — scan next ticket.');
}

// ── Helpers ───────────────────────────────────────────
function setStatus(type, html) {
  const el = document.getElementById('scanStatus');
  el.className = `scanner-status status-${type}`;
  el.innerHTML = html;
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Manual Check-in Panel ─────────────────────────────

function toggleManualPanel() {
  const toggle = document.getElementById('manualToggle');
  const body   = document.getElementById('manualPanelBody');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  toggle.classList.toggle('open', !isOpen);
  if (!isOpen) {
    // Focus search input when opened
    setTimeout(() => document.getElementById('manualSearchInput')?.focus(), 150);
  }
}

// Debounce helper
let _manualSearchTimer = null;
function onManualSearch(value) {
  clearTimeout(_manualSearchTimer);
  _manualSearchTimer = setTimeout(() => _doManualSearch(value.trim()), 300);
}

async function _doManualSearch(query) {
  const resultsEl = document.getElementById('manualResults');
  const eventId   = document.getElementById('scanEventSelect')?.value;

  if (!eventId) {
    resultsEl.innerHTML = `<div class="manual-empty"><i class="fa-solid fa-calendar-days" style="font-size:1.4rem;margin-bottom:8px;display:block;"></i>Please select an event first.</div>`;
    return;
  }

  if (query.length < 2) {
    resultsEl.innerHTML = `<div class="manual-empty"><i class="fa-solid fa-users" style="font-size:1.6rem;margin-bottom:8px;display:block;"></i>Start typing to search attendees</div>`;
    return;
  }

  // Loading state
  resultsEl.innerHTML = `<div class="manual-empty"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.4rem;margin-bottom:8px;display:block;"></i>Searching…</div>`;

  try {
    const body = new FormData();
    body.append('event_id', eventId);
    body.append('query', query);
    const res  = await fetch('php/events/search-attendees.php', { method: 'POST', body });
    const data = await res.json();

    if (data.error) throw new Error(data.error);
    _renderManualResults(data.results ?? []);
  } catch (err) {
    resultsEl.innerHTML = `<div class="manual-empty" style="color:#dc2626;"><i class="fa-solid fa-circle-xmark" style="font-size:1.4rem;margin-bottom:8px;display:block;"></i>${escHtml(err.message)}</div>`;
  }
}

function _renderManualResults(results) {
  const resultsEl = document.getElementById('manualResults');

  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="manual-empty"><i class="fa-solid fa-user-slash" style="font-size:1.4rem;margin-bottom:8px;display:block;"></i>No attendees found.</div>`;
    return;
  }

  resultsEl.innerHTML = results.map(r => {
    const initials   = (r.first_name[0] ?? '') + (r.last_name[0] ?? '');
    const isChecked  = r.checked_in === 1;
    const avatarCls  = isChecked ? 'mr-avatar checked' : 'mr-avatar';
    const avatarIcon = isChecked ? '<i class="fa-solid fa-check"></i>' : escHtml(initials.toUpperCase());

    const badges = [];
    if (r.entry_ticket) badges.push('<span class="mr-badge mr-badge-entry">Entry</span>');
    if (r.food_ticket)  badges.push('<span class="mr-badge mr-badge-food">Food</span>');
    if (isChecked)      badges.push('<span class="mr-badge mr-badge-checked"><i class="fa-solid fa-circle-check"></i> Checked in</span>');

    const btnLabel   = isChecked ? '<i class="fa-solid fa-check"></i> Done' : '<i class="fa-solid fa-right-to-bracket"></i> Check In';
    const btnDisabled = isChecked ? 'disabled' : '';

    return `
    <div class="manual-result-row ${isChecked ? 'already-in' : ''}" id="manualRow-${r.id}">
      <div class="${avatarCls}">${avatarIcon}</div>
      <div class="mr-info">
        <div class="mr-name">${escHtml(r.first_name)} ${escHtml(r.last_name)}</div>
        <div class="mr-meta">
          <span><i class="fa-solid fa-id-card"></i> ${escHtml(r.puid)}</span>
          ${badges.join(' ')}
        </div>
      </div>
      <button class="btn-manual-checkin" ${btnDisabled}
              onclick="manualCheckin(${r.id}, '${escHtml(r.puid)}', this)"
              id="manualBtn-${r.id}">
        ${btnLabel}
      </button>
    </div>`;
  }).join('');
}

async function manualCheckin(regId, puid, btnEl) {
  const eventId = document.getElementById('scanEventSelect')?.value;
  if (!eventId) return;

  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  const body = new FormData();
  body.append('event_id', eventId);
  body.append('puid', puid);

  try {
    const res  = await fetch('php/events/checkin.php', { method: 'POST', body });
    const data = await res.json();

    if (data.already_checked_in) {
      // Mark row as already checked in
      _markRowChecked(regId, data);
      Swal.fire({
        icon: 'warning',
        title: 'Already checked in!',
        html: `<strong>${escHtml(data.first_name)} ${escHtml(data.last_name)}</strong><br>
               <span style="color:#888;font-size:0.85rem;">This attendee was already scanned in.</span>`,
        confirmButtonColor: '#c2971a',
      });
      return;
    }

    if (data.error || !data.success) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Check In';
      Swal.fire({
        icon: 'error',
        title: 'Check-in failed',
        text: data.message || data.error || 'Unknown error.',
        confirmButtonColor: '#c2971a',
      });
      return;
    }

    // ── SUCCESS ──────────────────────────────────────
    _markRowChecked(regId, data);
    showCheckinOverlay(data);
    setStatus('found', `<i class="fa-solid fa-circle-check"></i> Checked in: ${escHtml(data.first_name)} ${escHtml(data.last_name)}`);

  } catch {
    btnEl.disabled = false;
    btnEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Check In';
    Swal.fire({ icon: 'error', title: 'Network error', text: 'Could not reach the server.', confirmButtonColor: '#c2971a' });
  }
}

function _markRowChecked(regId, data) {
  const row = document.getElementById(`manualRow-${regId}`);
  const btn = document.getElementById(`manualBtn-${regId}`);
  if (row) row.classList.add('already-in');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Done';
  }
  // Update avatar to green check
  const avatar = row?.querySelector('.mr-avatar');
  if (avatar) {
    avatar.classList.add('checked');
    avatar.innerHTML = '<i class="fa-solid fa-check"></i>';
  }
  // Add checked badge to meta
  const meta = row?.querySelector('.mr-meta');
  if (meta && !meta.querySelector('.mr-badge-checked')) {
    meta.insertAdjacentHTML('beforeend', '<span class="mr-badge mr-badge-checked"><i class="fa-solid fa-circle-check"></i> Checked in</span>');
  }
}

