# Appointment Reminder System
WhatsApp/SMS appointment reminder tool built for Better Call Centers / El Paso Water Quality LLC.
Lets staff book appointments via a web form, sends an instant SMS confirmation to the customer,
and automatically sends a reminder when the appointment is under 1 hour away.

## Stack
- Frontend: React + Vite — deployed on Vercel
- Backend: Node.js + Express — deployed on Railway
- Database: Supabase (PostgreSQL)
- Messaging: Exotel SMS / WhatsApp

## Run Locally
See SETUP.md for full instructions.
`npm run install:all` then `npm run dev`

## Data Flow
Form submit → POST /api/appointments → saved to Supabase → Exotel SMS sent immediately.
Dashboard polls GET /api/appointments every 30 seconds for live updates.
Cron job runs every 5 minutes and sends a reminder SMS for any appointment within the next hour.

## Bonus Feature
Automatic 1-hour reminder via node-cron. Tracks reminder_sent flag in Supabase to prevent duplicates.
