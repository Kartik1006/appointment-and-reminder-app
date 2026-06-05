# Setup

## Prerequisites

- **Node.js 18+** — [download](https://nodejs.org/)
- **Supabase account** — [supabase.com](https://supabase.com)
- **Twilio account** *(optional)* — app works without it in simulation mode

---

## Step 1 — Install

```bash
npm run install:all
```

This installs dependencies in the root, `/server`, and `/client` folders.

---

## Step 2 — Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the `CREATE TABLE` statement from [`server/supabaseClient.js`](server/supabaseClient.js):

```sql
CREATE TABLE appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  appointment_time timestamptz NOT NULL,
  message_sent boolean DEFAULT false,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

3. Copy your **Project URL** and **anon key** from Settings → API

---

## Step 3 — Twilio (optional — app works without it in simulation mode)

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your **Account SID**, **Auth Token**, and a **phone number**
3. For WhatsApp: enable the **Twilio Sandbox for WhatsApp** in the console

> Without Twilio credentials the app logs `[SIMULATED SMS to ...]` to the server console instead of sending real messages.

---

## Step 4 — Environment

```bash
# Server
cp server/.env.example server/.env
```

Fill in the values in `server/.env`:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Your Supabase anon/public key |
| `TWILIO_ACCOUNT_SID` | ❌ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | ❌ | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | ❌ | Twilio phone number (e.g. `+1234567890`) |
| `PORT` | ❌ | Server port (default: `3001`) |

```bash
# Client (keep as-is for local dev)
cp client/.env.example client/.env
```

---

## Step 5 — Run locally

```bash
npm run dev
```

| Service | URL |
|---|---|
| Backend health check | [http://localhost:3001/health](http://localhost:3001/health) |
| Frontend | [http://localhost:5173](http://localhost:5173) |
