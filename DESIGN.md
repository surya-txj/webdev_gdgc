# Design notes

## Visual direction

Deep Plum (#3B1F2B) carries the brand and primary actions, Taupe (#B6A597) supplies the tactile neutral, Cream (#F4EEE5) keeps the interface calm and editorial, and muted Gold (#C8A96B) marks craft, focus, and availability. Headlines use Cinzel and subtitles use Tenor Sans. The Kalanidhi logo is built from SVG ornaments and live text, so it has no background and stays sharp at any size.

## How login and the two roles work

I use Supabase Auth for email/password sign-up and login. A customer can create an account with an email, password, and full name. The database trigger creates a matching `profiles` row with the default `customer` role. The seed script creates the studio account from the admin environment variables and changes that profile to `admin`; there is no studio sign-up screen.

The React app keeps the session with the Supabase anon client, then sends the access token to Express on every data request. Session initialization configures the API token before loading `/api/me`, avoiding the first-request race where the profile call could be sent without a bearer token. The auth page redirects in an effect rather than during render and handles both immediate sessions and email-confirmation flows. Express asks Supabase Auth to validate the token, loads the profile, and attaches the role. Route middleware enforces `customer` or `admin`. Customer queries always filter by the authenticated customer id, so a customer asking for another person’s record receives a generic 404 instead of learning that the record exists.

## Backend health and Supabase configuration

`GET /api/health` is intentionally public and reports both `ok` and whether the server has the Supabase URL and service-role key configured. `GET /api/me` remains protected and returns 401 without a bearer token. This makes a fresh local setup easy to diagnose before attempting login. With `.env` populated and the schema applied, Supabase Auth validates the session, the profile trigger supplies the role record, and the protected API routes can operate normally.

## Which database I chose and why

I chose Supabase Postgres because the art studio has relational data: paintings, orders, profiles, dates, pottery options, and request statuses. Postgres gives me foreign keys, checks, transactions, row locks, partial unique indexes, and date types. Supabase also provides hosted Auth and Storage, which keeps the client simple while the service role stays on the server. Row Level Security is enabled on every application table, with no public policies; the Express service-role client is the only data path.

## How I stop two people taking the same painting or date

A painting purchase calls the `place_order` database function. It locks the painting row with `FOR UPDATE`, checks that the status is still available, inserts the order with a price snapshot, and marks the painting sold in one transaction. The partial unique index on active orders is a second safety net. If the race loses, Express maps the database error to 409 `PAINTING_SOLD` and the client refreshes the painting.

Wall bookings use a partial unique index on `booking_date` for requested and confirmed rows. Two inserts for the same active date cannot both succeed; a Postgres `23505` becomes 409 `DATE_TAKEN`. Admin decisions and customer edits/cancellations are conditional updates with the expected current status, so a second click gets 409 `INVALID_STATUS` instead of overwriting a newer decision. The client also disables buttons while a request is in flight.

## What I finished, what I left out, and what I would do next

I finished the customer/admin flows, public gallery, the curved 3D painting carousel on the home page, the Kalanidhi branding, wall booking rules, pottery request rules, seed process, Supabase schema, server-side RBAC, loading/empty/error states, and a responsive layout.

I left out real payments, browser image uploads, password reset, social login, studio sign-up, reviews, coupons, delivery tracking, email/SMS notifications, deployment, Docker, CI/CD, and a formal automated test suite. Next I would add payment checkout, signed image uploads, email notifications, integration tests for concurrency, and a deployment pipeline.
