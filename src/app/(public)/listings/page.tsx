import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPin, Clock, Leaf, Search } from "lucide-react";
import type { Listing } from "@/types/database";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "All",
  "Vegetables",
  "Fruits",
  "Herbs",
  "Dairy",
  "Eggs",
  "Meat",
  "Flowers",
] as const;

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeCategory = params.category || "All";
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*, farm:farms(*)")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("published_at", { ascending: false });

  if (activeCategory !== "All") {
    query = query.ilike("category", activeCategory);
  }

  const { data: listings } = await query;
  const typedListings = (listings ?? []) as Listing[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3A7D44]/10 text-[#3A7D44] text-sm font-medium">
          <Leaf className="w-4 h-4" />
          Fresh &amp; Local
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2E2E2E]">
          Fresh from Local Farms
        </h1>
        <p className="text-[#2E2E2E]/60 max-w-lg mx-auto">
          Browse the latest harvests from farmers in your area. Updated daily by
          the people who grow your food.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={cat === "All" ? "/listings" : `/listings?category=${cat}`}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === cat
                ? "bg-[#3A7D44] text-white shadow-sm"
                : "bg-white text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-white/80 border border-gray-200"
            )}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Listings Grid */}
      {typedListings.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F7F6F2] flex items-center justify-center">
            <Search className="w-8 h-8 text-[#2E2E2E]/30" />
          </div>
          <h2 className="text-xl font-semibold text-[#2E2E2E]">
            No listings found
          </h2>
          <p className="text-[#2E2E2E]/50 max-w-sm mx-auto">
            {activeCategory !== "All"
              ? `No ${activeCategory.toLowerCase()} listings available right now. Try a different category.`
              : "No listings available right now. Check back soon for fresh produce from local farms."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {typedListings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`}>
              <Card
                padding="none"
                className="hover:shadow-md hover:border-[#3A7D44]/20 transition-all group overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Top row: category + time */}
                  <div className="flex items-center justify-between">
                    {listing.category && (
                      <Badge variant="success">{listing.category}</Badge>
                    )}
                    <span className="text-xs text-[#2E2E2E]/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(listing.published_at)}
                    </span>
                  </div>

                  {/* Product name */}
                  <h3 className="text-lg font-semibold text-[#2E2E2E] group-hover:text-[#3A7D44] transition-colors">
                    {listing.product_name}
                  </h3>

                  {/* Price */}
                  <div className="text-xl font-bold text-[#3A7D44]">
                    {formatPrice(listing.price_amount, listing.price_unit)}
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#2E2E2E]/60">
                    {listing.quantity_available != null && (
                      <span>
                        {listing.quantity_available} {listing.quantity_unit ?? "units"} available
                      </span>
                    )}
                    {listing.harvest_date && (
                      <span className="flex items-center gap-1">
                        <Leaf className="w-3.5 h-3.5" />
                        Harvested {formatDate(listing.harvest_date)}
                      </span>
                    )}
                  </div>

                  {/* Farm + pickup */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#2E2E2E]/70">
                      {listing.farm?.farm_name ?? "Local Farm"}
                    </span>
                    {(listing.pickup_location || listing.farm?.city) && (
                      <span className="text-[#2E2E2E]/40 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.pickup_location ||
                          `${listing.farm?.city}, ${listing.farm?.state}`}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Subscribe CTA */}
      <div className="text-center py-12 space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#DFAF2B]/15 flex items-center justify-center">
          <Leaf className="w-6 h-6 text-[#DFAF2B]" />
        </div>
        <h2 className="text-xl font-semibold text-[#2E2E2E]">
          Never miss a harvest
        </h2>
        <p className="text-[#2E2E2E]/50 max-w-md mx-auto">
          Subscribe to your favorite farms and get notified the moment new
          produce is listed.
        </p>
        <Link
          href="/subscribe"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3A7D44] text-white font-semibold rounded-xl hover:bg-[#3A7D44]/90 transition-colors shadow-sm"
        >
          Subscribe for updates
        </Link>
      </div>
    </div>
  );
}
