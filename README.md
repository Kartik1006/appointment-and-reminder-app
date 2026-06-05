# Appointment Reminder System

A full-stack WhatsApp and SMS appointment reminder application built for Better Call Centers / El Paso Water Quality LLC. 

This tool empowers staff members to easily schedule and manage appointments through a clean, modern web interface. Once an appointment is booked or modified, the system automatically dispatches an instant SMS confirmation to the customer. To reduce no-shows and keep customers informed, a background worker monitors upcoming appointments and sends a polite automated reminder when an appointment is less than an hour away.

## Technology Stack
- **Frontend**: React + Vite (Vanilla CSS, custom dark theme) — Deployed on Vercel
- **Backend**: Node.js + Express.js — Deployed on Railway
- **Database**: Supabase (PostgreSQL) — Handles secure storage of customer and appointment data
- **Messaging**: Exotel SMS API (with Twilio fallback structure) for instant notifications

## Core Features
- **Live Dashboard**: Real-time polling updates the dashboard automatically without manual refreshes.
- **Form Validation**: Strict client-side and server-side validation for phone numbers and future appointment times.
- **Automated Cron Jobs**: Background tasks run every 5 minutes to sweep for upcoming appointments.
- **Smart Editing rules**: Customers cannot edit or delete appointments that are less than 2 hours away.
- **Confirmation & Reminders**: Real-time SMS upon booking, updating, and a 1-hour automated reminder.

## Run Locally

See `SETUP.md` for full installation prerequisites and instructions.

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```
2. **Start the development servers** (Frontend on port 5173, Backend on port 3001):
   ```bash
   npm run dev
   ```

## Architecture & Data Flow
1. **Booking Flow**: A user submits the form → POST `/api/appointments` → Backend validates and saves to Supabase → Exotel API is triggered to send an immediate confirmation SMS.
2. **Live Updates**: The React frontend polls `GET /api/appointments` every 30 seconds to keep the dashboard current for all staff members.
3. **Background Automation**: A `node-cron` job runs every 5 minutes on the server. It queries Supabase for appointments scheduled within the next 1 hour where `reminder_sent` is false. It dispatches the reminder SMS and flips the boolean flag to prevent duplicate messages.

## Bonus Implementations
- **Grace Period Locking**: Implemented a 2-hour locking mechanism so appointments cannot be deleted or modified right before they occur.
- **Skeleton Loading & Micro-interactions**: Smooth transitions, pill badges, and skeleton loaders for a premium user experience.
