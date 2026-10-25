# Kalanidhi — An Art Studio

Kalanidhi is a full-stack studio experience for original paintings, hand-painted wall bookings, and custom pottery requests. It uses JavaScript, React + Vite, Node + Express, and Supabase for Auth, Postgres, and Storage.

## Prerequisites

Use Node 18 or newer and create a Supabase project. In Supabase, copy the Project URL, anon key, and service role key. The service role key is server-only and must never be placed in a `VITE_` variable.

## Exact terminal setup

From the directory containing `art-studio.zip`:

```bash
unzip art-studio.zip
cd art-studio
cp .env.example .env
# Edit .env and add your Supabase URL, anon key, service role key, and passwords.
npm run install:all
```

Then open `database/schema.sql` in the Supabase SQL editor and run it. In Supabase Authentication → Providers → Email, either turn off **Confirm email** for immediate local sign-in or keep it enabled and use the confirmation link sent to the user. Seed the supplied studio catalog and demo accounts:

```bash
npm run seed
```

Start the frontend and backend together:

```bash
npm run dev
```

The Vite client runs at `http://localhost:5173` and the API runs at `http://localhost:4000`. Verify the backend in a second terminal:

```bash
curl http://localhost:4000/api/health
curl -i http://localhost:4000/api/me
```

A configured backend returns `{"ok":true,"supabaseConfigured":true}` from health. The unauthenticated `/api/me` check should return HTTP 401; that confirms the protected route is active. After signing in through the frontend, the browser sends the Supabase access token to `/api/me` and the server loads the matching profile and role.

## Supabase setup

1. Run [`database/schema.sql`](database/schema.sql).
2. Copy `.env.example` to `.env` and fill the Supabase values. Keep `.env` local.
3. The studio seed data is already in `seed/`. For a fresh copy, unzip the seed archive there. Fonts (Cinzel and Tenor Sans) are installed as npm packages, so nothing extra is needed.
4. `npm run seed` creates the public `paintings` Storage bucket, uploads the supplied images, upserts catalog/rate/options, and creates the admin and demo customer using the values in `.env`.

## Features

Customers can browse and search paintings, buy an available one-of-a-kind painting, cancel their own placed order, request a wall date with a live rate preview, and request/edit/cancel custom pottery while the request is open. Studio admins can manage available paintings, see all orders, wall bookings, and pottery requests, confirm or decline wall requests, accept or decline pottery requests, and view dashboard totals. Authentication uses Supabase email/password sessions, a profile trigger, server-side bearer-token validation, and customer/admin role guards.

## Project structure

- `frontend/`: React routes, authentication context, API wrapper, shared components, role-grouped pages, and CSS.
- `backend/`: Express app, Supabase service-role client, authentication/validation middleware, REST route modules, date/error utilities, and the seed script.
- `database/schema.sql`: tables, constraints, partial unique indexes, trigger, transaction-safe RPCs, and RLS.
- `seed/`: studio seed JSON and painting images.

## API overview

Public endpoints are `GET /api/health`, `GET /api/paintings`, `GET /api/paintings/:id`, `GET /api/wall/rate`, and `GET /api/pottery/options`. Authenticated endpoints include `/api/me`, `/api/orders`, `/api/wall/taken-dates`, `/api/wall-bookings`, and `/api/pottery-requests`. Admin dashboard data is available at `/api/admin/stats`. The server returns errors as `{ "error": { "code", "message", "details" } }` and checks the user role on every protected request.

## Design notes

The palette uses deep Plum for trust and focus, warm Taupe for tactile materiality, Cream for breathing room, and muted Gold for warmth and craft. Headlines and the logo name use Cinzel; subtitles and body text use Tenor Sans. The logo is drawn in `frontend/src/components/Logo.jsx` (SVG ornaments, transparent background); a transparent PNG copy is in `frontend/public/images/kalanidhi-logo.png`.

The home page opens with the paintings trailing in from the right, then settles into a looping right-to-left carousel on a curved 3D track (`CurvedMarquee` in `frontend/src/components/Visuals.jsx`). Cards in the middle are smaller and face forward; cards towards the edges grow, turn inward and lean slightly, as if wrapping around a cylinder. A hand-pointer cursor stays parked over the middle. `STUDIO_NAME` is one constant in `frontend/src/config.js` if the studio name needs to change.

## Author
Suryatej Bandla
