# FindMyFood🍔

A two-sided marketplace for booking restaurant tables. Diners see a live SVG floor plan and tap a specific table to book — not generic time-slot booking. Managers get a real-time dashboard for walk-ins, seating, and no-shows. Built as a portfolio/hackathon prototype.

## What It Does

### Diner Side
- **Browse restaurants** with live availability counts, search by name, filter by price tier, sort by popularity
- **View restaurant details** — menu, reviews, operating hours
- **Interactive SVG floor plan** — tables rendered at exact positions with shapes, rotations, and capacity labels. Green = available (tappable), grey = taken
- **Book a table** — for now (instant) or a future date/time. Pick duration (1/1.5/2 hrs). Combined table option when party size exceeds a single table
- **Booking confirmation** with a 6-character lookup code, printable receipt, and cancel option
- **Look up a booking** anytime by code — no account needed

### Manager Side
- **Real-time dashboard** — same floor plan as diners, but with all tables tappable. Green = available, amber = held (reservation incoming), red = occupied
- **Walk-in seating** — mark any table occupied with one tap, no reservation required. Combined walk-in for pre-defined table groups
- **Reservation actions** — Seat (held → occupied, reservation → seated) or No-show (held → available, reservation → no_show). No-shows are preserved in the data, not deleted
- **Upcoming reservations panel** — live list of incoming bookings, auto-refreshing
- **Settings page** — edit restaurant info, menu, floor plan layout, combinable groups, and landmarks

### Admin Side
- **Create restaurants** via a structured form with live SVG preview — tables, menu, combinable groups, landmarks
- **Manage all restaurants** — view/copy manager links, deactivate/reactivate (hides from diners but keeps manager access), permanently delete with full cascade

## Core Technical Guarantees

### Double-booking prevention
```sql
UPDATE tables SET status = 'held', reserved_until = NOW() + INTERVAL '5 minutes'
WHERE id = $1 AND (status = 'available' OR (status = 'held' AND reserved_until < NOW()))
RETURNING id;
```
Single atomic conditional UPDATE. Zero rows returned = table already taken. Wrapped in Neon HTTP transactions for multi-table atomicity — if any table in a combined booking fails, all roll back. Verified with 5 simultaneous HTTP requests: exactly 1 wins, 4 get clean 409 errors.

### Expired hold recovery
Held tables past `reserved_until` are treated as available at query time. No background job — the check happens inline on every read and every hold attempt.

### One code path for all bookings
Diner app bookings and manager walk-ins both flow through `createReservation()` → `holdTables()`. No separate logic that could drift.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL on [Neon](https://neon.tech) (serverless) |
| ORM | Drizzle ORM (schema + queries), raw SQL for transactions |
| Auth model | Unguessable UUID tokens in URLs (no login/password anywhere) |
| Real-time | Polling every 4 seconds (no WebSockets) |

## What It Doesn't Have

These are deliberate scope decisions, not bugs:

- No login/password for anyone — diners identify by name+phone at booking time, managers by URL token
- No payment processing
- No persistent diner accounts or booking history
- No WebSockets or push notifications — polling only
- No drag-and-drop floor plan editor — layout entered as structured form fields
- No map view or cuisine filters
- No reliability scoring or no-show penalties
- No Redis or distributed locking — Postgres row-level locking is correct at this scale

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server entry
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle table definitions (8 tables)
│   │   │   ├── index.ts          # Neon + Drizzle connection
│   │   │   ├── hold.ts           # Atomic table hold (Neon HTTP transaction)
│   │   │   ├── reservations.ts   # Reservation create/cancel logic
│   │   │   └── manager.ts        # Token validation helper
│   │   └── routes/
│   │       ├── restaurants.ts    # Diner-facing REST endpoints
│   │       ├── reservations.ts   # Booking/lookup/cancel endpoints
│   │       ├── admin.ts          # Admin CRUD + cascade delete
│   │       └── manager.ts        # Manager dashboard + table actions
│   └── drizzle/                  # Migration SQL files
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router setup
│   │   ├── api.ts                # Typed fetch wrappers
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   ├── components/
│   │   │   ├── FloorPlanSVG.tsx  # SVG floor plan (diner + manager modes)
│   │   │   ├── BookingModal.tsx  # Diner booking form
│   │   │   ├── RestaurantForm.tsx # Shared create/edit form
│   │   │   └── Layout.tsx        # Nav bar wrapper
│   │   └── pages/
│   │       ├── BrowsePage.tsx
│   │       ├── RestaurantDetailPage.tsx
│   │       ├── FloorPlanPage.tsx
│   │       ├── ConfirmationPage.tsx
│   │       ├── LookupPage.tsx
│   │       ├── AdminPage.tsx
│   │       ├── ManagerDashboardPage.tsx
│   │       └── ManagerSettingsPage.tsx
```

## Database Schema

8 tables: `restaurants`, `tables`, `combinable_table_groups`, `reservations`, `reservation_tables`, `menu_items`, `reviews`, `landmarks`

Key design choices:
- Table positions (`x_pos`, `y_pos`) are percentages (0–100), not pixels — renders at any screen size
- `tables.status` (available/held/occupied) is independent of reservations — managers can mark walk-ins with zero reservation
- `reservation_tables` is a join table — no `table_id` on reservations, supports multi-table bookings
- `landmarks` add non-interactive visual context (entrance, window, bar, etc.) to floor plans

## Running Locally

```bash
# Backend
cd backend
cp .env.example .env   # Add your Neon DATABASE_URL
npm install
npm run db:migrate     # Create tables
npm run db:seed        # Seed 2 sample restaurants
npm run dev            # Starts on :3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # Starts on :5173, proxies /api to :3000
```

### Useful scripts

```bash
npm run test:locking   # Verify atomic hold + rollback (4 tests)
```

## Routes

| Path | What |
|------|------|
| `/` | Diner browse |
| `/restaurant/:id` | Restaurant detail + menu + reviews |
| `/restaurant/:id/tables` | Floor plan + booking |
| `/confirmation/:code` | Booking confirmation |
| `/lookup` | Find booking by code |
| `/admin` | Create/manage restaurants |
| `/manager/:token` | Manager dashboard |
| `/manager/:token/settings` | Edit restaurant |
