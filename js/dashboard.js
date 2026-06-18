// =====================================================
// CSAP — dashboard.js
// Event dashboard: session check, event cards, CRUD modals
// =====================================================

let currentUser = null;
let allEvents   = [];

const CATEGORY_ICONS = {
  social:       'fa-champagne-glasses',
  cultural:     'fa-music',
  academic:     'fa-graduation-cap',
  food:         'fa-utensils',
  professional: 'fa-briefcase',
  fundraiser:   'fa-hand-holding-heart',
};
const CATEGORY_COLORS = {
  social:       '#b85c00',
  cultural:     '#004080',
  academic:     '#006620',
  food:         '#800040',
  professional: '#003087',
  fundraiser:   '#7c3aed',
};
const STATUS_BADGE = {
  active:    { bg: '#e6f9f0', color: '#15803d', border: '#bbf0d5', label: 'Active'    },
  closed:    { bg: '#fff8e0', color: '#92400e', border: '#fde68a', label: 'Closed'    },
  cancelled: { bg: '#fff0f0', color: '#991b1b', border: '#fecaca', label: 'Cancelled' },
};

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify session
  try {
    const res = await fetch('php/me.php');
    if (!res.ok) { window.location.href = 'login.html?error=session'; return; }
    currentUser = await res.json();
  } catch {
    window.location.href = 'login.html?error=session';
    return;
  }

  // 2. Hydrate header
  document.getElementById('headerUserName').textContent = currentUser.name;
  const badge = document.getElementById('roleBadge');
  const roleLabels = { admin: 'Admin', superuser: 'Superuser', user: 'User' };
  badge.textContent   = roleLabels[currentUser.role] ?? currentUser.role;
  badge.style.display = 'inline-block';

  // 3. Show/hide role-gated elements
  const canManage = ['admin', 'superuser'].includes(currentUser.role);
  document.querySelectorAll('.manage-only').forEach(el => el.style.display = canManage ? '' : 'none');
  if (canManage) {
    document.getElementById('newRoleGroup')?.style && (document.getElementById('newRoleGroup').style.display = currentUser.role === 'admin' ? 'block' : 'none');
    document.getElementById('editRoleGroup')?.style && (document.getElementById('editRoleGroup').style.display = currentUser.role === 'admin' ? 'block' : 'none');
    // Show CSV import button (inherits manage-only visibility above, explicit for clarity)
    const csvBtn = document.getElementById('csvImportBtn');
    if (csvBtn) csvBtn.style.display = '';
  }

  // 4. Determine which view to show
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'users') {
    showUsersView();
  } else {
    showEventsView();
  }

  // Update sidebar active state
  document.getElementById('sidebarUsers')?.addEventListener('click', e => {
    e.preventDefault();
    history.pushState({}, '', '?tab=users');
    showUsersView();
  });
  document.getElementById('sidebarEvents')?.addEventListener('click', e => {
    e.preventDefault();
    history.pushState({}, '', '?');
    showEventsView();
  });
});

// ── View switcher ─────────────────────────────────────
function showEventsView() {
  document.getElementById('viewEvents').style.display = '';
  document.getElementById('viewUsers').style.display  = 'none';
  document.getElementById('sidebarEvents')?.classList.add('active');
  document.getElementById('sidebarUsers')?.classList.remove('active');
  loadEvents();
}

function showUsersView() {
  document.getElementById('viewEvents').style.display = 'none';
  document.getElementById('viewUsers').style.display  = '';
  document.getElementById('sidebarUsers')?.classList.add('active');
  document.getElementById('sidebarEvents')?.classList.remove('active');
  // Trigger members.js bootstrap (already in DOM)
  if (typeof loadMembers === 'function') loadMembers();
}

// ── Load Events ───────────────────────────────────────
async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '<div class="dash-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading events…</div>';

  try {
    const res  = await fetch('php/events/get-events.php?admin=1');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bad response');
    allEvents = data;
    renderEventCards(allEvents);
    renderDashStats(allEvents);
  } catch {
    grid.innerHTML = '<div class="dash-loading" style="color:#dc2626;">Failed to load events. Please refresh.</div>';
  }
}

function renderDashStats(events) {
  document.getElementById('statTotalEvents').textContent  = events.length;
  document.getElementById('statActiveEvents').textContent = events.filter(e => e.status === 'active').length;
  document.getElementById('statTotalReg').textContent     = events.reduce((s, e) => s + (+e.registration_count || 0), 0);
  document.getElementById('statCheckedIn').textContent    = events.reduce((s, e) => s + (+e.checked_in_count  || 0), 0);
}

function renderEventCards(events) {
  const canManage = ['admin', 'superuser'].includes(currentUser?.role);
  const grid = document.getElementById('eventsGrid');

  if (!events.length) {
    grid.innerHTML = `
      <div class="dash-empty">
        <i class="fa-solid fa-calendar-xmark"></i>
        <p>No events yet.</p>
        ${canManage ? '<button class="btn btn-gold" onclick="openCreateModal()"><i class="fa-solid fa-plus"></i> Create your first event</button>' : ''}
      </div>`;
    return;
  }

  grid.innerHTML = events.map(ev => {
    const icon      = CATEGORY_ICONS[ev.category] ?? 'fa-calendar';
    const catColor  = CATEGORY_COLORS[ev.category] ?? '#374151';
    const sb        = STATUS_BADGE[ev.status] ?? STATUS_BADGE.active;
    const regCount  = +(ev.registration_count ?? 0);
    const checkedIn = +(ev.checked_in_count   ?? 0);
    const tickets   = [];
    if (+ev.has_entry_ticket) tickets.push('<span class="ev-chip chip-entry"><i class="fa-solid fa-ticket"></i> Entry</span>');
    if (+ev.has_food_ticket)  tickets.push('<span class="ev-chip chip-food"><i class="fa-solid fa-utensils"></i> Food</span>');

    return `
    <div class="dash-event-card" id="evCard-${ev.id}">
      <div class="dec-header" style="background:${catColor}18;border-bottom:1px solid ${catColor}30;">
        <i class="fa-solid ${icon}" style="color:${catColor};font-size:1.6rem;"></i>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ev-cat-tag" style="color:${catColor};background:${catColor}20;border:1px solid ${catColor}40;">
              ${capitalize(ev.category)}
            </span>
            <span class="ev-status-badge" style="color:${sb.color};background:${sb.bg};border:1px solid ${sb.border};">
              ${sb.label}
            </span>
          </div>
          <div class="ev-date">${ev.event_date_formatted ?? 'Date TBD'} · ${ev.event_time_formatted ?? ''}</div>
        </div>
      </div>

      <div class="ev-body">
        <h3 class="ev-title">${escHtml(ev.title)}</h3>
        ${ev.location ? `<div class="ev-loc"><i class="fa-solid fa-location-dot"></i> ${escHtml(ev.location)}</div>` : ''}
        ${ev.description ? `<p class="ev-desc">${escHtml(ev.description)}</p>` : ''}
        <div class="ev-chips">${tickets.join('') || '<span style="color:var(--gray-300);font-size:0.8rem;">No tickets configured</span>'}</div>
      </div>

      <div class="ev-footer">
        <div class="ev-stats">
          <span><i class="fa-solid fa-users"></i> ${regCount} registered</span>
          <span><i class="fa-solid fa-circle-check" style="color:#16a34a;"></i> ${checkedIn} checked in</span>
        </div>
        ${canManage ? `
        <div class="ev-actions">
          <button class="action-btn" onclick="openEditModal(${ev.id})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="action-btn danger" onclick="deleteEvent(${ev.id})"><i class="fa-solid fa-trash"></i></button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Create / Edit Modal ───────────────────────────────
function openCreateModal() {
  document.getElementById('eventId').value    = '';
  document.getElementById('evTitle').value    = '';
  document.getElementById('evDescription').value = '';
  document.getElementById('evCategory').value = 'social';
  document.getElementById('evStatus').value   = 'active';
  document.getElementById('evLocation').value = '';
  document.getElementById('evDate').value     = '';
  document.getElementById('evClosesAt').value = '';
  document.getElementById('evHasEntry').checked = false;
  document.getElementById('evHasFood').checked  = false;
  document.getElementById('eventModalTitle').textContent  = 'Create Event';
  document.getElementById('eventFormSubmit').innerHTML    = '<i class="fa-solid fa-calendar-plus"></i> Create Event';
  document.getElementById('eventFormError').style.display = 'none';
  document.getElementById('eventModal').style.display     = 'flex';
}

function openEditModal(id) {
  const ev = allEvents.find(e => +e.id === id);
  if (!ev) return;
  document.getElementById('eventId').value    = ev.id;
  document.getElementById('evTitle').value    = ev.title;
  document.getElementById('evDescription').value = ev.description ?? '';
  document.getElementById('evCategory').value = ev.category;
  document.getElementById('evStatus').value   = ev.status;
  document.getElementById('evLocation').value = ev.location ?? '';
  // Format datetime-local (YYYY-MM-DDTHH:MM)
  document.getElementById('evDate').value     = ev.event_date ? ev.event_date.slice(0, 16) : '';
  document.getElementById('evClosesAt').value = ev.registration_closes_at ? ev.registration_closes_at.slice(0, 16) : '';
  document.getElementById('evHasEntry').checked = !!+ev.has_entry_ticket;
  document.getElementById('evHasFood').checked  = !!+ev.has_food_ticket;
  document.getElementById('eventModalTitle').textContent  = 'Edit Event';
  document.getElementById('eventFormSubmit').innerHTML    = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  document.getElementById('eventFormError').style.display = 'none';
  document.getElementById('eventModal').style.display     = 'flex';
}

function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none';
}

async function submitEventForm(e) {
  e.preventDefault();
  const errEl = document.getElementById('eventFormError');
  const btn   = document.getElementById('eventFormSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;

  const id     = document.getElementById('eventId').value;
  const isEdit = !!id;
  const endpoint = isEdit ? 'php/events/update-event.php' : 'php/events/create-event.php';

  const body = new FormData();
  if (isEdit) body.append('id', id);
  body.append('title',       document.getElementById('evTitle').value.trim());
  body.append('description', document.getElementById('evDescription').value.trim());
  body.append('category',    document.getElementById('evCategory').value);
  body.append('status',      document.getElementById('evStatus').value);
  body.append('location',    document.getElementById('evLocation').value.trim());
  body.append('event_date',  document.getElementById('evDate').value);
  body.append('registration_closes_at', document.getElementById('evClosesAt').value);
  if (document.getElementById('evHasEntry').checked) body.append('has_entry_ticket', '1');
  if (document.getElementById('evHasFood').checked)  body.append('has_food_ticket',  '1');

    btn.innerHTML = isEdit ? '<i class="fa-solid fa-spinner fa-spin"></i> Saving…' : '<i class="fa-solid fa-spinner fa-spin"></i> Creating…';

  try {
    const res  = await fetch(endpoint, { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error');
    closeEventModal();
    await loadEvents();
  } catch (err) {
    errEl.textContent   = err.message || 'Could not save event.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled  = false;
    btn.innerHTML = isEdit ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fa-solid fa-calendar-plus"></i> Create Event';
  }
}

async function deleteEvent(id) {
  const ev = allEvents.find(e => +e.id === id);
  if (!ev) return;
  if (!confirm(`Delete "${ev.title}"? All registrations will also be removed. This cannot be undone.`)) return;

  try {
    const body = new FormData();
    body.append('id', id);
    const res  = await fetch('php/events/delete-event.php', { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error');
    await loadEvents();
  } catch (err) {
    alert(err.message || 'Could not delete event.');
  }
}

// ── Helpers ───────────────────────────────────────────
function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close modals on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('eventModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEventModal();
  });
});
