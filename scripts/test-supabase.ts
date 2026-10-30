async function testSupabaseConnection(): Promise<void> {
  try {
    // Load the client here so configuration errors are handled without logging secrets.
    const { supabase } = await import("../src/config/supabase.js");
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .abortSignal(AbortSignal.timeout(10_000));

    if (error || count === null) {
      console.error("Supabase connection test failed. Check connectivity, credentials, and access to the users table.");
      process.exitCode = 1;
      return;
    }

    console.log(count);
  } catch {
    console.error("Supabase connection test failed. Check environment configuration and connectivity.");
    process.exitCode = 1;
  }
}

void testSupabaseConnection();
