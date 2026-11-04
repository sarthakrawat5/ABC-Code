# Nexus Club & Event Hub

Nexus Club keeps the existing single-page HTML/CSS/JavaScript experience and adds a Node.js/Express API backed by Supabase Auth and PostgreSQL. The server serves the current `index.html`; event/club content and all account-specific bookmarks, registrations, memberships, and tickets are loaded from the database.

## Requirements

- Node.js 20 or newer and npm
- A Supabase project with its PostgreSQL database
- A Google OAuth client configured in Supabase only if Google sign-in is enabled

## Setup

1. Install the Node dependencies:

   ```powershell
   npm install
   ```

2. In the Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`, then run `supabase/seed.sql`.

3. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `APP_ORIGIN`. Use the project URL and publishable/anon key from Supabase. Do not put a service-role key in the browser or this app's server environment; requests use the caller's verified Supabase JWT and database RLS.

4. In Supabase Auth, set the site URL to `http://localhost:3000` and allow that URL as a redirect. Enable email/password sign-up. For Google, enable the Google provider, add its client ID and client secret in Supabase, and register Supabase's OAuth callback URL in Google Cloud. The frontend calls Supabase OAuth and returns to the current Nexus route.

5. Start the server:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`. Do not open `index.html` directly with `file://`; the page now fetches `/api/config`, `/api/events`, and `/api/clubs` from Express.

6. Run the available unit tests:

   ```powershell
   npm test
   ```

## Granting Organizer Access

Organizer privileges must be assigned by a trusted administrator in the Supabase SQL Editor, never by the client. After the user's first signup, promote their profile and add an organizer membership for the club they manage:

```sql
begin;
update public.profiles
set role = 'organizer'
where email = 'organizer@example.com';

insert into public.club_memberships (club_id, user_id, role)
select c.id, p.id, 'organizer'
from public.clubs c
join public.profiles p on p.email = 'organizer@example.com'
where c.slug = 'the-sunday-studio'
on conflict (club_id, user_id) do update set role = 'organizer';
commit;
```

The account needs the `organizer` profile role to create a club, and an organizer membership on a specific club to manage its events. Admins can manage every club. The organizer dashboard is shown only when the authenticated API returns a permitted membership; Express and RLS independently enforce every write.

## Architecture

```text
Browser (existing index.html + client.js)
  -> Supabase Auth (email/password and Google OAuth)
  -> Express REST API (/api/*)
  -> Supabase user-scoped client with verified bearer JWT
  -> PostgreSQL tables, RLS policies, transactional registration functions
```

- `index.html` preserves the visual design and existing page structure. Its event/club renderers, detail routes, signup/login modal, dashboard, bookmarks, registration, and club join controls now use API data.
- `client.js` initializes Supabase Auth, persists/refreshes sessions in the browser SDK, supplies bearer tokens to the API, and implements signup/login/Google OAuth/logout.
- `server/src/app.js` configures Express security headers, CORS, body limits, request rate limiting, authentication attachment, API routes, static file serving, and error responses.
- `server/src/middleware/auth.js` verifies tokens with Supabase Auth, loads the profile, and creates a user-scoped Supabase client. Organizer checks come from database roles/memberships, not client state.
- `server/src/routes/` contains REST endpoints for events, clubs/memberships, user data, bookmarks, registrations, and ticket lookup.
- `server/src/validation.js`, `errors.js`, and `formatters.js` centralize input schemas, error mapping, and the view model consumed by the existing frontend. `server/src/ticket-qr.js` creates scannable QR data URLs from the database-issued ticket ID and code.
- `supabase/migrations/001_initial_schema.sql` defines tables, constraints, indexes, RLS, auth profile provisioning, club join/create RPCs, and atomic registration/ticket issuance.
- `supabase/seed.sql` inserts the six existing events and their clubs as published database records.

## Database Model

- `profiles`: Supabase Auth user profile and server-controlled role (`student`, `organizer`, or `admin`), keyed to `auth.users`.
- `clubs`: clubs and their organizer/creator.
- `club_memberships`: user-to-club membership and club-scoped organizer role; unique on `(club_id, user_id)`.
- `events`: event content, timing/timezone, venue, ticket price, capacity/counter, registration deadline, schedule, highlights, and publication status.
- `event_registrations`: one registration per user/event; unique on `(event_id, user_id)`.
- `bookmarks`: one bookmark per user/event; unique on `(event_id, user_id)`.
- `tickets`: unique ticket code per registration, with server-generated UUID-based code and status.

`register_for_event` locks the event row, verifies publication/deadline/capacity, inserts the unique registration, increments the seat counter, and creates the ticket in one database transaction. Concurrent requests cannot oversell capacity. RLS limits user records to their owners and event management to authorized organizers.

## REST API

Public reads:

- `GET /api/events?q=&category=&limit=` and `GET /api/events/:slug`
- `GET /api/clubs` and `GET /api/clubs/:slug`
- `GET /api/health` and `GET /api/config` (public Supabase browser config only)

Authenticated user actions:

- `GET/PATCH /api/users/me`
- `GET /api/users/me/bookmarks`, `/registrations`, `/tickets`, and `/clubs`
- `PUT/DELETE /api/events/:slug/bookmark`
- `POST /api/events/:slug/registrations`
- `GET /api/tickets/:ticketId`
- `POST /api/clubs/:slug/membership`

Organizer actions:

- `POST /api/clubs` (global organizer/admin)
- `GET /api/clubs/:slug/manage/events`
- `POST /api/clubs/:slug/events`
- `PATCH/DELETE /api/events/:slug` (club organizer/admin; delete cancels instead of removing event history)

All write bodies are validated with Zod; errors use `{ "error": { "code", "message", "details?" } }`.

## Security Notes

- Passwords are handled by Supabase Auth; the app never stores or logs passwords.
- The Google client secret stays in Supabase Auth provider settings.
- Every private API route requires a bearer token validated by Supabase Auth.
- Database access from Express is scoped to the user's JWT; RLS provides defense in depth.
- Profile role changes cannot be submitted through the profile API. Organizer assignments are made by an administrator through the Supabase SQL Editor.
- Registration, capacity, uniqueness, and ticket issuance are enforced in PostgreSQL, not trusted to the browser.
