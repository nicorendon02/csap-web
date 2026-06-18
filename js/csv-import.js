// =====================================================
// CSAP — csv-import.js
// CSV bulk import logic for the admin dashboard.
// Requires: pdf-ticket.js (generateTicketPDF), JSZip
// =====================================================

// ── Module state ──────────────────────────────────────
let csvParsedRows  = [];   // [{puid, first_name, last_name}, ...]
let importedEvent  = null; // event object returned by bulk-register.php
let importInserted = [];   // inserted[] from server response

// ── Open / Close modal ────────────────────────────────
function openCsvImportModal() {
  _csvResetModal();

  // Populate event selector from already-loaded allEvents
  const sel = document.getElementById('csvEventSelect');
  sel.innerHTML = '<option value="">— Select an event —</option>';
  (typeof allEvents !== 'undefined' ? allEvents : []).forEach(ev => {
    const opt = document.createElement('option');
    opt.value       = ev.id;
    opt.textContent = ev.title + (ev.event_date_formatted ? ` · ${ev.event_date_formatted}` : '');
    sel.appendChild(opt);
  });

  document.getElementById('csvImportModal').style.display = 'flex';
}

function closeCsvImportModal() {
  document.getElementById('csvImportModal').style.display = 'none';
  _csvResetModal();
}

function _csvResetModal() {
  csvParsedRows  = [];
  importedEvent  = null;
  importInserted = [];

  const fileInput = document.getElementById('csvFileInput');
  if (fileInput) fileInput.value = '';

  _setSection('csvSectionFile', true);
  _setSection('csvSectionPreview', false);
  _setSection('csvSectionProgress', false);
  _setSection('csvSectionResult', false);

  const dropZone = document.getElementById('csvDropZone');
  if (dropZone) dropZone.classList.remove('dragging');

  _setError('csvFileError', '');
  document.getElementById('csvPreviewBody')  && (document.getElementById('csvPreviewBody').innerHTML = '');
  document.getElementById('csvPreviewCount') && (document.getElementById('csvPreviewCount').textContent = '');
}

function _setSection(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

function _setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent    = msg;
  el.style.display  = msg ? 'block' : 'none';
}

// ── Drag & Drop wiring (called after DOM ready) ───────
function initCsvDropZone() {
  const zone  = document.getElementById('csvDropZone');
  const input = document.getElementById('csvFileInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer?.files?.[0];
    if (file) _handleCsvFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) _handleCsvFile(input.files[0]);
  });
}

// ── Parse & preview ───────────────────────────────────
function _handleCsvFile(file) {
  _setError('csvFileError', '');

  if (!file.name.match(/\.(csv|txt)$/i)) {
    _setError('csvFileError', 'Please upload a .csv file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const rows = _parseCsv(text);
    if (rows.length === 0) {
      _setError('csvFileError', 'The CSV file appears to be empty or has no data rows.');
      return;
    }
    csvParsedRows = rows;
    _renderPreview(rows);
  };
  reader.onerror = () => _setError('csvFileError', 'Could not read file.');
  reader.readAsText(file);
}

/**
 * RFC-4180 CSV parser.
 * Skips the first (header) row.
 * Returns [{puid, first_name, last_name}, ...]
 */
function _parseCsv(text) {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];

  const rows = [];
  // Skip index 0 (header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = _splitCsvLine(line);
    rows.push({
      puid:       (fields[0] || '').trim(),
      first_name: (fields[1] || '').trim(),
      last_name:  (fields[2] || '').trim(),
      _row:       i + 1, // 1-indexed with header as row 1
    });
  }
  return rows;
}

function _splitCsvLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function _renderPreview(rows) {
  const tbody     = document.getElementById('csvPreviewBody');
  const countEl   = document.getElementById('csvPreviewCount');
  const PREVIEW_N = 5;

  // Count validation issues client-side for heads-up
  let warnCount = 0;
  rows.forEach(r => {
    if (!/^\d{10}$/.test(r.puid) || !r.first_name || !r.last_name) warnCount++;
  });

  countEl.innerHTML =
    `<strong>${rows.length}</strong> attendee${rows.length !== 1 ? 's' : ''} detected` +
    (warnCount ? ` &nbsp;·&nbsp; <span style="color:#dc2626;">${warnCount} row${warnCount !== 1 ? 's' : ''} may have issues</span>` : '');

  const preview = rows.slice(0, PREVIEW_N);
  tbody.innerHTML = preview.map(r => {
    const warn = !/^\d{10}$/.test(r.puid) || !r.first_name || !r.last_name;
    return `<tr class="${warn ? 'csv-row-warn' : ''}">
      <td>${escCsv(r.puid)}</td>
      <td>${escCsv(r.first_name)}</td>
      <td>${escCsv(r.last_name)}</td>
      ${warn ? '<td><i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;" title="Validation issue"></i></td>' : '<td></td>'}
    </tr>`;
  }).join('');

  if (rows.length > PREVIEW_N) {
    tbody.innerHTML += `
      <tr>
        <td colspan="4" style="text-align:center;color:var(--gray-400);font-style:italic;padding:10px;">
          … and ${rows.length - PREVIEW_N} more row${rows.length - PREVIEW_N !== 1 ? 's' : ''}
        </td>
      </tr>`;
  }

  _setSection('csvSectionPreview', true);
}

function escCsv(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Submit ────────────────────────────────────────────
async function submitCsvImport() {
  const eventId = document.getElementById('csvEventSelect')?.value;
  _setError('csvFileError', '');

  if (!eventId) {
    _setError('csvFileError', 'Please select an event.');
    return;
  }
  if (csvParsedRows.length === 0) {
    _setError('csvFileError', 'Please upload a CSV file first.');
    return;
  }

  const fileInput = document.getElementById('csvFileInput');
  if (!fileInput?.files?.[0]) {
    _setError('csvFileError', 'Please select a CSV file.');
    return;
  }

  // Switch to progress view
  _setSection('csvSectionFile',    false);
  _setSection('csvSectionPreview', false);
  _setSection('csvSectionProgress', true);
  _setSection('csvSectionResult',  false);

  _setProgressBar(0, csvParsedRows.length, 'Uploading & registering attendees…');

  const body = new FormData();
  body.append('event_id', eventId);
  body.append('csv_file', fileInput.files[0]);

  let data;
  try {
    const res = await fetch('php/events/bulk-register.php', { method: 'POST', body });
    data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');
  } catch (err) {
    _setSection('csvSectionProgress', false);
    _setSection('csvSectionFile', true);
    _setError('csvFileError', err.message || 'Import failed. Please try again.');
    return;
  }

  importedEvent  = data.event;
  importInserted = data.inserted ?? [];

  // ── Show results ──────────────────────────────────
  _setSection('csvSectionProgress', false);
  _renderResults(data);
}

function _setProgressBar(done, total, label) {
  const bar   = document.getElementById('csvProgressBar');
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const lbl   = document.getElementById('csvProgressLabel');
  if (bar) {
    bar.style.width = pct + '%';
    bar.textContent = pct + '%';
  }
  if (lbl) lbl.textContent = label || '';
}

function _renderResults(data) {
  const inserted = data.inserted ?? [];
  const skipped  = data.skipped  ?? [];
  const invalid  = data.invalid  ?? [];

  const resultEl = document.getElementById('csvResultSummary');
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="csv-result-stat csv-stat-ok">
        <i class="fa-solid fa-circle-check"></i>
        <strong>${inserted.length}</strong> registered
      </div>
      <div class="csv-result-stat csv-stat-warn">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <strong>${skipped.length}</strong> skipped (already registered)
      </div>
      <div class="csv-result-stat csv-stat-err">
        <i class="fa-solid fa-circle-xmark"></i>
        <strong>${invalid.length}</strong> invalid rows
      </div>
    `;
  }

  // Detail lists
  const detailEl = document.getElementById('csvResultDetail');
  if (detailEl) {
    let html = '';
    if (skipped.length) {
      html += `<div class="csv-detail-group"><p class="csv-detail-label">⚠ Skipped (duplicate)</p><ul>`;
      skipped.forEach(r => {
        html += `<li>Row ${r.row}: ${escCsv(r.puid)} — ${escCsv(r.name)}</li>`;
      });
      html += `</ul></div>`;
    }
    if (invalid.length) {
      html += `<div class="csv-detail-group"><p class="csv-detail-label">✕ Invalid rows</p><ul>`;
      invalid.forEach(r => {
        html += `<li>Row ${r.row} (${escCsv(r.puid) || 'no PUID'}): ${escCsv(r.reason)}</li>`;
      });
      html += `</ul></div>`;
    }
    detailEl.innerHTML = html;
  }

  // Show download button only if we have tickets to generate
  const dlBtn = document.getElementById('csvDownloadZipBtn');
  if (dlBtn) dlBtn.style.display = inserted.length > 0 ? 'inline-flex' : 'none';

  _setSection('csvSectionResult', true);

  // Refresh event cards in background
  if (typeof loadEvents === 'function') loadEvents();
}

// ── ZIP generation ────────────────────────────────────
async function downloadAllTicketsZip() {
  if (!importInserted.length || !importedEvent) return;

  const btn = document.getElementById('csvDownloadZipBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDFs…';
  }

  const zip = new JSZip();
  const total = importInserted.length;

  _setSection('csvSectionProgress', true);
  _setSection('csvSectionResult', false);
  _setProgressBar(0, total, `Generating ticket 0 of ${total}…`);

  for (let i = 0; i < total; i++) {
    const reg = importInserted[i];
    _setProgressBar(i, total, `Generating ticket ${i + 1} of ${total}…`);
    try {
      const pdfBlob = await _generateTicketBlob(reg, importedEvent);
      const safeName = `${importedEvent.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${reg.puid}.pdf`;
      zip.file(safeName, pdfBlob);
    } catch (err) {
      console.warn(`Ticket generation failed for PUID ${reg.puid}:`, err);
    }
  }

  _setProgressBar(total, total, 'Zipping files…');

  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(zipBlob);
    const a    = document.createElement('a');
    const slug = importedEvent.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.href     = url;
    a.download = `csap-tickets-${slug}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('ZIP creation failed: ' + err.message);
  }

  _setSection('csvSectionProgress', false);
  _setSection('csvSectionResult', true);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Download All Tickets (ZIP)';
  }
}

/**
 * Generates a ticket PDF for one attendee and returns it as a Blob.
 * Wraps generateTicketPDF() which normally calls doc.save(); here we
 * intercept with a custom jsPDF output call.
 */
async function _generateTicketBlob(registration, event) {
  // Load logo once (cached via module-level var)
  if (typeof _csvLogoDataUrl === 'undefined') {
    window._csvLogoDataUrl = null;
    try {
      const res  = await fetch('img/csap-logo-transparent.png');
      const blob = await res.blob();
      window._csvLogoDataUrl = await new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(blob);
      });
    } catch (e) { /* logo optional */ }
  }

  return new Promise((resolve, reject) => {
    const qrWrap = document.createElement('div');
    qrWrap.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:160px;height:160px;background:#fff;';
    document.body.appendChild(qrWrap);

    new QRCode(qrWrap, {
      text:         registration.puid,
      width:        160, height: 160,
      colorDark:    '#003087', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    setTimeout(() => {
      let qrDataUrl = null;
      const qrImg = qrWrap.querySelector('img');
      if (qrImg) {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 160;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 160, 160);
        ctx.drawImage(qrImg, 0, 0, 160, 160);
        qrDataUrl = c.toDataURL('image/png');
      }
      document.body.removeChild(qrWrap);

      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
        const W = 148, H = 210;
        const logoDataUrl = window._csvLogoDataUrl;
        const LOGO_SIZE = 22;

        // Backgrounds & flag stripes
        doc.setFillColor(250, 248, 244);
        doc.rect(0, 0, W, H, 'F');
        doc.setFillColor(194, 154, 18); doc.rect(0, 0, W, 8, 'F');
        doc.setFillColor(0, 48, 135);   doc.rect(0, 8, W, 4, 'F');
        doc.setFillColor(206, 17, 38);  doc.rect(0, 12, W, 4, 'F');

        let y = 20;

        // Logo
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', (W - LOGO_SIZE) / 2, y, LOGO_SIZE, LOGO_SIZE);
          y += LOGO_SIZE + 3;
        } else {
          doc.setFillColor(194, 154, 18); doc.circle(W / 2, y + 10, 10, 'F'); y += 23;
        }

        // Wordmark
        doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
        doc.setTextColor(13, 27, 42);
        doc.text('CSAP', W / 2, y, { align: 'center' }); y += 4;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.setTextColor(140, 125, 100);
        doc.text('Colombian Student Association at Purdue', W / 2, y, { align: 'center' }); y += 2;

        doc.setDrawColor(194, 154, 18); doc.setLineWidth(0.4);
        doc.line(24, y + 4, W - 24, y + 4); y += 9;

        // EVENT TICKET badge
        const evBW = 38, evBH = 6.5;
        doc.setFillColor(0, 48, 135);
        doc.roundedRect((W - evBW) / 2, y, evBW, evBH, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
        doc.text('EVENT TICKET', W / 2, y + 4.3, { align: 'center' }); y += evBH + 5;

        // Event title
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 42);
        const titleLines = doc.splitTextToSize(event.title, W - 24);
        doc.text(titleLines, W / 2, y, { align: 'center' }); y += titleLines.length * 6 + 2;

        // Date & Time
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 105, 95);
        const timePart = event.event_time_formatted ? `  ·  ${event.event_time_formatted}` : '';
        doc.text(`${event.event_date_formatted || 'Date TBD'}${timePart}`, W / 2, y, { align: 'center' }); y += 4;

        // Location
        if (event.location) {
          const locLines = doc.splitTextToSize(event.location, W - 30);
          doc.text(locLines, W / 2, y, { align: 'center' }); y += locLines.length * 5 + 1;
        }

        // Divider
        doc.setDrawColor(220, 212, 200); doc.setLineWidth(0.25);
        doc.line(24, y + 3, W - 24, y + 3); y += 7;

        // Attendee
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(175, 160, 135);
        doc.text('ATTENDEE', W / 2, y, { align: 'center' }); y += 4;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(13, 27, 42);
        doc.text(`${registration.first_name} ${registration.last_name}`, W / 2, y, { align: 'center' }); y += 4;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
        doc.text(`PUID: ${registration.puid}`, W / 2, y, { align: 'center' }); y += 3;

        // Ticket type badges
        const tBadges = [];
        if (registration.entry_ticket) tBadges.push({ label: 'ENTRY', fill: [0, 48, 135] });
        if (registration.food_ticket)  tBadges.push({ label: 'FOOD',  fill: [206, 17, 38] });
        if (tBadges.length) {
          y += 2;
          const bW = 26, bH = 7, bGap = 6;
          const totalBW = tBadges.length * bW + (tBadges.length - 1) * bGap;
          let bx = (W - totalBW) / 2;
          tBadges.forEach(b => {
            doc.setFillColor(...b.fill);
            doc.roundedRect(bx, y, bW, bH, 2, 2, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
            doc.text(b.label, bx + bW / 2, y + 4.6, { align: 'center' });
            bx += bW + bGap;
          });
          y += bH + 4;
        }

        // Divider before QR
        doc.setDrawColor(220, 212, 200); doc.setLineWidth(0.25);
        doc.line(24, y + 2, W - 24, y + 2); y += 6;

        // QR Code
        if (qrDataUrl) {
          const footerZone = 12, qrLabelSpace = 9;
          const available = (H - footerZone - qrLabelSpace) - y;
          const QR_SIZE   = Math.min(36, Math.max(24, available));
          doc.addImage(qrDataUrl, 'PNG', (W - QR_SIZE) / 2, y, QR_SIZE, QR_SIZE);
          y += QR_SIZE + 3;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(0, 48, 135);
          doc.text('SCAN TO VERIFY', W / 2, y, { align: 'center' }); y += 4;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(180, 165, 145);
          doc.text(registration.puid, W / 2, y, { align: 'center' });
        }

        // Footer
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(205, 195, 180);
        doc.text(
          `CSAP  ·  Colombian Student Association at Purdue  ·  #${String(registration.id).padStart(5, '0')}`,
          W / 2, H - 5, { align: 'center' }
        );

        // Border
        doc.setDrawColor(194, 154, 18); doc.setLineWidth(0.6);
        doc.rect(2.5, 2.5, W - 5, H - 5, 'S');

        // Return as blob instead of saving
        const pdfOutput = doc.output('blob');
        resolve(pdfOutput);
      } catch (err) { reject(err); }
    }, 300);
  });
}
