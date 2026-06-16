// =====================================================
// CSAP — pdf-ticket.js
// Shared client-side ticket PDF generator.
// Layout: A5 Portrait (148×210mm)
// Requires: jsPDF (window.jspdf), QRCode.js (window.QRCode)
// =====================================================

/**
 * Generate and download a CSAP event ticket as a PDF.
 * @param {Object} registration  { id, puid, first_name, last_name, guests, entry_ticket, food_ticket }
 * @param {Object} event         { title, location, event_date_formatted, event_time_formatted }
 * @returns {Promise<void>}
 */
async function generateTicketPDF(registration, event) {

  // ── Step 1: Load CSAP logo as base64 ─────────────
  let logoDataUrl = null;
  try {
    const res  = await fetch('img/csap-logo-transparent.png');
    const blob = await res.blob();
    logoDataUrl = await new Promise(r => {
      const fr = new FileReader();
      fr.onload  = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('CSAP logo could not be loaded:', e);
  }

  // ── Step 2: Generate QR code then build PDF ───────
  return new Promise((resolve, reject) => {

    const qrWrap = document.createElement('div');
    qrWrap.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:160px;height:160px;background:#fff;';
    document.body.appendChild(qrWrap);

    new QRCode(qrWrap, {
      text:         registration.puid,
      width:        160,
      height:       160,
      colorDark:    '#003087',
      colorLight:   '#ffffff',
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
        // A5 Portrait: 148mm wide × 210mm tall
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
        const W = 148, H = 210;

        // ─────────────────────────────────────────────
        // Layout constants — all tuned to fit in 210mm
        // ─────────────────────────────────────────────
        const LOGO_SIZE   = 22;   // mm

        // ── 1. Warm cream background ──────────────────
        doc.setFillColor(250, 248, 244);
        doc.rect(0, 0, W, H, 'F');

        // ── 2. Colombian flag stripes (top) ───────────
        // Proportions: yellow 50% / blue 25% / red 25%
        doc.setFillColor(194, 154, 18);   // gold
        doc.rect(0, 0, W, 8, 'F');
        doc.setFillColor(0, 48, 135);     // blue
        doc.rect(0, 8, W, 4, 'F');
        doc.setFillColor(206, 17, 38);    // red
        doc.rect(0, 12, W, 4, 'F');

        let y = 20;                       // ← start right after flag (16mm)

        // ── 3. CSAP Logo ──────────────────────────────
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', (W - LOGO_SIZE) / 2, y, LOGO_SIZE, LOGO_SIZE);
          y += LOGO_SIZE + 3;
        } else {
          doc.setFillColor(194, 154, 18);
          doc.circle(W / 2, y + 10, 10, 'F');
          y += 23;
        }

        // ── 4. CSAP wordmark ──────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(13, 27, 42);
        doc.text('CSAP', W / 2, y, { align: 'center' });
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 125, 100);
        doc.text('Colombian Student Association at Purdue', W / 2, y, { align: 'center' });
        y += 2;

        // Gold accent line
        doc.setDrawColor(194, 154, 18);
        doc.setLineWidth(0.4);
        doc.line(24, y + 4, W - 24, y + 4);
        y += 9;

        // ── 5. EVENT TICKET badge ─────────────────────
        const evBadgeW = 38, evBadgeH = 6.5;
        doc.setFillColor(0, 48, 135);
        doc.roundedRect((W - evBadgeW) / 2, y, evBadgeW, evBadgeH, 2.5, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text('EVENT TICKET', W / 2, y + 4.3, { align: 'center' });
        y += evBadgeH + 5;

        // ── 6. Event title ────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(13, 27, 42);
        const titleLines = doc.splitTextToSize(event.title, W - 24);
        doc.text(titleLines, W / 2, y, { align: 'center' });
        y += titleLines.length * 6 + 2;

        // ── 7. Date & Time ────────────────────────────
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 105, 95);
        const timePart = event.event_time_formatted
          ? `  \u00b7  ${event.event_time_formatted}` : '';
        doc.text(
          `${event.event_date_formatted || 'Date TBD'}${timePart}`,
          W / 2, y, { align: 'center' }
        );
        y += 4;

        // ── 8. Location ───────────────────────────────
        if (event.location) {
          const locLines = doc.splitTextToSize(event.location, W - 30);
          doc.text(locLines, W / 2, y, { align: 'center' });
          y += locLines.length * 5 + 1;
        }

        // Divider
        doc.setDrawColor(220, 212, 200);
        doc.setLineWidth(0.25);
        doc.line(24, y + 3, W - 24, y + 3);
        y += 7;

        // ── 9. Attendee section ───────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(175, 160, 135);
        doc.text('ATTENDEE', W / 2, y, { align: 'center' });
        y += 4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 27, 42);
        doc.text(`${registration.first_name} ${registration.last_name}`, W / 2, y, { align: 'center' });
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(`PUID: ${registration.puid}`, W / 2, y, { align: 'center' });
        y += 4;
        doc.text(`Additional Guests: +${registration.guests}`, W / 2, y, { align: 'center' });
        y += 3;

        // ── 10. Ticket type badges ────────────────────
        const tBadges = [];
        if (registration.entry_ticket) tBadges.push({ label: 'ENTRY', fill: [0, 48, 135]  });
        if (registration.food_ticket)  tBadges.push({ label: 'FOOD',  fill: [206, 17, 38] });
        if (tBadges.length > 0) {
          y += 2;
          const bW = 26, bH = 7, bGap = 6;
          const totalBW = tBadges.length * bW + (tBadges.length - 1) * bGap;
          let bx = (W - totalBW) / 2;
          tBadges.forEach(b => {
            doc.setFillColor(...b.fill);
            doc.roundedRect(bx, y, bW, bH, 2, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(255, 255, 255);
            doc.text(b.label, bx + bW / 2, y + 4.6, { align: 'center' });
            bx += bW + bGap;
          });
          y += bH + 4;
        }

        // Divider before QR
        doc.setDrawColor(220, 212, 200);
        doc.setLineWidth(0.25);
        doc.line(24, y + 2, W - 24, y + 2);
        y += 6;

        // ── 11. QR Code ───────────────────────────────
        // Dynamically size QR to fit remaining page space
        if (qrDataUrl) {
          const footerZone   = 12;    // space reserved for footer + bottom border
          const qrLabelSpace = 9;     // "SCAN TO VERIFY" + PUID line heights
          const available    = (H - footerZone - qrLabelSpace) - y;
          const QR_SIZE      = Math.min(36, Math.max(24, available));

          doc.addImage(qrDataUrl, 'PNG', (W - QR_SIZE) / 2, y, QR_SIZE, QR_SIZE);
          y += QR_SIZE + 3;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(0, 48, 135);
          doc.text('SCAN TO VERIFY', W / 2, y, { align: 'center' });
          y += 4;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(180, 165, 145);
          doc.text(registration.puid, W / 2, y, { align: 'center' });
        }

        // ── 12. Footer ────────────────────────────────
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(205, 195, 180);
        doc.text(
          `CSAP  \u00b7  Colombian Student Association at Purdue  \u00b7  #${String(registration.id).padStart(5, '0')}`,
          W / 2, H - 5, { align: 'center' }
        );

        // ── 13. Gold border ───────────────────────────
        doc.setDrawColor(194, 154, 18);
        doc.setLineWidth(0.6);
        doc.rect(2.5, 2.5, W - 5, H - 5, 'S');

        // ── Save ──────────────────────────────────────
        const filename =
          `csap-ticket-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${registration.puid}.pdf`;
        doc.save(filename);
        resolve();

      } catch (err) {
        reject(err);
      }
    }, 300);
  });
}
