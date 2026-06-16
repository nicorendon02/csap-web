// =====================================================
// CSAP — events-portal.js
// Public events page: load events, registration form,
// PUID validation, PDF generation after submit.
// =====================================================

const CATEGORY_ICONS = {
  social:       'fa-champagne-glasses',
  cultural:     'fa-music',
  academic:     'fa-graduation-cap',
  food:         'fa-utensils',
  professional: 'fa-briefcase',
  fundraiser:   'fa-hand-holding-heart',
};

let guestCount = 0;

document.addEventListener('DOMContentLoaded', loadPublicEvents);

// ── Load Events ───────────────────────────────────────
async function loadPublicEvents() {
  try {
    const res    = await fetch('php/events/get-events.php');
    const events = await res.json();

    const section = document.getElementById('eventsSection');
    const empty   = document.getElementById('eventsEmpty');
    const follow  = document.getElementById('eventsFollowSection');
    const grid    = document.getElementById('eventsGrid');

    if (!Array.isArray(events) || events.length === 0) {
      section.style.display = 'none';
      empty.style.display   = '';
      return;
    }

    empty.style.display   = 'none';
    follow.style.display  = '';
    section.style.display = '';

    grid.innerHTML = events.map(ev => {
      const icon     = CATEGORY_ICONS[ev.category] ?? 'fa-calendar';
      const tagClass = 'tag-' + (ev.category || 'social');
      const open     = +ev.registration_open === 1;
      const tickets  = [];
      if (+ev.has_entry_ticket) tickets.push('<span class="ticket-chip chip-entry"><i class="fa-solid fa-ticket"></i> Entry</span>');
      if (+ev.has_food_ticket)  tickets.push('<span class="ticket-chip chip-food"><i class="fa-solid fa-utensils"></i> Food</span>');

      const registerBtn = open
        ? `<button class="btn-register" onclick="openRegModal(${ev.id}, '${escJs(ev.title)}')">
             Register →
           </button>`
        : `<span class="closed-label">Registration closed</span>`;

      return `
        <div class="event-full-card fade-in">
          <div class="event-thumb"><i class="fa-solid ${icon}"></i></div>
          <div class="event-content">
            <div class="event-meta">
              <span class="event-tag ${tagClass}">${capitalize(ev.category)}</span>
              <span class="event-date-text">${ev.event_date_formatted ?? 'Date TBD'}</span>
            </div>
            <h3>${escHtml(ev.title)}</h3>
            <p>${escHtml(ev.description ?? '')}</p>
            ${tickets.length ? `<div class="ticket-chips">${tickets.join('')}</div>` : ''}
          </div>
          <div class="event-footer">
            <span class="event-location">
              <i class="fa-solid fa-location-dot"></i> ${escHtml(ev.location ?? 'TBD')}
            </span>
            ${registerBtn}
          </div>
        </div>`;
    }).join('');

    // Trigger fade-in
    requestAnimationFrame(() =>
      document.querySelectorAll('.event-full-card.fade-in').forEach(el => {
        setTimeout(() => el.classList.add('visible'), 50);
      })
    );

  } catch (err) {
    document.getElementById('eventsGrid').innerHTML =
      '<div style="text-align:center;padding:40px;color:#dc2626;">Failed to load events. Please refresh the page.</div>';
  }
}

// ── Registration Modal ────────────────────────────────
function openRegModal(eventId, eventTitle) {
  guestCount = 0;
  document.getElementById('regEventId').value = eventId;
  document.getElementById('regEventName').textContent = eventTitle;
  document.getElementById('regPuid').value  = '';
  document.getElementById('regFirst').value = '';
  document.getElementById('regLast').value  = '';
  document.getElementById('guestVal').textContent = '0';
  document.getElementById('regPolicy').checked = false;
  document.getElementById('regError').style.display = 'none';
  document.getElementById('regPuidHint').textContent = '';
  document.getElementById('regPuidHint').className = 'reg-field-hint';
  document.getElementById('regForm').querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  document.getElementById('regModal').style.display = 'flex';
  document.getElementById('regPuid').focus();
}

function closeRegModal() {
  document.getElementById('regModal').style.display = 'none';
}

// ── PUID live validation ───────────────────────────────
function validatePuid(input) {
  const hint = document.getElementById('regPuidHint');
  const val  = input.value.replace(/\D/g, '');
  input.value = val; // strip non-digits
  input.classList.remove('error');
  hint.className = 'reg-field-hint';

  if (val.length === 0) {
    hint.textContent = '';
  } else if (val.length < 10) {
    hint.textContent = `PUID must be exactly 10 digits (${10 - val.length} remaining).`;
    hint.className   = 'reg-field-hint warn';
  } else {
    hint.textContent = '✓ Looks good!';
    hint.className   = 'reg-field-hint';
    hint.style.color = '#16a34a';
  }
}

// ── Guest stepper ─────────────────────────────────────
function adjustGuests(delta) {
  guestCount = Math.min(5, Math.max(0, guestCount + delta));
  document.getElementById('guestVal').textContent = guestCount;
  document.getElementById('guestMinus').disabled  = guestCount === 0;
  document.getElementById('guestPlus').disabled   = guestCount === 5;
}

// ── Submit registration ───────────────────────────────
async function submitRegistration(e) {
  e.preventDefault();
  const errEl = document.getElementById('regError');
  const btn   = document.getElementById('regSubmitBtn');
  errEl.style.display = 'none';

  const puid      = document.getElementById('regPuid').value.trim();
  const firstName = document.getElementById('regFirst').value.trim();
  const lastName  = document.getElementById('regLast').value.trim();
  const eventId   = document.getElementById('regEventId').value;
  const policy    = document.getElementById('regPolicy').checked;

  // Client-side PUID check
  if (!/^\d{10}$/.test(puid)) {
    errEl.textContent   = 'Your PUID must be exactly 10 digits.';
    errEl.style.display = 'block';
    document.getElementById('regPuid').classList.add('error');
    return;
  }
  if (!policy) {
    errEl.textContent   = 'You must agree to the data handling policy to continue.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.innerHTML   = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

  const body = new FormData();
  body.append('event_id',   eventId);
  body.append('puid',       puid);
  body.append('first_name', firstName);
  body.append('last_name',  lastName);
  body.append('guests',     guestCount);

  try {
    const res  = await fetch('php/events/register.php', { method: 'POST', body });
    const data = await res.json();

    if (!res.ok || data.error) throw new Error(data.error || 'Registration failed.');

    // Close modal
    closeRegModal();

    // Generate PDF ticket
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating ticket…';
    try {
      await generateTicketPDF(data.registration, data.event);
    } catch (pdfErr) {
      console.warn('PDF generation error:', pdfErr);
    }

    // SweetAlert2 success
    Swal.fire({
      icon:              'success',
      title:             'You\'re registered!',
      html:              `
        <p style="font-size:0.95rem;color:#555;line-height:1.7;">
          <strong>${escHtml(firstName)} ${escHtml(lastName)}</strong>, your registration for
          <strong>${escHtml(data.event.title)}</strong> is confirmed!
        </p>
        <p style="font-size:0.85rem;color:#888;margin-top:10px;">
          Your ticket PDF should have downloaded automatically.<br>
          You can also download it anytime from
          <a href="tickets.html" style="color:var(--gold-dark);font-weight:600;">tickets.html</a>
          using your PUID: <strong>${puid}</strong>.
        </p>`,
      confirmButtonText: 'Great, thanks!',
      confirmButtonColor:'#c2971a',
      showCloseButton:   true,
      customClass:       { popup: 'csap-swal' },
    });

  } catch (err) {
    errEl.textContent   = err.message || 'Registration failed. Please try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-ticket"></i> Submit Registration';
  }
}

// ── Helpers ───────────────────────────────────────────
function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function escHtml(s)    { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escJs(s)      { return String(s).replace(/'/g,"\\'"); }
