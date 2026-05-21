import { createClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────────────
//  This page runs on the SERVER by default (Next.js 14+ App Router).
//  It fetches data from Supabase before sending HTML to the browser.
// ──────────────────────────────────────────────────

type Profile = {
  id: number;
  role: string;
  full_name: string;
};

export default async function Home() {
  const supabase = await createClient();

  // Fetch all profiles (RLS must allow public reads — see SETUP_GUIDE.md SQL)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, role, full_name");

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black px-4 py-12">
      <main className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          🔥 Sizzling Hub
        </h1>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 mb-6">
            ⚠️ Supabase error: {error.message}
            <br />
            <span className="text-sm">
              Make sure your <code>.env.local</code> has the real Supabase keys
              and the <strong>profiles</strong> table exists.
            </span>
          </div>
        )}

        {!error && profiles && profiles.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700 mb-6">
            <strong>No profiles yet.</strong>
          </div>
        )}

        <div className="space-y-4">
          {profiles?.map((profile: Profile) => (
            <div
              key={profile.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {profile.full_name}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Role: {profile.role}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
