import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "../env";
import { createSupabaseFetch } from "./fetch";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  global: { fetch: createSupabaseFetch() },
});
