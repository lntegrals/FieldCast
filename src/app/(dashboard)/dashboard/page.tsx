import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Mic, Package, Clock, TrendingUp, Plus } from "lucide-react";
import type { Listing, ListingDraft } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get farm
  const { data: farm } = await supabase
    .from("farms")
    .select("id, farm_name")
    .eq("owner_user_id", user.id)
    .single();

  if (!farm) {
    redirect("/login");
  }

  // Fetch active listings (not expired)
  const { data: activeListings } = await supabase
    .from("listings")
    .select("*")
    .eq("farm_id", farm.id)
    .gte("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  // Fetch total published count
  const { count: totalPublished } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farm.id);

  // Fetch pending drafts
  const { data: pendingDrafts } = await supabase
    .from("listing_drafts")
    .select("*")
    .eq("farm_id", farm.id)
    .in("status", ["draft", "review"])
    .order("updated_at", { ascending: false })
    .limit(5);

  const activeCount = activeListings?.length ?? 0;
  const draftCount = pendingDrafts?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome + Quick Action */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">
            Welcome back, {farm.farm_name}
          </h1>
          <p className="text-sm text-[#2E2E2E]/60 mt-1">
            Here&apos;s what&apos;s happening with your listings.
          </p>
        </div>
        <Link
          href="/record"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3A7D44] hover:bg-[#3A7D44]/90 text-white text-sm font-semibold shadow-sm transition-colors"
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">Record New Harvest</span>
          <span className="sm:hidden">Record</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="w-10 h-10 rounded-full bg-[#3A7D44]/10 flex items-center justify-center mx-auto mb-2">
            <Package className="w-5 h-5 text-[#3A7D44]" />
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E] tabular-nums">{activeCount}</p>
          <p className="text-xs text-[#2E2E2E]/50 mt-0.5">Active</p>
        </Card>
        <Card className="text-center">
          <div className="w-10 h-10 rounded-full bg-[#DFAF2B]/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-[#DFAF2B]" />
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E] tabular-nums">
            {totalPublished ?? 0}
          </p>
          <p className="text-xs text-[#2E2E2E]/50 mt-0.5">Published</p>
        </Card>
        <Card className="text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E] tabular-nums">{draftCount}</p>
          <p className="text-xs text-[#2E2E2E]/50 mt-0.5">Drafts</p>
        </Card>
      </div>

      {/* Active Listings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#2E2E2E]">Active Listings</h2>
          {activeCount > 0 && (
            <Link
              href="/listings"
              className="text-sm text-[#3A7D44] font-medium hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {activeCount === 0 ? (
          <Card className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-[#2E2E2E]/30" />
            </div>
            <p className="text-sm font-medium text-[#2E2E2E]/70">No active listings</p>
            <p className="text-xs text-[#2E2E2E]/40 mt-1">
              Record a voice note to create your first listing.
            </p>
            <Link
              href="/record"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#3A7D44] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Listing
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {(activeListings as Listing[]).map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#2E2E2E] truncate">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#2E2E2E]/50">
                        {listing.quantity_available && (
                          <span>
                            {listing.quantity_available} {listing.quantity_unit || ""}
                          </span>
                        )}
                        <span className="font-semibold text-[#3A7D44]">
                          {formatPrice(listing.price_amount, listing.price_unit)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="success">Live</Badge>
                      <p className="text-[10px] text-[#2E2E2E]/40 mt-1.5">
                        {timeAgo(listing.published_at)}
                      </p>
                      {listing.expires_at && (
                        <p className="text-[10px] text-[#2E2E2E]/40">
                          Expires {formatDate(listing.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Drafts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#2E2E2E]">Recent Drafts</h2>
        </div>

        {draftCount === 0 ? (
          <Card className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-[#2E2E2E]/30" />
            </div>
            <p className="text-sm font-medium text-[#2E2E2E]/70">No pending drafts</p>
            <p className="text-xs text-[#2E2E2E]/40 mt-1">
              When you record a voice note, your AI-generated draft will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {(pendingDrafts as ListingDraft[]).map((draft) => {
              const statusBadge =
                draft.status === "review" ? (
                  <Badge variant="warning">Needs Review</Badge>
                ) : (
                  <Badge>Draft</Badge>
                );

              return (
                <Link key={draft.id} href={`/drafts/${draft.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[#2E2E2E] truncate">
                          {draft.title || draft.product_name}
                        </h3>
                        <p className="text-xs text-[#2E2E2E]/40 mt-1">
                          {timeAgo(draft.updated_at)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">{statusBadge}</div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
