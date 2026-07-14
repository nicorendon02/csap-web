// =====================================================
// CSAP — main.js
// Nav toggle, scroll animations, mobile dock behavior
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Mobile Nav Toggle (desktop hamburger fallback) ──
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(toggle.classList.contains('open')));
    });
  }

  // ── Mobile Dropdown Toggle ─────────────────────────
  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  // ── Close nav on outside click ─────────────────────
  document.addEventListener('click', (e) => {
    if (navLinks && !navLinks.contains(e.target) && !toggle?.contains(e.target)) {
      navLinks.classList.remove('open');
      toggle?.classList.remove('open');
    }
  });

  // ── Scroll Animations (data-animate) ───────────────
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => {
    animObserver.observe(el);
    // If already in viewport on load, mark visible immediately
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('is-visible');
      animObserver.unobserve(el);
    }
  });

  // ── Legacy .fade-in support ─────────────────────────
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

  // ── Gallery lightbox ────────────────────────────────
  document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `<div class="lightbox-inner"><img src="${img.src}" alt="${img.alt}"><button class="lightbox-close">&times;</button></div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => {
        if (e.target === overlay || e.target.classList.contains('lightbox-close')) overlay.remove();
      });
    });
  });

  // ── Mobile Dock: scroll hide / show ────────────────
  const mobileDock  = document.getElementById('mobileDock');
  const moreSheet   = document.getElementById('dockMoreSheet');
  const moreBtn     = document.getElementById('dockMoreBtn');

  if (mobileDock) {
    let lastY   = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastY + 6 && y > 80) {
          // Scrolling down — hide dock
          mobileDock.classList.add('dock-hidden');
          moreSheet?.classList.remove('open');
        } else if (y < lastY - 6) {
          // Scrolling up — show dock
          mobileDock.classList.remove('dock-hidden');
        }
        lastY   = y;
        ticking = false;
      });
    }, { passive: true });
  }

  // ── Mobile Dock: More sheet toggle ─────────────────
  if (moreBtn && moreSheet) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = moreSheet.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', String(isOpen));
      moreSheet.setAttribute('aria-hidden', String(!isOpen));
    });

    // Close sheet on outside click
    document.addEventListener('click', (e) => {
      if (!moreSheet.contains(e.target) && e.target !== moreBtn) {
        moreSheet.classList.remove('open');
        moreBtn.setAttribute('aria-expanded', 'false');
        moreSheet.setAttribute('aria-hidden', 'true');
      }
    });
  }

});
