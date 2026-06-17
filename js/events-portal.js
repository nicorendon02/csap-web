// =====================================================
// CSAP - events-portal.js
// Public events page: Supabase events + registration form.
// =====================================================

const CATEGORY_ICONS = {
  social: 'fa-champagne-glasses',
  cultural: 'fa-music',
  academic: 'fa-graduation-cap',
  food: 'fa-utensils',
  professional: 'fa-briefcase',
  fundraiser: 'fa-hand-holding-heart',
};

let guestCount = 0;

document.addEventListener('DOMContentLoaded', loadPublicEvents);

async function loadPublicEvents() {
  const section = document.getElementById('eventsSection');
  const empty = document.getElementById('eventsEmpty');
  const follow = document.getElementById('eventsFollowSection');
  const grid = document.getElementById('eventsGrid');

  if (!window.CSAP_DB?.isConfigured?.()) {
    section.style.display = 'none';
    follow.style.display = 'none';
    empty.style.display = '';
    return;
  }

  try {
    const events = await window.CSAP_DB.getEvents();

    if (!Array.isArray(events) || events.length === 0) {
      section.style.display = 'none';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    follow.style.display = '';
    section.style.display = '';

    grid.innerHTML = events.map(ev => {
      const icon = CATEGORY_ICONS[ev.category] ?? 'fa-calendar';
      const tagClass = 'tag-' + (ev.category || 'social');
      const open = +ev.registration_open === 1;
      const tickets = [];
      if (+ev.has_entry_ticket) tickets.push('<span class="ticket-chip chip-entry"><i class="fa-solid fa-ticket"></i> Entry</span>');
      if (+ev.has_food_ticket) tickets.push('<span class="ticket-chip chip-food"><i class="fa-solid fa-utensils"></i> Food</span>');

      const registerBtn = open
        ? `<button class="btn-register" onclick="openRegModal('${escJs(ev.id)}', '${escJs(ev.title)}')">
             Register &#8594;
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

    requestAnimationFrame(() =>
      document.querySelectorAll('.event-full-card.fade-in').forEach(el => {
        setTimeout(() => el.classList.add('visible'), 50);
      })
    );
  } catch (err) {
    section.style.display = 'none';
    follow.style.display = 'none';
    empty.style.display = '';
    console.warn('[CSAP] Events failed to load:', err);
  }
}

function openRegModal(eventId, eventTitle) {
  guestCount = 0;
  document.getElementById('regEventId').value = eventId;
  document.getElementById('regEventName').textContent = eventTitle;
  document.getElementById('regEmail').value = '';
  document.getElementById('regFirst').value = '';
  document.getElementById('regLast').value = '';
  document.getElementById('guestVal').textContent = '0';
  document.getElementById('regPolicy').checked = false;
  document.getElementById('regError').style.display = 'none';
  document.getElementById('regEmailHint').textContent = '';
  document.getElementById('regEmailHint').className = 'reg-field-hint';
  document.getElementById('regForm').querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  document.getElementById('regModal').style.display = 'flex';
  document.getElementById('regEmail').focus();
}

function closeRegModal() {
  document.getElementById('regModal').style.display = 'none';
}

function validateRegEmail(input) {
  const hint = document.getElementById('regEmailHint');
  const val = input.value.trim();
  input.classList.remove('error');
  hint.className = 'reg-field-hint';

  if (val.length === 0) {
    hint.textContent = '';
  } else if (!isValidEmail(val)) {
    hint.textContent = 'Enter a valid email address.';
    hint.className = 'reg-field-hint warn';
  } else {
    hint.textContent = 'Looks good!';
    hint.className = 'reg-field-hint ok';
  }
}

function adjustGuests(delta) {
  guestCount = Math.min(5, Math.max(0, guestCount + delta));
  document.getElementById('guestVal').textContent = guestCount;
  document.getElementById('guestMinus').disabled = guestCount === 0;
  document.getElementById('guestPlus').disabled = guestCount === 5;
}

async function submitRegistration(e) {
  e.preventDefault();
  const errEl = document.getElementById('regError');
  const btn = document.getElementById('regSubmitBtn');
  errEl.style.display = 'none';

  const email = document.getElementById('regEmail').value.trim();
  const firstName = document.getElementById('regFirst').value.trim();
  const lastName = document.getElementById('regLast').value.trim();
  const eventId = document.getElementById('regEventId').value;
  const policy = document.getElementById('regPolicy').checked;

  if (!isValidEmail(email)) {
    errEl.textContent = 'Enter a valid email address.';
    errEl.style.display = 'block';
    document.getElementById('regEmail').classList.add('error');
    return;
  }
  if (!policy) {
    errEl.textContent = 'You must agree to the data handling policy to continue.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  try {
    const data = await window.CSAP_DB.registerForEvent({
      event_id: eventId,
      email,
      first_name: firstName,
      last_name: lastName,
      guests: guestCount,
    });

    closeRegModal();
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating ticket...';

    try {
      await generateTicketPDF(data.registration, data.event);
    } catch (pdfErr) {
      console.warn('PDF generation error:', pdfErr);
    }

    Swal.fire({
      icon: 'success',
      title: 'You\'re registered!',
      html: `
        <p style="font-size:0.95rem;color:#555;line-height:1.7;">
          <strong>${escHtml(firstName)} ${escHtml(lastName)}</strong>, your registration for
          <strong>${escHtml(data.event.title)}</strong> is confirmed!
        </p>
        <p style="font-size:0.85rem;color:#888;margin-top:10px;">
          Your ticket PDF should have downloaded automatically.<br>
          You can also download it anytime from
          <a href="tickets.html" style="color:var(--gold-dark);font-weight:600;">tickets.html</a>
          using your email: <strong>${escHtml(email)}</strong>.
        </p>`,
      confirmButtonText: 'Great, thanks!',
      confirmButtonColor: '#c2971a',
      showCloseButton: true,
      customClass: { popup: 'csap-swal' },
    });
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed. Please try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-ticket"></i> Submit Registration';
  }
}

function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase()); }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
