## Tools Used
React (Vite) for the frontend, Node.js + Express for the backend, Supabase (PostgreSQL)
for the database, Exotel for SMS messaging, and node-cron for the reminder job.
Deployed via Vercel (frontend) and Railway (backend).

## Data Flow
A staff member fills out the booking form, which POSTs to the Express backend.
The backend saves the appointment to Supabase and immediately sends an SMS confirmation
via Exotel. The dashboard fetches all appointments from the GET endpoint every 30 seconds.
A cron job checks every 5 minutes for appointments within the next hour and sends a
reminder SMS to those customers, then marks reminder_sent = true to prevent duplicates.

## Hardest Part
The hardest part was debugging the Vite dev server proxy configuration and resolving CORS errors caused by absolute URLs, ensuring that local development and production deployments routed API requests correctly.

## Time Taken
Approx. 4 hours
