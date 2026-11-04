import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false
};

export const supabaseAuth = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: authOptions });

export function createUserClient(accessToken) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}
