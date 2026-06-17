# CSAP Website

Website for the Colombian Student Association at Purdue. The site is intentionally built with static HTML, CSS, and vanilla JavaScript so it can be deployed directly to GitHub Pages.

## Stack

- Static HTML pages at the repository root.
- Shared CSS in `css/styles.css` and admin-specific CSS in `css/admin.css`.
- Vanilla JavaScript in `js/`.
- Supabase Postgres + REST API for dynamic data such as users, events, registrations, ticket lookup, and check-ins.
- No PHP, server runtime, bundler, or frontend framework is required for the GitHub Pages branch.

## Main Pages

- `index.html`: homepage, hero video, events preview, social sections, and podcast widget.
- `about.html`, `board.html`, `previous-officers.html`: organization information and leadership pages.
- `join.html`, `new-student-info.html`, `grants.html`, `colombia.html`: public resources and cultural pages.
- `events.html`: public event listing and registration form.
- `tickets.html`: ticket PDF lookup by event and email.
- `login.html`: portal login with email plus last name(s). No passwords are collected or stored.
- `members.html`: portal dashboard for events and users.
- `scanner.html`: QR scanner for event check-ins.

## Important JavaScript Files

- `js/components.js`: injects shared navigation, footer, and mobile dock.
- `js/main.js`: shared UI behavior such as nav toggles, scroll animations, lightbox, and mobile dock behavior.
- `js/auth-core.js`: pure auth helpers for email normalization, last-name validation, sessions, and role checks.
- `js/supabase-config.js`: Supabase project URL and anon key placeholder.
- `js/supabase-service.js`: Supabase REST data layer used by all dynamic pages.
- `js/login.js`: login page behavior.
- `js/index-events.js`: homepage event preview.
- `js/events-portal.js`: public event registration.
- `js/ticket-download.js` and `js/pdf-ticket.js`: ticket lookup and client-side PDF generation.
- `js/dashboard.js`, `js/members.js`, `js/scanner.js`: portal, user management, event management, and check-in flows.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.example.sql`, or create users manually.
5. Copy your project URL and anon/public key into `js/supabase-config.js`:

```js
window.CSAP_SUPABASE_CONFIG = {
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'your-anon-public-key',
};
```

The default seed uses:

- Email: `admin@csap.purdue.edu`
- Last name: `Admin`

Change this before using a real deployment.

## Data And Privacy

This branch removes passwords. Portal login uses email plus stored last name(s), normalized in JavaScript for comparison.

The login is intentionally lightweight. It is meant to avoid password collection and keep the portal easy to use, not to provide strong authentication.

The Supabase schema includes permissive anon policies so the static GitHub Pages client can read and write data. This is acceptable only if the data model remains low-risk. If registrations eventually include more sensitive student data, prefer Supabase Auth with Row Level Security policies, or put admin operations behind a small serverless API.

## Why Supabase

Supabase is a good fit for this branch because it has a generous free tier, hosted Postgres, SQL tables, a REST API that works from static HTML/JS, and a path to stronger Row Level Security later without changing providers.

Alternatives considered:

- Firebase Realtime Database: very simple, but weaker fit for relational data and future policies.
- Cloud Firestore: good Firebase option, but less natural for SQL-style event/user/registration data.
- Cloudflare Workers + D1: strong and cheap, but requires maintaining an API layer.
- Google Sheets or Airtable: fine for public content, not recommended for portal/login flows.

## Local Development

Open files directly in a browser for static page checks, or run a local server.

With Docker:

```bash
docker compose up
```

Then open `http://localhost:8080`.

Without Docker:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Tests

Unit tests cover the login/auth helper logic in `js/auth-core.js`.

Run:

```bash
npm test
```

The tests use Node's built-in `assert` module and do not require external packages.

## GitHub Pages Deployment

1. Push this branch to GitHub when ready.
2. In the GitHub repository settings, go to Pages.
3. Select the deployment branch and root folder.
4. Make sure `js/supabase-config.js` contains the correct Supabase URL and anon key before deployment.
5. Keep `.nojekyll` in the repository so GitHub Pages serves files exactly as provided.

## Performance Work Included

- Third-party scripts for SweetAlert2, jsPDF, QRCode.js, and html5-qrcode are deferred where safe.
- Videos use `preload="metadata"` instead of `preload="auto"` to reduce initial network pressure.
- Below-the-fold images use `loading="lazy"` and `decoding="async"`.
- Pages preconnect to Google Fonts, Google font assets, and CDNJS.
- The duplicate Font Awesome kit script on `tickets.html` was removed because Font Awesome is already loaded by `css/styles.css`.

## PageSpeed Notes

Google PageSpeed Insights was run against the currently deployed test URL with a provided API key. The API key is not stored in this repository.

Findings from the deployed test site:

- Mobile score: Performance 65, Accessibility 95, Best Practices 96, SEO 92.
- Mobile metrics: FCP 3.9s, LCP 6.5s, Speed Index 5.3s, TBT 0ms, CLS 0.
- Desktop score: Performance 94, Accessibility 95, Best Practices 96, SEO 92.
- Desktop metrics: FCP 0.8s, LCP 1.0s, Speed Index 1.9s, TBT 0ms, CLS 0.06.
- Main mobile opportunities were oversized `img/gallery/picnic.jpeg`, the Behold/Instagram network chain, missing preconnects for Behold origins, and heading-order accessibility warnings.
- Desktop was mostly healthy; remaining opportunities were third-party font/cache behavior and a small forced reflow.

The current branch already addresses some of these through preconnects, lazy images, deferred scripts, and metadata-only video preload. Further improvements should focus on replacing `picnic.jpeg` with an optimized AVIF/WebP and loading the Instagram widget only after user interaction or after the main content has settled.
