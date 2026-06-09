// =====================================================
// CSAP — members.js
// Admin dashboard: members table, search, filter, pagination
// Ready for Hostinger PHP/SQL integration
// =====================================================

// ── Sample data (replace with PHP fetch when ready) ─
// TODO: Replace with: fetch('php/get-members.php').then(r=>r.json()).then(data => { members = data; renderTable(); });
const SAMPLE_MEMBERS = [
  { id: 1,  name: 'Pablo Rodríguez',    email: 'rodrig42@purdue.edu',  role: 'board',  status: 'active',    joined: '2023-08-20', active: true,  rating: 4.7, lastLogin: '20 Nov 2024' },
  { id: 2,  name: 'JuanJo Martínez',    email: 'marti88@purdue.edu',   role: 'board',  status: 'active',    joined: '2023-08-20', active: true,  rating: 4.9, lastLogin: '19 Nov 2024' },
  { id: 3,  name: 'Angelly Vásquez',    email: 'vasque12@purdue.edu',  role: 'board',  status: 'active',    joined: '2023-08-21', active: true,  rating: 5.0, lastLogin: '18 Nov 2024' },
  { id: 4,  name: 'Ricardo Peña',       email: 'pena99@purdue.edu',    role: 'board',  status: 'active',    joined: '2023-08-21', active: true,  rating: 4.8, lastLogin: '17 Nov 2024' },
  { id: 5,  name: 'Nicolas Gómez',      email: 'gomez77@purdue.edu',   role: 'board',  status: 'active',    joined: '2023-08-22', active: true,  rating: 4.6, lastLogin: '21 Nov 2024' },
  { id: 6,  name: 'Jorge Castillo',     email: 'casti55@purdue.edu',   role: 'board',  status: 'active',    joined: '2023-08-22', active: true,  rating: 4.5, lastLogin: '15 Nov 2024' },
  { id: 7,  name: 'Valentina López',    email: 'lopezv@purdue.edu',    role: 'member', status: 'active',    joined: '2024-01-15', active: true,  rating: 3.9, lastLogin: '23 Nov 2024' },
  { id: 8,  name: 'Sebastián Torres',   email: 'torress@purdue.edu',   role: 'member', status: 'active',    joined: '2024-01-16', active: true,  rating: 4.2, lastLogin: '20 Nov 2024' },
  { id: 9,  name: 'Daniela Herrera',    email: 'herrad@purdue.edu',    role: 'member', status: 'active',    joined: '2024-02-01', active: false, rating: 4.1, lastLogin: '18 Nov 2024' },
  { id: 10, name: 'Camilo Jiménez',     email: 'jimenez@purdue.edu',   role: 'member', status: 'pending',   joined: '2025-01-10', active: false, rating: null, lastLogin: 'Never' },
  { id: 11, name: 'Isabella Vargas',    email: 'vargasi@purdue.edu',   role: 'member', status: 'active',    joined: '2024-08-25', active: true,  rating: 3.8, lastLogin: '27 Nov 2024' },
  { id: 12, name: 'Miguel Ángel Ruiz',  email: 'ruizma@purdue.edu',    role: 'member', status: 'active',    joined: '2024-08-26', active: true,  rating: 4.4, lastLogin: '22 Nov 2024' },
  { id: 13, name: 'Laura Moreno',       email: 'morenol@purdue.edu',   role: 'alumni', status: 'active',    joined: '2022-01-10', active: false, rating: 4.8, lastLogin: '10 Oct 2024' },
  { id: 14, name: 'Andrés Mejía',       email: 'mejiaa@purdue.edu',    role: 'alumni', status: 'active',    joined: '2021-08-15', active: false, rating: 4.3, lastLogin: '01 Oct 2024' },
  { id: 15, name: 'Natalia Sánchez',    email: 'sanchn@purdue.edu',    role: 'member', status: 'suspended', joined: '2023-09-01', active: false, rating: 2.1, lastLogin: '05 Sep 2024' },
];

let members = [...SAMPLE_MEMBERS];
let filtered = [...members];
const PER_PAGE = 8;
let currentPage = 1;
let nextId = members.length + 1;

// ── Render ───────────────────────────────────────────
function renderTable() {
  updateStats();
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;

  const start = (currentPage - 1) * PER_PAGE;
  const pageData = filtered.slice(start, start + PER_PAGE);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--gray-500);">No members found.</td></tr>`;
    renderPagination();
    return;
  }

  tbody.innerHTML = pageData.map(m => `
    <tr id="row-${m.id}">
      <td><input type="checkbox" class="row-check" data-id="${m.id}" /></td>
      <td>
        <div class="member-cell">
          <div class="member-avatar" style="background:${avatarColor(m.name)}">${initials(m.name)}</div>
          <div>
            <div class="member-name">${escHtml(m.name)}</div>
            <div class="member-email">${escHtml(m.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-${m.role}">${capitalize(m.role)}</span></td>
      <td><span class="badge badge-${m.status}">${capitalize(m.status)}</span></td>
      <td>
        <span style="font-size:0.8rem; color:var(--gray-500); letter-spacing:1px;">
          <span style="color:#1877f2; font-weight:700;">f</span>
          <span style="margin:0 3px;">&#9711;</span>
          <span style="color:#E1306C; font-weight:700;">&#10084;</span>
          <span style="color:#1da1f2; font-weight:700;">t</span>
          <span style="color:#4285F4; font-weight:700;">G</span>
          ${m.role === 'board' ? '<span style="color:var(--gray-300); font-size:0.7rem;">+2</span>' : ''}
        </span>
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${m.active ? 'checked' : ''}
                 onchange="toggleActive(${m.id}, this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td style="font-size:0.85rem; color:var(--gray-700);">
        ${m.rating ? `<span style="color:${m.rating >= 4.5 ? '#16a34a' : m.rating < 3 ? '#dc2626' : 'var(--gray-700)'}; font-weight:600;">&#8593; ${m.rating.toFixed(1)}</span>` : '<span style="color:var(--gray-300);">—</span>'}
      </td>
      <td style="font-size:0.82rem; color:var(--gray-500);">${escHtml(m.lastLogin || 'Never')}</td>
      <td>
        <button class="action-btn" onclick="showRowMenu(${m.id}, this)" style="padding:4px 8px; font-size:1rem; border:none;"
                title="Actions">&#8943;</button>
      </td>
    </tr>
  `).join('');

  renderPagination();
}

function updateStats() {
  document.getElementById('statTotalNum').textContent    = members.length;
  document.getElementById('statActiveNum').textContent   = members.filter(m => m.status === 'active').length;
  document.getElementById('statPendingNum').textContent  = members.filter(m => m.status === 'pending').length;
  document.getElementById('statSuspendedNum').textContent= members.filter(m => m.status === 'suspended').length;
  const tc = document.getElementById('statTotalCount');
  if (tc) tc.textContent = members.length.toLocaleString();
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pag = document.getElementById('pagination');
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

// ── Filter / Search ──────────────────────────────────
function filterMembers() {
  const q      = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const role   = document.getElementById('roleFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  filtered = members.filter(m => {
    const matchQ  = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchR  = !role   || m.role === role;
    const matchS  = !status || m.status === status;
    return matchQ && matchR && matchS;
  });
  currentPage = 1;
  renderTable();
}

// ── Actions ──────────────────────────────────────────
function toggleActive(id, val) {
  const m = members.find(m => m.id === id);
  if (m) {
    m.active = val;
    // TODO: POST to php/update-member.php with { id, active: val }
  }
}

function deleteMember(id) {
  if (!confirm('Remove this member from CSAP? This cannot be undone.')) return;
  members = members.filter(m => m.id !== id);
  filtered = filtered.filter(m => m.id !== id);
  if ((currentPage - 1) * PER_PAGE >= filtered.length && currentPage > 1) currentPage--;
  renderTable();
  // TODO: POST to php/delete-member.php with { id }
}

function editRole(id) {
  const m = members.find(m => m.id === id);
  if (!m) return;
  const roles = ['member', 'board', 'alumni'];
  const newRole = prompt(`Change role for ${m.name}:\n(member / board / alumni)`, m.role);
  if (newRole && roles.includes(newRole.toLowerCase())) {
    m.role = newRole.toLowerCase();
    renderTable();
  }
}

function showRowMenu(id, btn) {
  // Simple inline menu near the button
  document.querySelectorAll('.row-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'row-menu';
  menu.style.cssText = 'position:absolute; background:#fff; border:1px solid var(--border); border-radius:10px; box-shadow:var(--shadow-lg); padding:6px; min-width:140px; z-index:999;';
  menu.innerHTML = `
    <button onclick="editRole(${id}); this.closest('.row-menu').remove();" style="display:block; width:100%; text-align:left; padding:8px 12px; font-size:0.85rem; color:var(--gray-700); background:none; border:none; cursor:pointer; border-radius:6px; font-family:Inter,sans-serif;"><i class="fa-solid fa-pen-to-square"></i> Edit Role</button>
    <button onclick="deleteMember(${id}); this.closest('.row-menu').remove();" style="display:block; width:100%; text-align:left; padding:8px 12px; font-size:0.85rem; color:#dc2626; background:none; border:none; cursor:pointer; border-radius:6px; font-family:Inter,sans-serif;"><i class="fa-solid fa-trash"></i> Remove</button>
  `;
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = rect.bottom + 4 + 'px';
  menu.style.left = rect.left - 100 + 'px';
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

function toggleSelectAll(cb) {
  document.querySelectorAll('.row-check').forEach(c => c.checked = cb.checked);
}

// ── Add Member Modal ─────────────────────────────────
function showAddModal() {
  document.getElementById('addModal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('addModal').style.display = 'none';
  document.getElementById('addMemberForm')?.reset();
}

function addMember(e) {
  e.preventDefault();
  const newMember = {
    id:      nextId++,
    name:    document.getElementById('newName').value.trim(),
    email:   document.getElementById('newEmail').value.trim(),
    role:    document.getElementById('newRole').value,
    status:  document.getElementById('newStatus').value,
    joined:  new Date().toISOString().split('T')[0],
    active:  document.getElementById('newStatus').value === 'active',
  };
  members.unshift(newMember);
  filtered = [...members];
  currentPage = 1;
  closeModal();
  renderTable();
  // TODO: POST to php/add-member.php with newMember data
}

// ── Helpers ──────────────────────────────────────────
function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
const AVATAR_COLORS = ['#c29a12','#003087','#CE1126','#2d6a4f','#6d3d91','#c0392b','#1a535c'];
function avatarColor(name) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTable();

  // Close modal on overlay click
  document.getElementById('addModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});
