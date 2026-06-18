const { test, expect } = require('@playwright/test');

test('ticket download generates a QR from the registration id', async ({ page }) => {
  const registrationId = 'reg_e2e_ticket_12345';

  await page.addInitScript(() => {
    Object.defineProperty(window, 'QRCode', {
      configurable: true,
      set(QRCodeImpl) {
        const WrappedQRCode = function (element, options) {
          window.__csapLastQrText = options?.text || '';
          return Reflect.construct(QRCodeImpl, [element, options], new.target || WrappedQRCode);
        };
        WrappedQRCode.prototype = QRCodeImpl.prototype;
        Object.assign(WrappedQRCode, QRCodeImpl);
        WrappedQRCode.CorrectLevel = QRCodeImpl.CorrectLevel;
        Object.defineProperty(window, 'QRCode', {
          configurable: true,
          writable: true,
          value: WrappedQRCode,
        });
      },
      get() {
        return undefined;
      },
    });
  });

  await page.route('**/js/supabase-service.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.CSAP_DB = {
        isConfigured: () => true,
        getEvents: async () => [{
          id: 'event-e2e',
          title: 'Noche E2E',
          event_date_formatted: 'Jun 18, 2026',
          event_time_formatted: '07:00 PM',
          location: 'Purdue Memorial Union',
          registration_open: 1,
        }],
        getTicket: async () => ({
          registration: {
            id: '${registrationId}',
            email: 'attendee@purdue.edu',
            first_name: 'Ana',
            last_name: 'García',
            guests: 1,
            entry_ticket: true,
            food_ticket: true,
          },
          event: {
            title: 'Noche E2E',
            location: 'Purdue Memorial Union',
            event_date_formatted: 'Jun 18, 2026',
            event_time_formatted: '07:00 PM',
          },
        }),
      };
      window.CSAP_AUTH = { getCurrentUser: () => null };
    `,
  }));

  await page.goto('/tickets.html');
  await page.waitForFunction(() => window.jspdf && window.QRCode);

  await page.selectOption('#dlEvent', 'event-e2e');
  await page.fill('#dlEmail', 'attendee@purdue.edu');

  const downloadPromise = page.waitForEvent('download');
  await page.click('#dlBtn');
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain(registrationId);
  await expect.poll(() => page.evaluate(() => window.__csapLastQrText)).toBe(registrationId);
});
