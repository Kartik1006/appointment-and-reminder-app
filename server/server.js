import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import supabase from "./supabaseClient.js";
import { startReminderJob } from "./cron/reminderJob.js";
import { sendSms } from "./utils/exotelClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// POST /api/appointments
app.post("/api/appointments", async (req, res, next) => {
  try {
    const { customer_name, phone_number, appointment_time } = req.body;

    // Validate required fields
    const missing = [];
    if (!customer_name) missing.push("customer_name");
    if (!phone_number) missing.push("phone_number");
    if (!appointment_time) missing.push("appointment_time");

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Insert into Supabase
    const { data, error: insertError } = await supabase
      .from("appointments")
      .insert({
        customer_name,
        phone_number,
        appointment_time,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(500).json({ error: "Failed to create appointment" });
    }

    // Format datetime for SMS
    const formattedTime = new Date(appointment_time).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Calcutta",
    });

    const messageBody = `Hi ${customer_name}, your appointment is confirmed for ${formattedTime}. Reply CONFIRM or CANCEL.`;

    await sendSms(phone_number, messageBody);

    // Update message_sent flag
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ message_sent: true })
      .eq("id", data.id);

    if (updateError) {
      console.error("Failed to update message_sent:", updateError);
    }

    return res.status(201).json({ ...data, message_sent: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id
app.put("/api/appointments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customer_name, phone_number, appointment_time } = req.body;

    const missing = [];
    if (!customer_name) missing.push("customer_name");
    if (!phone_number) missing.push("phone_number");
    if (!appointment_time) missing.push("appointment_time");

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Fetch existing appointment to enforce 2-hour cutoff
    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const msUntilAppt = new Date(existing.appointment_time).getTime() - Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (msUntilAppt < twoHoursMs) {
      return res.status(403).json({
        error: "Cannot edit an appointment less than 2 hours before its scheduled time.",
      });
    }

    // If appointment_time changed, reset reminder_sent so the cron picks it up again
    const timeChanged =
      new Date(appointment_time).getTime() !== new Date(existing.appointment_time).getTime();

    const updatePayload = {
      customer_name,
      phone_number,
      appointment_time,
      ...(timeChanged && { reminder_sent: false }),
    };

    const { data, error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ error: "Failed to update appointment" });
    }

    // Send confirmation SMS for the updated appointment
    const formattedTime = new Date(appointment_time).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Calcutta",
    });

    const messageBody = `Hi ${customer_name}, your appointment has been updated to ${formattedTime}. Reply CONFIRM or CANCEL.`;

    await sendSms(phone_number, messageBody);

    // Mark message_sent = true
    await supabase.from("appointments").update({ message_sent: true }).eq("id", id);

    return res.json({ ...data, message_sent: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id
app.delete("/api/appointments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch existing appointment to enforce 2-hour cutoff
    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const msUntilAppt = new Date(existing.appointment_time).getTime() - Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (msUntilAppt < twoHoursMs) {
      return res.status(403).json({
        error: "Cannot delete an appointment less than 2 hours before its scheduled time.",
      });
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(500).json({ error: "Failed to delete appointment" });
    }

    console.log(`Appointment ${id} deleted by user.`);
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments
app.get("/api/appointments", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ error: "Failed to fetch appointments" });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startReminderJob();
});
