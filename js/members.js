// =====================================================
// CSAP — members.js
// Members portal: session check, role-gated UI, real PHP API
// =====================================================

let members  = [];
let filtered = [];
let currentUser = null;   // { id, name, email, role }
const PER_PAGE  = 8;
let currentPage = 1;

// ── Role helpers ──────────────────────────────────────
const canManage    = () => ['admin', 'superuser'].includes(currentUser?.role);
const canPromote   = () => currentUser?.role === 'admin';
const roleBadgeMap = { admin: 'Admin', superuser: 'Superuser', user: 'User' };
const roleColorMap = {
  admin:     '#003087',
  superuser: '#c29a12',
  user:      '#374151',
};

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify session — redirect to login if not authenticated
  try {
    const res = await fetch('php/me.php');
    if (!res.ok) {
      window.location.href = 'login.html?error=session';
      return;
    }
    currentUser = await res.json();
  } catch {
    window.location.href = 'login.html?error=session';
    return;
  }

  // 2. Hydrate header
  const nameEl  = document.getElementById('headerUserName');
  const badgeEl = document.getElementById('roleBadge');
  if (nameEl)  nameEl.textContent  = currentUser.name;
  if (badgeEl) {
    badgeEl.textContent   = roleBadgeMap[currentUser.role] ?? currentUser.role;
    badgeEl.style.display = 'inline-block';
  }

  // 3. Show/hide role-gated controls
  applyRoleGating();

  // 4. Load members from PHP
  await loadMembers();

  // 5. Modal overlay close
  document.getElementById('addModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('editModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
});

function applyRoleGating() {
  // Add button (admin + superuser)
  const addBtn = document.getElementById('addMemberBtn');
  if (addBtn) addBtn.style.display = canManage() ? 'inline-flex' : 'none';

  // Role selector in Add modal (admin only)
  const newRoleGroup = document.getElementById('newRoleGroup');
  if (newRoleGroup) newRoleGroup.style.display = canPromote() ? 'block' : 'none';

  // Role selector in Edit modal (admin only)
  const editRoleGroup = document.getElementById('editRoleGroup');
  if (editRoleGroup) editRoleGroup.style.display = canPromote() ? 'block' : 'none';

  // Actions column header (admin + superuser)
  const actionsHeader = document.getElementById('actionsHeader');
  if (actionsHeader) actionsHeader.textContent = canManage() ? 'ACTIONS' : '';
}

// ── Load & Render ─────────────────────────────────────
async function loadMembers() {
  try {
    const res  = await fetch('php/get-members.php');
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bad data');
    members  = data;
    filtered = [...members];
    currentPage = 1;
    renderTable();
  } catch {
    const tbody = document.getElementById('membersTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#dc2626;">
        Failed to load members. Please refresh.</td></tr>`;
    }
  }
}

function renderTable() {
  updateStats();
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  const start    = (currentPage - 1) * PER_PAGE;
  const pageData = filtered.slice(start, start + PER_PAGE);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--gray-500);">No members found.</td></tr>`;
    renderPagination();
    return;
  }

  tbody.innerHTML = pageData.map(m => {
    const isMe = m.id === currentUser?.id;
    return `
    <tr id="row-${m.id}">
      <td><input type="checkbox" class="row-check" data-id="${m.id}" ${isMe ? 'disabled' : ''} /></td>
      <td>
        <div class="member-cell">
          <div class="member-avatar" style="background:${avatarColor(m.name)}">${initials(m.name)}</div>
          <div>
            <div class="member-name">${escHtml(m.name)}${isMe ? ' <span style="font-size:0.72rem;color:var(--gray-500);">(you)</span>' : ''}</div>
            <div class="member-email">${escHtml(m.email)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge" style="background:${roleColorMap[m.role] ?? '#374151'}1a;
              color:${roleColorMap[m.role] ?? '#374151'}; border:1px solid ${roleColorMap[m.role] ?? '#374151'}33;">
          ${escHtml(roleBadgeMap[m.role] ?? capitalize(m.role))}
        </span>
      </td>
      <td><span class="badge badge-${m.status}">${capitalize(m.status)}</span></td>
      <td style="font-size:0.82rem; color:var(--gray-500);">${escHtml(m.joined ?? '—')}</td>
      <td style="font-size:0.82rem; color:var(--gray-500);">${escHtml(m.last_login ?? 'Never')}</td>
      <td>
        ${canManage() && !isMe ? `
          <button class="action-btn" onclick="showRowMenu(${m.id}, '${escHtml(m.role)}', this)"
                  style="padding:4px 8px; font-size:1rem; border:none;" title="Actions">&#8943;</button>
        ` : ''}
      </td>
    </tr>`;
  }).join('');

  renderPagination();
}

function updateStats() {
  document.getElementById('statTotalNum').textContent     = members.length;
  document.getElementById('statActiveNum').textContent    = members.filter(m => m.status === 'active').length;
  document.getElementById('statPendingNum').textContent   = members.filter(m => m.status === 'pending').length;
  document.getElementById('statSuspendedNum').textContent = members.filter(m => m.status === 'suspended').length;
  const tc = document.getElementById('statTotalCount');
  if (tc) tc.textContent = members.length.toLocaleString();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pag   = document.getElementById('pagination');
  if (!pag) return;
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===total?'disabled':''}>›</button>`;
  pag.innerHTML = html;
}

function goPage(n) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (n < 1 || n > total) return;
  currentPage = n;
  renderTable();
}

// ── Filter / Search ───────────────────────────────────
function filterMembers() {
  const q      = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const role   = document.getElementById('roleFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  filtered = members.filter(m => {
    const matchQ = !q      || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchR = !role   || m.role   === role;
    const matchS = !status || m.status === status;
    return matchQ && matchR && matchS;
  });
  currentPage = 1;
  renderTable();
}

// ── Row Action Menu ───────────────────────────────────
function showRowMenu(id, role, btn) {
  document.querySelectorAll('.row-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'row-menu';
  menu.style.cssText = 'position:fixed; background:#fff; border:1px solid var(--border); border-radius:10px; box-shadow:var(--shadow-lg); padding:6px; min-width:150px; z-index:999;';

  const editBtn = `<button onclick="openEditModal(${id}); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:var(--gray-700);background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-pen-to-square"></i> Edit
  </button>`;

  const suspendBtn = `<button onclick="suspendMember(${id}); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:#b45309;background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-ban"></i> Suspend
  </button>`;

  const deleteBtn = `<button onclick="deleteMember(${id}); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:#dc2626;background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-trash"></i> Delete
  </button>`;

  menu.innerHTML = editBtn + suspendBtn + deleteBtn;
  const rect = btn.getBoundingClientRect();
  menu.style.top  = rect.bottom + 4 + 'px';
  menu.style.left = rect.left - 110 + 'px';
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

// ── Add Member ────────────────────────────────────────
function showAddModal() {
  document.getElementById('addModal').style.display = 'flex';
  document.getElementById('addSuccessMsg').style.display = 'none';
  document.getElementById('addErrorMsg').style.display   = 'none';
  document.getElementById('addMemberForm').reset();
}
function closeModal() {
  document.getElementById('addModal').style.display = 'none';
}

async function submitAddMember(e) {
  e.preventDefault();
  const errEl = document.getElementById('addErrorMsg');
  const btn   = document.getElementById('addMemberSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Adding…';

  const body = new FormData();
  body.append('name',   document.getElementById('newName').value.trim());
  body.append('email',  document.getElementById('newEmail').value.trim());
  body.append('status', document.getElementById('newStatus').value);
  if (canPromote()) body.append('role', document.getElementById('newRole').value);

  try {
    const res  = await fetch('php/add-member.php', { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    // Show temp password
    document.getElementById('addTmpPass').textContent = data.temp_password;
    document.getElementById('addSuccessMsg').style.display = 'block';
    document.getElementById('addMemberForm').reset();

    // Reload table
    await loadMembers();
  } catch (err) {
    errEl.textContent   = err.message || 'Could not add user.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add User';
  }
}

// ── Edit Member ───────────────────────────────────────
function openEditModal(id) {
  const m = members.find(m => m.id === id);
  if (!m) return;
  document.getElementById('editId').value    = m.id;
  document.getElementById('editName').value  = m.name;
  document.getElementById('editEmail').value = m.email;
  document.getElementById('editStatus').value= m.status;
  if (canPromote()) {
    document.getElementById('editRole').value = m.role;
    document.getElementById('editRoleGroup').style.display = 'block';
  }
  document.getElementById('editErrorMsg').style.display = 'none';
  document.getElementById('editModal').style.display    = 'flex';
}
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function submitEditMember(e) {
  e.preventDefault();
  const errEl = document.getElementById('editErrorMsg');
  const btn   = document.getElementById('editMemberSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const body = new FormData();
  body.append('id',     document.getElementById('editId').value);
  body.append('name',   document.getElementById('editName').value.trim());
  body.append('email',  document.getElementById('editEmail').value.trim());
  body.append('status', document.getElementById('editStatus').value);
  if (canPromote()) body.append('role', document.getElementById('editRole').value);

  try {
    const res  = await fetch('php/update-member.php', { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');
    closeEditModal();
    await loadMembers();
  } catch (err) {
    errEl.textContent   = err.message || 'Could not save changes.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── Delete / Suspend ──────────────────────────────────
async function suspendMember(id) {
  const m = members.find(m => m.id === id);
  if (!m || !confirm(`Suspend ${m.name}?`)) return;
  await postDelete(id, false);
}

async function deleteMember(id) {
  const m = members.find(m => m.id === id);
  if (!m || !confirm(`Permanently delete ${m.name}? This cannot be undone.`)) return;
  await postDelete(id, true);
}

async function postDelete(id, hard) {
  const body = new FormData();
  body.append('id',   id);
  body.append('hard', hard ? '1' : '0');
  try {
    const res  = await fetch('php/delete-member.php', { method: 'POST', body });
    const data = await res.json();
    if (!res.ok || data.error) { alert(data.error || 'Action failed.'); return; }
    await loadMembers();
  } catch { alert('Network error. Please try again.'); }
}

// ── Helpers ───────────────────────────────────────────
function toggleSelectAll(cb) {
  document.querySelectorAll('.row-check:not([disabled])').forEach(c => c.checked = cb.checked);
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
const AVATAR_COLORS = ['#c29a12','#003087','#CE1126','#2d6a4f','#6d3d91','#c0392b','#1a535c'];
function avatarColor(name) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
