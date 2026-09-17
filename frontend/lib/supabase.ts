import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookieStorage } from "./cookie-storage";

// Client-side architecture: supabase-js pointed at a
// GoTrue-compatible auth API + PostgREST-compatible REST API. Ours is the
// local controllable backend, proxied under /sb by next.config rewrites.
// The anon key is the public publishable key; the
// local backend does not gate on it but keeping the wire identical matters.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdnFlYXZudm5tZmxpcXR3d3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzQ1MTYsImV4cCI6MjA3NzY1MDUxNn0.8C39VTP_UQ-I0tkVnM9IsBz9s6U-RKhhxjbCpS6Ugm4";

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(siteOrigin() + "/sb", ANON_KEY, {
      auth: {
        storage: cookieStorage,
        storageKey: "sb-auth", // -> cookie `sb-auth-auth-token`, same as source
        flowType: "implicit",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
