// =====================================================
// CSAP — index-events.js
// Loads the latest 3 active events from the DB and
// renders them into the homepage events grid.
// =====================================================
(async function loadIndexEvents() {
  const empty = document.getElementById('indexEventsEmpty');
  const grid  = document.getElementById('indexEventsGrid');
  if (!empty || !grid) return;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const CAT_STYLE = {
    social:       { bg: '#e8f0ff', tc: '#003087' },
    cultural:     { bg: '#fdf6e4', tc: '#7a5500' },
    academic:     { bg: '#e6f9f0', tc: '#15803d' },
    food:         { bg: '#fff0f4', tc: '#99001a' },
    professional: { bg: '#f0f0ff', tc: '#3730a3' },
    fundraiser:   { bg: '#fff4e6', tc: '#9a3412' },
  };

  function buildCard(ev) {
    const open = +ev.registration_open === 1;
    const cat  = (ev.category || 'social').toLowerCase();
    const s    = CAT_STYLE[cat] || { bg: '#f5f5f5', tc: '#444' };

    const regChip = open
      ? `<span style="font-size:.68rem;font-weight:700;padding:3px 9px;border-radius:999px;
                      background:#e6f9f0;color:#15803d;border:1px solid #bbf0d5;">
           <i class="fa-solid fa-circle" style="font-size:.4rem;"></i> Registration Open
         </span>`
      : `<span style="font-size:.68rem;font-weight:700;padding:3px 9px;border-radius:999px;
                      background:#fff0f0;color:#dc2626;border:1px solid #fecaca;">
           <i class="fa-solid fa-lock" style="font-size:.6rem;"></i> Closed
         </span>`;

    const loc = ev.location
      ? `<div style="font-size:.78rem;color:#999;display:flex;align-items:center;gap:5px;margin-bottom:8px;">
           <i class="fa-solid fa-location-dot"></i>${esc(ev.location)}
         </div>` : '';

    const desc = ev.description
      ? `<p style="font-size:.84rem;color:#777;line-height:1.6;margin-bottom:10px;
                   display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
           ${esc(ev.description)}
         </p>` : '';

    const btn = open
      ? `<a href="events.html" class="btn btn-gold" style="padding:8px 18px;font-size:.82rem;">Register &#8594;</a>`
      : `<a href="events.html" class="btn btn-outline" style="padding:8px 18px;font-size:.82rem;">View Details</a>`;

    return `
      <div class="event-card">
        <div class="event-card-top">
          <div class="event-card-meta">
            <span class="event-cat-badge"
                  style="background:${s.bg};color:${s.tc};border-color:${s.bg};">
              ${esc(cat)}
            </span>
            ${regChip}
          </div>
          <h3 style="font-size:1rem;font-weight:700;color:#0d1b2a;margin-bottom:6px;line-height:1.4;">
            ${esc(ev.title)}
          </h3>
          ${desc}
          <div style="font-size:.78rem;font-weight:600;color:#999;
                      display:flex;align-items:center;gap:5px;margin-bottom:5px;">
            <i class="fa-solid fa-calendar-days"></i>
            ${esc(ev.event_date_formatted || 'Date TBD')}
            ${ev.event_time_formatted ? '&nbsp;&middot;&nbsp;' + esc(ev.event_time_formatted) : ''}
          </div>
          ${loc}
        </div>
        <div class="event-card-footer">${btn}</div>
      </div>`;
  }

  try {
    const res = await fetch('php/events/get-events.php');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const events = await res.json();

    const upcoming = Array.isArray(events) ? events.filter(ev => !+ev.is_past) : [];
    if (upcoming.length === 0) return; // keep gray message

    grid.innerHTML = upcoming.slice(0, 3).map(buildCard).join('');

    // Swap: hide gray message, show grid
    empty.style.display = 'none';
    grid.style.cssText  = 'display:grid !important;';

  } catch (err) {
    console.warn('[CSAP] Events failed to load:', err);
    // empty state remains visible by default — no action needed
  }
})();
