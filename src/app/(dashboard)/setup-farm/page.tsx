"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sprout, Loader2 } from "lucide-react";

export default function SetupFarmPage() {
  const router = useRouter();
  const [farmName, setFarmName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSetup, setAutoSetup] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to read farm info from localStorage (set during login)
    const stored = localStorage.getItem("fieldcast_farm_setup");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFarmName(data.farm_name || "");
        setCity(data.farm_city || "");
        setState(data.farm_state || "");

        // Auto-submit if all fields are present
        if (data.farm_name && data.farm_city && data.farm_state) {
          createFarm(data.farm_name, data.farm_city, data.farm_state);
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }
    setAutoSetup(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createFarm(name: string, farmCity: string, farmState: string) {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error: insertError } = await supabase.from("farms").insert({
        owner_user_id: user.id,
        farm_name: name,
        city: farmCity,
        state: farmState,
      });

      if (insertError) throw insertError;

      localStorage.removeItem("fieldcast_farm_setup");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create farm. Please try again.";
      setError(message);
      setAutoSetup(false);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmName || !city || !state) return;
    await createFarm(farmName, city, state);
  }

  if (autoSetup) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#3A7D44] animate-spin mx-auto mb-4" />
          <p className="text-[#2E2E2E]/60">Setting up your farm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#3A7D44] rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#2E2E2E]">Set Up Your Farm</h1>
          </div>
          <p className="text-[#2E2E2E]/60 text-sm">
            Tell us about your farm to get started.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="farmName" className="block text-sm font-medium text-[#2E2E2E] mb-1.5">
                Farm Name
              </label>
              <input
                id="farmName"
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Green Valley Farm"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-[#2E2E2E] mb-1.5">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44] transition-all"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-[#2E2E2E] mb-1.5">
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44] transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#3A7D44] hover:bg-[#3A7D44]/90 disabled:bg-[#3A7D44]/50 text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Create Farm & Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
