import cron from "node-cron";
import supabase from "../supabaseClient.js";
import { sendSms } from "../utils/exotelClient.js";

function startReminderJob() {
  console.log("Reminder cron job scheduled (every 5 minutes)");

  cron.schedule("*/5 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Running reminder check...`);

    try {
      const now = new Date().toISOString();
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("appointment_time", now)
        .lte("appointment_time", oneHourLater)
        .eq("reminder_sent", false);

      if (error) {
        console.error("Reminder query error:", error);
        return;
      }

      if (!appointments || appointments.length === 0) {
        console.log("No upcoming appointments needing reminders.");
        return;
      }

      console.log(`Found ${appointments.length} appointment(s) to remind.`);

      for (const appointment of appointments) {
        try {
          const messageBody = `Reminder: Hi ${appointment.customer_name}, your appointment is in under 1 hour!`;

          await sendSms(appointment.phone_number, messageBody);

          // Mark reminder_sent = true
          const { error: updateError } = await supabase
            .from("appointments")
            .update({ reminder_sent: true })
            .eq("id", appointment.id);

          if (updateError) {
            console.error(
              `Failed to update reminder_sent for ${appointment.id}:`,
              updateError
            );
          }
        } catch (err) {
          console.error(
            `Failed to process reminder for appointment ${appointment.id}:`,
            err.message
          );
        }
      }
    } catch (err) {
      console.error("Reminder job error:", err.message);
    }
  });
}

export { startReminderJob };
