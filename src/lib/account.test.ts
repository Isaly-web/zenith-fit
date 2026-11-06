import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteMyData } from "./account";

function makeClient(rpcError: { message: string } | null = null) {
  const calls: string[] = [];
  const client = {
    rpc: async (fn: string) => {
      calls.push(`rpc:${fn}`);
      return { data: null, error: rpcError };
    },
    auth: {
      signOut: async (o?: { scope?: string }) => {
        calls.push(`signOut:${o?.scope}`);
      },
    },
  };
  return { client: client as never, calls };
}

describe("deleteMyData", () => {
  it("deletes the rows, then signs out locally (never globally)", async () => {
    const { client, calls } = makeClient();
    await deleteMyData(client);
    expect(calls).toEqual(["rpc:delete_account_app_data", "signOut:local"]);
  });

  it("does not sign out when the deletion fails", async () => {
    const { client, calls } = makeClient({ message: "boom" });
    await expect(deleteMyData(client)).rejects.toThrow("boom");
    expect(calls).toEqual(["rpc:delete_account_app_data"]);
  });
});

describe("delete_account_app_data migration", () => {
  const dir = join(__dirname, "../../supabase/migrations");
  const init = readFileSync(join(dir, "20260821120000_zenith_fit_schema_init.sql"), "utf8");
  const fn = readFileSync(join(dir, "20261105120000_delete_account_app_data.sql"), "utf8").replace(
    /--.*$/gm,
    "",
  );

  it("never touches auth.users", () => {
    expect(fn).not.toMatch(/auth\.users/i);
  });

  it("covers every zenith_fit table that references auth.users", () => {
    const tables = new Set<string>();
    for (const m of init.matchAll(
      /create table (?:if not exists )?zenith_fit\.(\w+)\s*\(([\s\S]*?)\n\);/gi,
    )) {
      if (/references auth\.users/i.test(m[2]!)) tables.add(m[1]!);
    }
    expect(tables.size).toBeGreaterThan(0);
    for (const t of tables) expect(fn, `missing ${t}`).toMatch(new RegExp(`zenith_fit\\.${t}\\b`));
  });
});
