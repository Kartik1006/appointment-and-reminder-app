/*
  SUPABASE TABLE SQL — run this in your Supabase SQL editor:

  CREATE TABLE appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name text NOT NULL,
    phone_number text NOT NULL,
    appointment_time timestamptz NOT NULL,
    message_sent boolean DEFAULT false,
    reminder_sent boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  );
*/

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
