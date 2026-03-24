import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // During build time these will be empty strings - that's fine,
  // client components only execute in the browser at runtime.
  client = createBrowserClient(supabaseUrl, supabaseKey);
  return client;
}
