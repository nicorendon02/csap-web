// =====================================================
// CSAP — components.js
// Shared nav + footer HTML injected on every page
// =====================================================

(function () {
  const NAV_HTML = `
<nav class="navbar" role="navigation" aria-label="Main navigation">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo" id="navLogo" aria-label="CSAP Home">
      <img src="img/csap-navbar-logo.png" class="logo-tunjo" width="48" height="48" alt="CSAP logo" aria-hidden="true" />
      <div class="nav-logo-text">
        <span class="nav-logo-name">CSAP</span>
        <span class="nav-logo-tagline">Colombian Student Association at Purdue</span>
      </div>
    </a>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navLinks" role="list">
      <li class="dropdown">
        <a href="about.html" id="navAboutUs">About Us</a>
        <div class="dropdown-menu">
          <a href="board.html" id="dropBoardLink">Meet the board</a>
          <a href="previous-officers.html" id="dropPrevLink">Previous officers</a>
        </div>
      </li>
      <li><a href="events.html" id="navEventsLink">Events</a></li>
      <li><a href="join.html" id="navJoinLink">Join &amp; Collaborate</a></li>
      <li><a href="new-student-info.html" id="navNewStudentLink">New student info</a></li>
      <li><a href="grants.html" id="navGrantsLink">Grants</a></li>
      <li><a href="colombia.html" id="navColombiaLink">Colombia</a></li>
      <li><a href="login.html" id="navLoginBtn">Login</a></li>
    </ul>
  </div>
  <div class="flag-stripe" aria-hidden="true">
    <div class="s-yellow"></div>
    <div class="s-blue"></div>
    <div class="s-red"></div>
  </div>
</nav>`;

  const FOOTER_HTML = `
<footer>
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="nav-logo" style="margin-bottom:14px;">
          <img src="img/csap-navbar-logo.png" style="width:38px;height:38px;object-fit:contain;" alt="CSAP logo" />
          <span style="color:var(--dark);font-weight:700;font-size:1.2rem;">CSAP</span>
        </div>
        <p>Colombian Student Association at Purdue — building community, celebrating culture, and supporting one another.</p>
        <div class="footer-socials" style="margin-top:18px;">
          <a href="https://www.instagram.com/csapurdue/" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
          <a href="https://www.facebook.com/CSAPURDUE/" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
          <a href="https://www.linkedin.com/company/csapurdue" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
          <a href="mailto:csap@purdue.edu" aria-label="Email"><i class="fa-solid fa-envelope"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="about.html">About Us</a></li>
          <li><a href="events.html">Events</a></li>
          <li><a href="join.html">Join &amp; Collaborate</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <ul>
          <li><a href="new-student-info.html">New Students</a></li>
          <li><a href="grants.html">Travel Grants</a></li>
          <li><a href="colombia.html">Colombia</a></li>
          <li><a href="https://boilerlink.purdue.edu/organization/csap" target="_blank" rel="noopener">BoilerLink</a></li>
          <li><a href="https://www.purdue.edu/isss/" target="_blank" rel="noopener">ISS Office</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:csap@purdue.edu">csap@purdue.edu</a></li>
          <li><a href="https://boilerlink.purdue.edu/organization/csap" target="_blank" rel="noopener">BoilerLink Page</a></li>
          <li><a href="join.html">Become a Member</a></li>
          <li><a href="login.html">Member Login</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span id="footerYear"></span> Colombian Student Association at Purdue. All rights reserved.</span>
      <span>Made with <i class="fa-solid fa-heart" style="color:var(--col-red);"></i> by CSAP 26-27 board</span>
    </div>
  </div>
</footer>`;

  // Inject nav
  const navPlaceholder = document.getElementById('nav-placeholder');
  if (navPlaceholder) navPlaceholder.outerHTML = NAV_HTML;

  // Inject footer
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) footerPlaceholder.outerHTML = FOOTER_HTML;

  // Inject mobile dock
  const DOCK_HTML = `
<div class="mobile-dock" id="mobileDock" role="navigation" aria-label="Mobile navigation">
  <div class="mobile-dock-inner">
    <a href="index.html" class="dock-tab" id="dockHome">
      <i class="fa-solid fa-house"></i>
      <span>Home</span>
    </a>
    <a href="about.html" class="dock-tab" id="dockAbout">
      <i class="fa-solid fa-users"></i>
      <span>About</span>
    </a>
    <a href="join.html" class="dock-tab" id="dockJoin">
      <i class="fa-solid fa-user-plus"></i>
      <span>Join</span>
    </a>
    <a href="events.html" class="dock-tab" id="dockEvents">
      <i class="fa-solid fa-calendar-days"></i>
      <span>Events</span>
    </a>
    <button class="dock-tab" id="dockMoreBtn" aria-label="More options" aria-expanded="false">
      <i class="fa-solid fa-ellipsis"></i>
      <span>More</span>
    </button>
  </div>
</div>
<div class="dock-more-sheet" id="dockMoreSheet" aria-hidden="true">
  <a href="new-student-info.html" class="dock-more-link" id="dockNewStudent">
    <i class="fa-solid fa-graduation-cap"></i> New Students
  </a>
  <a href="grants.html" class="dock-more-link" id="dockGrants">
    <i class="fa-solid fa-plane"></i> Grants
  </a>
  <a href="colombia.html" class="dock-more-link" id="dockColombia">
    <i class="fa-solid fa-flag"></i> Colombia
  </a>
  <div class="dock-more-divider"></div>
  <a href="login.html" class="dock-more-link" id="dockLogin">
    <i class="fa-solid fa-right-to-bracket"></i> Member Login
  </a>
</div>`;
  document.body.insertAdjacentHTML('beforeend', DOCK_HTML);

  // Set year
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Auto-highlight active nav link ──────────────────────
  // Match current pathname segment against each nav link
  const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkPath = link.getAttribute('href').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const aboutGroup = ['/about', '/board', '/previous-officers'];
    if (linkPath === currentPath) {
      link.classList.add('active');
    } else if (aboutGroup.includes(currentPath) && linkPath === '/about') {
      link.classList.add('active');
    }
  });

  // ── Auto-highlight active dock tab ──────────────────────
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.dock-tab[href]').forEach(tab => {
    if (tab.getAttribute('href') === currentFile) tab.classList.add('active');
  });

  // ── Smooth page transitions ──────────────────────────────
  // Fade in on load
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'opacity 0.25s ease';
  window.addEventListener('load', () => {
    document.documentElement.style.opacity = '1';
  });

  // Fade out before navigating away (internal links only)
  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('http') || link.target === '_blank') return;
    e.preventDefault();
    let navigated = false;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.location.href = href;
    };
    document.documentElement.style.opacity = '0';
    document.documentElement.addEventListener('transitionend', navigate, { once: true });
    // Fallback: always navigate even if transition never fires
    setTimeout(navigate, 300);
  });

})();
