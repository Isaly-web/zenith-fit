// "Delete my data": deletes the signed-in person's Nordvital data and nothing else.
//
// zenith_fit.delete_account_app_data() (supabase/migrations/20261105120000_*.sql) deletes the rows
// in one transaction. The app stores no files. The shared Isaly login (auth.users) is NEVER
// deleted from here: it is shared by every Isaly app. Signing out uses scope "local" so the
// person stays signed in in the other Isaly apps.
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = {
  rpc: SupabaseClient["rpc"];
  auth: { signOut: (opts?: { scope?: "local" | "global" | "others" }) => Promise<unknown> };
};

export async function deleteMyData(client: Client): Promise<void> {
  const { error } = await client.rpc("delete_account_app_data" as never);
  if (error) throw new Error((error as { message: string }).message);
  await client.auth.signOut({ scope: "local" });
}
