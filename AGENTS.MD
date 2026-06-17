# AGENTS.MD

Scope: this file applies to the entire repository.

## Project Overview

This is the GitHub Pages branch of the CSAP website. Keep it as a static site built with HTML, CSS, and vanilla JavaScript. Dynamic data is handled through Supabase REST from browser-side JavaScript. Do not reintroduce PHP, Apache `.htaccess`, MariaDB/MySQL, Composer, or a server runtime unless the user explicitly asks.

## Repository Structure

- Root `*.html` files are public pages and portal pages.
- `index.html` is the homepage.
- `events.html` is the public event listing and registration page.
- `tickets.html` lets attendees download a ticket by event and email.
- `login.html`, `members.html`, and `scanner.html` are portal/admin related pages.
- `css/styles.css` contains the global design system, shared layout, nav, footer, mobile dock, buttons, sections, and responsive rules.
- `css/admin.css` contains admin dashboard, users table, event cards, modals, and scanner styles.
- `js/components.js` injects shared nav, footer, and the mobile dock. Update it when adding/removing shared navigation links.
- `js/main.js` handles general UI behavior like nav toggles, dropdowns, scroll animations, lightbox, and mobile dock behavior.
- `js/auth-core.js` contains pure authentication helpers and is covered by unit tests.
- `js/supabase-config.js` stores the Supabase URL and anon key placeholder.
- `js/supabase-service.js` is the shared Supabase REST data layer.
- `js/login.js`, `js/index-events.js`, `js/events-portal.js`, `js/ticket-download.js`, `js/dashboard.js`, `js/members.js`, and `js/scanner.js` implement page-specific behavior.
- `supabase/schema.sql` defines the Supabase/Postgres schema and development policies.
- `supabase/seed.example.sql` is an example admin seed.
- `tests/auth-core.test.js` contains Node-based unit tests for login/auth helpers.
- `docker-compose.yml` and `docker/nginx.conf` serve the static site locally.

## Local Development

- There is no frontend build step.
- To serve locally with Docker, run `docker compose up` and open `http://localhost:8080`.
- To serve without Docker, run `python3 -m http.server 8080` and open `http://localhost:8080`.
- Dynamic flows require `js/supabase-config.js` to contain a valid Supabase project URL, anon key, and a seeded database.

## Validation

- Run `npm test` after touching `js/auth-core.js`, `js/login.js`, or auth-related Supabase code.
- There is no browser automation suite. Manually smoke test affected pages in a browser.
- For visual changes, check desktop and mobile widths. Existing breakpoints commonly use 1024, 900, 768, 600, 520, and 480px.
- For event or portal changes, test public event listing, registration, ticket download, admin event CRUD, user management, and scanner behavior as applicable.

## Frontend Conventions

- Use plain HTML, CSS, and vanilla JavaScript. Do not introduce a framework or build step unless explicitly requested.
- Prefer existing CSS variables in `css/styles.css` for color, spacing, radius, shadow, and transitions.
- Keep shared site-wide styles in `css/styles.css`; keep admin-only styles in `css/admin.css`; page-specific one-off styles may remain inline in the relevant HTML file if consistent with the existing pattern.
- Use `js/components.js` for shared nav/footer/mobile-dock changes instead of duplicating markup across pages.
- Many pages call global JavaScript functions from inline HTML attributes such as `onclick` and `onsubmit`. Be careful when renaming functions or changing script load order.
- Escape dynamic HTML with local helpers such as `escHtml()` before interpolation.
- Keep public pages responsive and preserve the CSAP visual language: cream background, gold accents, Colombian flag stripe, Plus Jakarta Sans/Inter typography, rounded cards, and subtle shadows.
- External browser dependencies are loaded from CDNs, including Google Fonts, Font Awesome, SweetAlert2, jsPDF, QRCode.js, and html5-qrcode. Avoid adding new external dependencies unless necessary.

## Supabase/Auth Conventions

- Login uses email plus last name(s). Do not add password fields or password storage.
- `js/auth-core.js` normalizes last name(s) for login comparison.
- User records store `last_names` as text for the lightweight portal login.
- Current roles are `admin`, `superuser`, and `user`.
- `admin` can manage roles; `superuser` can manage users/events but should not promote roles; `user` is read-only in the portal.
- Current user statuses are `active`, `pending`, and `suspended`.
- Current event categories are `social`, `cultural`, `academic`, `food`, `professional`, and `fundraiser`.
- Current event statuses are `active`, `closed`, and `cancelled`.
- Public event registration uses attendee email and a guest count from 0 to 5. Validate these in JavaScript before writes.
- Do not collect or store university ID numbers. Only display or return registration data when required for the registration, ticket, or scanner flow.
- Client-side role checks are not a full security boundary. For production-sensitive data, prefer Supabase Auth with Row Level Security or a serverless API layer.

## GitHub Pages Notes

- Keep `.nojekyll` in place.
- Do not rely on `.htaccess` or extensionless Apache rewrites. Use explicit `.html` links unless a GitHub Pages-compatible routing strategy is added.
- Root pages use relative asset paths. If adding nested pages, verify asset paths, Supabase config paths, and 404 behavior carefully.

## Known Caveats

- `supabase/schema.sql` includes permissive anon policies for the static GitHub Pages client. Tighten them if stronger protection becomes necessary.
- `js/supabase-config.js` intentionally contains blank Supabase placeholders until configured for deployment.
- `.DS_Store` files are present in the working tree from before this branch. Do not modify them as part of normal code changes.
