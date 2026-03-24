import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MapPin, Clock, Truck, ArrowLeft, Bell, Leaf } from "lucide-react";
import type { Listing } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("listings")
    .select("*, farm:farms(*)")
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  const listing = data as Listing;
  const isExpired =
    listing.expires_at && new Date(listing.expires_at) < new Date();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1.5 text-sm text-[#2E2E2E]/60 hover:text-[#3A7D44] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listings
      </Link>

      {/* Expired banner */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 flex-shrink-0" />
          This listing has expired and may no longer be available.
        </div>
      )}

      {/* Main listing card */}
      <Card padding="lg" className="space-y-6">
        {/* Category + timestamp */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {listing.category && (
              <Badge variant="success">{listing.category}</Badge>
            )}
            {listing.fulfillment_type && (
              <Badge variant="default">
                <Truck className="w-3 h-3 mr-1 inline" />
                {listing.fulfillment_type === "both"
                  ? "Pickup & Delivery"
                  : listing.fulfillment_type === "pickup"
                    ? "Pickup"
                    : "Delivery"}
              </Badge>
            )}
          </div>
          <span className="text-xs text-[#2E2E2E]/40 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Listed {formatDate(listing.published_at)}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2E2E2E]">
            {listing.title || listing.product_name}
          </h1>
          {listing.title && listing.title !== listing.product_name && (
            <p className="text-[#2E2E2E]/50 text-sm mt-1">
              {listing.product_name}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="text-3xl font-bold text-[#3A7D44]">
          {formatPrice(listing.price_amount, listing.price_unit)}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-[#2E2E2E]/70 leading-relaxed">
            {listing.description}
          </p>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listing.quantity_available != null && (
            <DetailItem
              label="Quantity Available"
              value={`${listing.quantity_available} ${listing.quantity_unit ?? "units"}`}
            />
          )}
          {listing.harvest_date && (
            <DetailItem
              label="Harvest Date"
              value={formatDate(listing.harvest_date)}
              icon={<Leaf className="w-4 h-4 text-[#3A7D44]" />}
            />
          )}
          {listing.expires_at && (
            <DetailItem
              label="Available Until"
              value={formatDate(listing.expires_at)}
              icon={<Clock className="w-4 h-4 text-[#DFAF2B]" />}
            />
          )}
        </div>

        {/* Pickup window */}
        {(listing.pickup_start_time || listing.pickup_end_time) && (
          <div className="bg-[#F7F6F2] rounded-xl p-4 space-y-1">
            <h3 className="text-sm font-semibold text-[#2E2E2E]/70 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Pickup Window
            </h3>
            <p className="text-[#2E2E2E] font-medium">
              {listing.pickup_start_time && listing.pickup_end_time
                ? `${listing.pickup_start_time} - ${listing.pickup_end_time}`
                : listing.pickup_start_time || listing.pickup_end_time}
            </p>
            {listing.pickup_location && (
              <p className="text-sm text-[#2E2E2E]/60 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {listing.pickup_location}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Farm info section */}
      {listing.farm && (
        <Card padding="lg" className="space-y-4">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">
            About the Farm
          </h2>
          <div className="space-y-2">
            <Link
              href={`/farms/${listing.farm.id}`}
              className="text-xl font-bold text-[#3A7D44] hover:underline"
            >
              {listing.farm.farm_name}
            </Link>
            <p className="text-[#2E2E2E]/50 flex items-center gap-1 text-sm">
              <MapPin className="w-4 h-4" />
              {listing.farm.city}, {listing.farm.state}
            </p>
            {listing.farm.description && (
              <p className="text-[#2E2E2E]/70 text-sm leading-relaxed">
                {listing.farm.description}
              </p>
            )}
            {listing.farm.pickup_instructions && (
              <div className="bg-[#F7F6F2] rounded-xl p-4 mt-3">
                <h3 className="text-sm font-semibold text-[#2E2E2E]/70 flex items-center gap-1.5 mb-1">
                  <Truck className="w-4 h-4" />
                  Pickup Instructions
                </h3>
                <p className="text-sm text-[#2E2E2E]/70">
                  {listing.farm.pickup_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Subscribe button */}
          <Link
            href={`/subscribe?farmId=${listing.farm.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3A7D44] text-white font-semibold rounded-xl hover:bg-[#3A7D44]/90 transition-colors shadow-sm text-sm"
          >
            <Bell className="w-4 h-4" />
            Subscribe to {listing.farm.farm_name}
          </Link>
        </Card>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-[#2E2E2E]/40 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-[#2E2E2E] font-medium flex items-center gap-1.5">
        {icon}
        {value}
      </p>
    </div>
  );
}
