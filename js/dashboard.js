// =====================================================
// CSAP - dashboard.js
// Event dashboard backed by Supabase.
// =====================================================

let dashboardCurrentUser = null;
let allEvents = [];

const CATEGORY_ICONS = {
  social: 'fa-champagne-glasses',
  cultural: 'fa-music',
  academic: 'fa-graduation-cap',
  food: 'fa-utensils',
  professional: 'fa-briefcase',
  fundraiser: 'fa-hand-holding-heart',
};
const CATEGORY_COLORS = {
  social: '#b85c00',
  cultural: '#004080',
  academic: '#006620',
  food: '#800040',
  professional: '#003087',
  fundraiser: '#7c3aed',
};
const STATUS_BADGE = {
  active: { bg: '#e6f9f0', color: '#15803d', border: '#bbf0d5', label: 'Active' },
  closed: { bg: '#fff8e0', color: '#92400e', border: '#fde68a', label: 'Closed' },
  cancelled: { bg: '#fff0f0', color: '#991b1b', border: '#fecaca', label: 'Cancelled' },
};

document.addEventListener('DOMContentLoaded', async () => {
  dashboardCurrentUser = window.CSAP_AUTH.requireSession();
  if (!dashboardCurrentUser) return;

  document.getElementById('headerUserName').textContent = dashboardCurrentUser.name;
  const badge = document.getElementById('roleBadge');
  const roleLabels = { admin: 'Admin', superuser: 'Superuser', user: 'User' };
  badge.textContent = roleLabels[dashboardCurrentUser.role] ?? dashboardCurrentUser.role;
  badge.style.display = 'inline-block';

  const canManage = window.CSAP_AUTH.canManage(dashboardCurrentUser);
  document.querySelectorAll('.manage-only').forEach(el => el.style.display = canManage ? '' : 'none');

  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'users') showUsersView();
  else showEventsView();

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

function showEventsView() {
  document.getElementById('viewEvents').style.display = '';
  document.getElementById('viewUsers').style.display = 'none';
  document.getElementById('sidebarEvents')?.classList.add('active');
  document.getElementById('sidebarUsers')?.classList.remove('active');
  loadEvents();
}

function showUsersView() {
  document.getElementById('viewEvents').style.display = 'none';
  document.getElementById('viewUsers').style.display = '';
  document.getElementById('sidebarUsers')?.classList.add('active');
  document.getElementById('sidebarEvents')?.classList.remove('active');
  if (typeof loadMembers === 'function') loadMembers();
}

async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '<div class="dash-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading events...</div>';

  try {
    allEvents = await window.CSAP_DB.getEvents({ admin: true });
    renderEventCards(allEvents);
    renderDashStats(allEvents);
  } catch (err) {
    grid.innerHTML = `<div class="dash-loading" style="color:#dc2626;">${escHtml(err.message || 'Failed to load events. Please refresh.')}</div>`;
  }
}

function renderDashStats(events) {
  document.getElementById('statTotalEvents').textContent = events.length;
  document.getElementById('statActiveEvents').textContent = events.filter(e => e.status === 'active').length;
  document.getElementById('statTotalReg').textContent = events.reduce((s, e) => s + (+e.registration_count || 0), 0);
  document.getElementById('statCheckedIn').textContent = events.reduce((s, e) => s + (+e.checked_in_count || 0), 0);
}

function renderEventCards(events) {
  const canManage = window.CSAP_AUTH.canManage(dashboardCurrentUser);
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
    const icon = CATEGORY_ICONS[ev.category] ?? 'fa-calendar';
    const catColor = CATEGORY_COLORS[ev.category] ?? '#374151';
    const sb = STATUS_BADGE[ev.status] ?? STATUS_BADGE.active;
    const regCount = +(ev.registration_count ?? 0);
    const checkedIn = +(ev.checked_in_count ?? 0);
    const tickets = [];
    if (+ev.has_entry_ticket) tickets.push('<span class="ev-chip chip-entry"><i class="fa-solid fa-ticket"></i> Entry</span>');
    if (+ev.has_food_ticket) tickets.push('<span class="ev-chip chip-food"><i class="fa-solid fa-utensils"></i> Food</span>');

    return `
    <div class="dash-event-card" id="evCard-${escHtml(ev.id)}">
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
          <div class="ev-date">${ev.event_date_formatted ?? 'Date TBD'} ${ev.event_time_formatted ? '&middot; ' + ev.event_time_formatted : ''}</div>
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
          <button class="action-btn" onclick="openEditModal('${escJs(ev.id)}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="action-btn danger" onclick="deleteEvent('${escJs(ev.id)}')"><i class="fa-solid fa-trash"></i></button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function openCreateModal() {
  document.getElementById('eventId').value = '';
  document.getElementById('evTitle').value = '';
  document.getElementById('evDescription').value = '';
  document.getElementById('evCategory').value = 'social';
  document.getElementById('evStatus').value = 'active';
  document.getElementById('evLocation').value = '';
  document.getElementById('evDate').value = '';
  document.getElementById('evClosesAt').value = '';
  document.getElementById('evHasEntry').checked = false;
  document.getElementById('evHasFood').checked = false;
  document.getElementById('eventModalTitle').textContent = 'Create Event';
  document.getElementById('eventFormSubmit').innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Create Event';
  document.getElementById('eventFormError').style.display = 'none';
  document.getElementById('eventModal').style.display = 'flex';
}

function openEditModal(id) {
  const ev = allEvents.find(e => String(e.id) === String(id));
  if (!ev) return;
  document.getElementById('eventId').value = ev.id;
  document.getElementById('evTitle').value = ev.title;
  document.getElementById('evDescription').value = ev.description ?? '';
  document.getElementById('evCategory').value = ev.category;
  document.getElementById('evStatus').value = ev.status;
  document.getElementById('evLocation').value = ev.location ?? '';
  document.getElementById('evDate').value = ev.event_date ? String(ev.event_date).slice(0, 16) : '';
  document.getElementById('evClosesAt').value = ev.registration_closes_at ? String(ev.registration_closes_at).slice(0, 16) : '';
  document.getElementById('evHasEntry').checked = !!+ev.has_entry_ticket;
  document.getElementById('evHasFood').checked = !!+ev.has_food_ticket;
  document.getElementById('eventModalTitle').textContent = 'Edit Event';
  document.getElementById('eventFormSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  document.getElementById('eventFormError').style.display = 'none';
  document.getElementById('eventModal').style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('eventModal').style.display = 'none';
}

async function submitEventForm(e) {
  e.preventDefault();
  const errEl = document.getElementById('eventFormError');
  const btn = document.getElementById('eventFormSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;

  const id = document.getElementById('eventId').value;
  const isEdit = !!id;
  const payload = {
    id,
    title: document.getElementById('evTitle').value.trim(),
    description: document.getElementById('evDescription').value.trim(),
    category: document.getElementById('evCategory').value,
    status: document.getElementById('evStatus').value,
    location: document.getElementById('evLocation').value.trim(),
    event_date: document.getElementById('evDate').value,
    registration_closes_at: document.getElementById('evClosesAt').value,
    has_entry_ticket: document.getElementById('evHasEntry').checked,
    has_food_ticket: document.getElementById('evHasFood').checked,
  };

  btn.innerHTML = isEdit ? '<i class="fa-solid fa-spinner fa-spin"></i> Saving...' : '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

  try {
    await window.CSAP_DB.saveEvent(payload);
    closeEventModal();
    await loadEvents();
  } catch (err) {
    errEl.textContent = err.message || 'Could not save event.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = isEdit ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fa-solid fa-calendar-plus"></i> Create Event';
  }
}

async function deleteEvent(id) {
  const ev = allEvents.find(e => String(e.id) === String(id));
  if (!ev) return;
  if (!confirm(`Delete "${ev.title}"? All registrations will also be removed. This cannot be undone.`)) return;

  try {
    await window.CSAP_DB.deleteEvent(id);
    await loadEvents();
  } catch (err) {
    alert(err.message || 'Could not delete event.');
  }
}

function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('eventModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeEventModal();
  });
});
