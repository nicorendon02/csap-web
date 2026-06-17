// =====================================================
// CSAP - members.js
// User portal backed by Supabase.
// =====================================================

let members = [];
let filtered = [];
let membersCurrentUser = null;
const PER_PAGE = 8;
let currentPage = 1;

const canManageUsers = () => window.CSAP_AUTH.canManage(membersCurrentUser);
const canPromoteUsers = () => window.CSAP_AUTH.canPromote(membersCurrentUser);
const roleBadgeMap = { admin: 'Admin', superuser: 'Superuser', user: 'User' };
const roleColorMap = {
  admin: '#003087',
  superuser: '#c29a12',
  user: '#374151',
};

document.addEventListener('DOMContentLoaded', async () => {
  membersCurrentUser = window.CSAP_AUTH.requireSession();
  if (!membersCurrentUser) return;

  const nameEl = document.getElementById('headerUserName');
  const badgeEl = document.getElementById('roleBadge');
  if (nameEl) nameEl.textContent = membersCurrentUser.name;
  if (badgeEl) {
    badgeEl.textContent = roleBadgeMap[membersCurrentUser.role] ?? membersCurrentUser.role;
    badgeEl.style.display = 'inline-block';
  }

  applyRoleGating();
  await loadMembers();

  document.getElementById('addModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('editModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeUserEditModal();
  });

  document.getElementById('newLastNames')?.addEventListener('input', e => {
    e.target.value = window.CSAP_AUTH.formatLastNamesInput(e.target.value);
  });
  document.getElementById('editLastNames')?.addEventListener('input', e => {
    e.target.value = window.CSAP_AUTH.formatLastNamesInput(e.target.value);
  });
});

function applyRoleGating() {
  const addBtn = document.getElementById('addUserBtn') || document.getElementById('addMemberBtn');
  if (addBtn) addBtn.style.display = canManageUsers() ? 'inline-flex' : 'none';

  const newRoleGroup = document.getElementById('newRoleGroup');
  if (newRoleGroup) newRoleGroup.style.display = canPromoteUsers() ? 'block' : 'none';

  const editRoleGroup = document.getElementById('editRoleGroup');
  if (editRoleGroup) editRoleGroup.style.display = canPromoteUsers() ? 'block' : 'none';

  const actionsHeader = document.getElementById('actionsHeader');
  if (actionsHeader) actionsHeader.textContent = canManageUsers() ? 'ACTIONS' : '';
}

async function loadMembers() {
  try {
    members = await window.CSAP_DB.getMembers();
    filtered = [...members];
    currentPage = 1;
    renderTable();
  } catch (err) {
    const tbody = document.getElementById('membersTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#dc2626;">
        ${escHtml(err.message || 'Failed to load members. Please refresh.')}</td></tr>`;
    }
  }
}

function renderTable() {
  updateStats();
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * PER_PAGE;
  const pageData = filtered.slice(start, start + PER_PAGE);

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--gray-500);">No members found.</td></tr>';
    renderPagination();
    return;
  }

  tbody.innerHTML = pageData.map(m => {
    const isMe = m.id === membersCurrentUser?.id;
    return `
    <tr id="row-${escHtml(m.id)}">
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
      <td><span class="badge badge-${escHtml(m.status)}">${capitalize(m.status)}</span></td>
      <td style="font-size:0.82rem; color:var(--gray-500);">${escHtml(m.joined || '-')}</td>
      <td style="font-size:0.82rem; color:var(--gray-500);">${escHtml(m.last_login || 'Never')}</td>
      <td>
        ${canManageUsers() && !isMe ? `
          <button class="action-btn" onclick="showRowMenu('${escJs(m.id)}', this)"
                  style="padding:4px 8px; font-size:1rem; border:none;" title="Actions">&#8943;</button>
        ` : ''}
      </td>
    </tr>`;
  }).join('');

  renderPagination();
}

function updateStats() {
  const total = document.getElementById('statTotalNum');
  const active = document.getElementById('statActiveNum');
  const pending = document.getElementById('statPendingNum');
  const suspended = document.getElementById('statSuspendedNum');
  const totalCount = document.getElementById('statTotalCount');

  if (total) total.textContent = members.length;
  if (active) active.textContent = members.filter(m => m.status === 'active').length;
  if (pending) pending.textContent = members.filter(m => m.status === 'pending').length;
  if (suspended) suspended.textContent = members.filter(m => m.status === 'suspended').length;
  if (totalCount) totalCount.textContent = members.length.toLocaleString();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pag = document.getElementById('pagination');
  if (!pag) return;
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>›</button>`;
  pag.innerHTML = html;
}

function goPage(n) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (n < 1 || n > total) return;
  currentPage = n;
  renderTable();
}

function filterMembers() {
  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const role = document.getElementById('roleFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  filtered = members.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchR = !role || m.role === role;
    const matchS = !status || m.status === status;
    return matchQ && matchR && matchS;
  });
  currentPage = 1;
  renderTable();
}

function showRowMenu(id, btn) {
  document.querySelectorAll('.row-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'row-menu';
  menu.style.cssText = 'position:fixed; background:#fff; border:1px solid var(--border); border-radius:10px; box-shadow:var(--shadow-lg); padding:6px; min-width:150px; z-index:999;';

  const editBtn = `<button onclick="openUserEditModal('${escJs(id)}'); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:var(--gray-700);background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-pen-to-square"></i> Edit
  </button>`;

  const suspendBtn = `<button onclick="suspendMember('${escJs(id)}'); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:#b45309;background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-ban"></i> Suspend
  </button>`;

  const deleteBtn = `<button onclick="deleteMember('${escJs(id)}'); this.closest('.row-menu').remove();"
    style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:0.85rem;
    color:#dc2626;background:none;border:none;cursor:pointer;border-radius:6px;
    font-family:Inter,sans-serif;">
    <i class="fa-solid fa-trash"></i> Delete
  </button>`;

  menu.innerHTML = editBtn + suspendBtn + deleteBtn;
  const rect = btn.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + 'px';
  menu.style.left = rect.left - 110 + 'px';
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

function showAddModal() {
  document.getElementById('addModal').style.display = 'flex';
  document.getElementById('addSuccessMsg').style.display = 'none';
  document.getElementById('addErrorMsg').style.display = 'none';
  document.getElementById('addMemberForm').reset();
}

function closeModal() {
  document.getElementById('addModal').style.display = 'none';
}

async function submitAddMember(e) {
  e.preventDefault();
  const errEl = document.getElementById('addErrorMsg');
  const btn = document.getElementById('addMemberSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await window.CSAP_DB.addMember({
      name: document.getElementById('newName').value.trim(),
      email: document.getElementById('newEmail').value.trim(),
      lastNames: document.getElementById('newLastNames').value.trim(),
      status: document.getElementById('newStatus').value,
      role: canPromoteUsers() ? document.getElementById('newRole').value : 'user',
    });

    document.getElementById('addSuccessMsg').style.display = 'block';
    document.getElementById('addMemberForm').reset();
    await loadMembers();
  } catch (err) {
    errEl.textContent = err.message || 'Could not add user.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add User';
  }
}

function openUserEditModal(id) {
  const m = members.find(member => member.id === id);
  if (!m) return;
  document.getElementById('editId').value = m.id;
  document.getElementById('editName').value = m.name;
  document.getElementById('editEmail').value = m.email;
  document.getElementById('editLastNames').value = '';
  document.getElementById('editStatus').value = m.status;
  if (canPromoteUsers()) {
    document.getElementById('editRole').value = m.role;
    document.getElementById('editRoleGroup').style.display = 'block';
  }
  document.getElementById('editErrorMsg').style.display = 'none';
  document.getElementById('editModal').style.display = 'flex';
}

function closeUserEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function submitEditMember(e) {
  e.preventDefault();
  const errEl = document.getElementById('editErrorMsg');
  const btn = document.getElementById('editMemberSubmit');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    await window.CSAP_DB.updateMember({
      id: document.getElementById('editId').value,
      name: document.getElementById('editName').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      lastNames: document.getElementById('editLastNames').value.trim(),
      status: document.getElementById('editStatus').value,
      role: canPromoteUsers() ? document.getElementById('editRole').value : undefined,
    });
    closeUserEditModal();
    await loadMembers();
  } catch (err) {
    errEl.textContent = err.message || 'Could not save changes.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

async function suspendMember(id) {
  const m = members.find(member => member.id === id);
  if (!m || !confirm(`Suspend ${m.name}?`)) return;
  await postDelete(id, false);
}

async function deleteMember(id) {
  const m = members.find(member => member.id === id);
  if (!m || !confirm(`Permanently delete ${m.name}? This cannot be undone.`)) return;
  await postDelete(id, true);
}

async function postDelete(id, hard) {
  try {
    await window.CSAP_DB.deleteMember(id, hard);
    await loadMembers();
  } catch (err) {
    alert(err.message || 'Action failed.');
  }
}

function initials(name) {
  return String(name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';
}

const AVATAR_COLORS = ['#c29a12', '#003087', '#CE1126', '#2d6a4f', '#6d3d91', '#c0392b', '#1a535c'];
function avatarColor(name) {
  return AVATAR_COLORS[(String(name || 'U').charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function capitalize(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
