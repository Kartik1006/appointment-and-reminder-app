## Tools Used
- **Frontend**: React, built with Vite for fast HMR and optimized production bundling. Styled entirely with Vanilla CSS using a custom design system. Deployed via Vercel.
- **Backend**: Node.js and Express.js providing RESTful API endpoints. Deployed via Railway.
- **Database**: Supabase (PostgreSQL) for storing appointments and tracking SMS delivery states (`message_sent` and `reminder_sent`).
- **Messaging**: Exotel API for programmatic SMS delivery to customers.
- **Automation**: `node-cron` for scheduling the 5-minute interval background sweeps.

## Data Flow
The application architecture is split between a React client and an Express backend. 
When a staff member fills out the booking form, the client performs validation and POSTs the payload to the backend. The Express server inserts the new record into Supabase, formats the datetime to the local timezone, and fires an asynchronous request to the Exotel API to send a confirmation text message to the customer. 
On the frontend, the dashboard fetches all appointments from the GET endpoint every 30 seconds to ensure the staff's view is always up to date without needing manual page refreshes. 
Concurrently, the backend runs a cron job every 5 minutes. It queries the database for any appointments occurring within the next 60 minutes that haven't received a reminder yet. It sends the reminder SMS and updates the `reminder_sent` flag in the database to `true` to guarantee idempotency and prevent spamming the customer.

## Hardest Part
Honestly, the trickiest part of this build was getting the CORS and Vite proxy configuration working perfectly together. I spent a good chunk of time scratching my head over why my local API requests were failing before I realized I needed to use relative paths in the frontend so Vite could properly proxy them to the Express server running on a different port. Also, cleanly migrating the SMS logic from Twilio over to Exotel mid-project required some careful refactoring to make sure the API authentication headers and payloads were formatted exactly the way Exotel expects them.

## Time Taken
About 6 hours spread over a couple of evenings. Most of that was spent polishing the CSS and making sure the edge cases (like the 2-hour edit lockout) worked flawlessly.
