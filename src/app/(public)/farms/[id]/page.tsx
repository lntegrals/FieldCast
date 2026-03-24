import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPin, Clock, Leaf, Bell, ArrowLeft } from "lucide-react";
import type { Farm, Listing } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("id", id)
    .single();

  if (!farm) {
    notFound();
  }

  const typedFarm = farm as Farm;

  const { data: listings } = await supabase
    .from("listings")
    .select("*, farm:farms(*)")
    .eq("farm_id", id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("published_at", { ascending: false });

  const typedListings = (listings ?? []) as Listing[];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1.5 text-sm text-[#2E2E2E]/60 hover:text-[#3A7D44] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listings
      </Link>

      {/* Farm header */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2E2E2E]">
              {typedFarm.farm_name}
            </h1>
            <p className="text-[#2E2E2E]/50 flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4" />
              {typedFarm.city}, {typedFarm.state}
            </p>
          </div>
          <Link
            href={`/subscribe?farmId=${typedFarm.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A7D44] text-white font-semibold rounded-xl hover:bg-[#3A7D44]/90 transition-colors shadow-sm text-sm"
          >
            <Bell className="w-4 h-4" />
            Subscribe
          </Link>
        </div>

        {typedFarm.description && (
          <p className="text-[#2E2E2E]/70 leading-relaxed">
            {typedFarm.description}
          </p>
        )}

        {typedFarm.pickup_instructions && (
          <div className="bg-[#F7F6F2] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[#2E2E2E]/70 mb-1">
              Pickup Instructions
            </h3>
            <p className="text-sm text-[#2E2E2E]/70">
              {typedFarm.pickup_instructions}
            </p>
          </div>
        )}
      </Card>

      {/* Active Listings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">
          Available Now
          {typedListings.length > 0 && (
            <span className="text-sm font-normal text-[#2E2E2E]/40 ml-2">
              {typedListings.length} listing{typedListings.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {typedListings.length === 0 ? (
          <Card padding="lg" className="text-center py-12">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#F7F6F2] flex items-center justify-center mb-3">
              <Leaf className="w-6 h-6 text-[#2E2E2E]/30" />
            </div>
            <p className="text-[#2E2E2E]/50 font-medium">
              No active listings right now
            </p>
            <p className="text-sm text-[#2E2E2E]/40 mt-1">
              Subscribe to get notified when new produce is listed.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {typedListings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card
                  padding="none"
                  className="hover:shadow-md hover:border-[#3A7D44]/20 transition-all group overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      {listing.category && (
                        <Badge variant="success">{listing.category}</Badge>
                      )}
                      <span className="text-xs text-[#2E2E2E]/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(listing.published_at)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[#2E2E2E] group-hover:text-[#3A7D44] transition-colors">
                      {listing.product_name}
                    </h3>

                    <div className="text-xl font-bold text-[#3A7D44]">
                      {formatPrice(listing.price_amount, listing.price_unit)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#2E2E2E]/60">
                      {listing.quantity_available != null && (
                        <span>
                          {listing.quantity_available}{" "}
                          {listing.quantity_unit ?? "units"} available
                        </span>
                      )}
                      {listing.harvest_date && (
                        <span className="flex items-center gap-1">
                          <Leaf className="w-3.5 h-3.5" />
                          Harvested {formatDate(listing.harvest_date)}
                        </span>
                      )}
                    </div>

                    {(listing.pickup_location || listing.farm?.city) && (
                      <div className="pt-3 border-t border-gray-100 text-sm text-[#2E2E2E]/40 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.pickup_location ||
                          `${listing.farm?.city}, ${listing.farm?.state}`}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
