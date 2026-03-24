"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sprout } from "lucide-react";

type Tab = "farmer" | "buyer";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("farmer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Farmer-specific fields (shown after selecting "I'm a Farmer")
  const [farmName, setFarmName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showFarmFields, setShowFarmFields] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // For farmers, store farm info in localStorage so we can use it after redirect
      if (activeTab === "farmer") {
        if (!farmName || !city || !state) {
          setShowFarmFields(true);
          setLoading(false);
          return;
        }
        localStorage.setItem(
          "fieldcast_farm_setup",
          JSON.stringify({ farm_name: farmName, farm_city: city, farm_state: state })
        );
      }

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?role=${activeTab}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (authError) throw authError;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#3A7D44] rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#2E2E2E]">FieldCast</h1>
          </div>
          <p className="text-[#2E2E2E]/60 text-sm">
            Speak your harvest. Sell it faster.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => {
                setActiveTab("farmer");
                setShowFarmFields(false);
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                activeTab === "farmer"
                  ? "text-[#3A7D44]"
                  : "text-[#2E2E2E]/40 hover:text-[#2E2E2E]/60"
              }`}
            >
              I&apos;m a Farmer
              {activeTab === "farmer" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3A7D44]" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("buyer");
                setShowFarmFields(false);
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                activeTab === "buyer"
                  ? "text-[#3A7D44]"
                  : "text-[#2E2E2E]/40 hover:text-[#2E2E2E]/60"
              }`}
            >
              I&apos;m a Buyer
              {activeTab === "buyer" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3A7D44]" />
              )}
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Farmer-specific fields */}
            {activeTab === "farmer" && showFarmFields && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-[#2E2E2E]/60">
                  Tell us about your farm before signing in:
                </p>
                <div>
                  <label
                    htmlFor="farmName"
                    className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
                  >
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
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
                    >
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
                    <label
                      htmlFor="state"
                      className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
                    >
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
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-[#2E2E2E] font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <p className="text-xs text-center text-[#2E2E2E]/40 pt-2">
              {activeTab === "farmer"
                ? "Sign in to start publishing your harvest from the field."
                : "Sign in to browse fresh local produce and get notified."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
