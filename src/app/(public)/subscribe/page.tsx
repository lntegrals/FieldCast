"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Bell, BellOff, Search, Mail, Phone } from "lucide-react";
import type { Farm, BuyerSubscription, NotificationChannel } from "@/types/database";

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const preselectedFarmId = searchParams.get("farmId");

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [subscriptions, setSubscriptions] = useState<BuyerSubscription[]>([]);
  const [farmSearch, setFarmSearch] = useState("");
  const [selectedFarmId, setSelectedFarmId] = useState(preselectedFarmId ?? "");
  const [category, setCategory] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("email");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchSubscriptions = useCallback(async () => {
    const res = await fetch("/api/subscriptions");
    if (res.ok) {
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? data ?? []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser ? { id: authUser.id } : null);

      if (authUser) {
        const { data: farmsData } = await supabase
          .from("farms")
          .select("*")
          .order("farm_name");
        setFarms((farmsData ?? []) as Farm[]);
        await fetchSubscriptions();
      }

      setLoading(false);
    }
    init();
  }, [supabase, fetchSubscriptions]);

  const filteredFarms = farms.filter((f) =>
    f.farm_name.toLowerCase().includes(farmSearch.toLowerCase())
  );

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          category: category || null,
          product_keyword: productKeyword || null,
          notification_channel: channel,
        }),
      });

      if (res.ok) {
        setSelectedFarmId("");
        setCategory("");
        setProductKeyword("");
        setFarmSearch("");
        await fetchSubscriptions();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnsubscribe(subscriptionId: string) {
    setDeletingId(subscriptionId);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subscriptionId }),
      });
      if (res.ok) {
        await fetchSubscriptions();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#3A7D44]/20 border-t-[#3A7D44] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3A7D44]/10 flex items-center justify-center">
          <Bell className="w-8 h-8 text-[#3A7D44]" />
        </div>
        <h1 className="text-2xl font-bold text-[#2E2E2E]">
          Get Notified About Fresh Produce
        </h1>
        <p className="text-[#2E2E2E]/60">
          Sign in to subscribe to your favorite farms and never miss a new
          harvest listing.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3A7D44] text-white font-semibold rounded-xl hover:bg-[#3A7D44]/90 transition-colors shadow-sm"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  const CATEGORIES = [
    "",
    "Vegetables",
    "Fruits",
    "Herbs",
    "Dairy",
    "Eggs",
    "Meat",
    "Flowers",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3A7D44]/10 text-[#3A7D44] text-sm font-medium">
          <Bell className="w-4 h-4" />
          Subscriptions
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2E2E2E]">
          Subscribe to Farms
        </h1>
        <p className="text-[#2E2E2E]/60">
          Get notified when your favorite farms post new listings.
        </p>
      </div>

      {/* Subscribe form */}
      <Card padding="lg">
        <form onSubmit={handleSubscribe} className="space-y-5">
          {/* Farm selector */}
          <div className="relative">
            <label className="block text-sm font-medium text-[#2E2E2E] mb-1.5">
              Select a Farm
            </label>
            {selectedFarm ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#3A7D44] bg-[#3A7D44]/5">
                <span className="font-medium text-[#2E2E2E]">
                  {selectedFarm.farm_name}
                  <span className="text-sm text-[#2E2E2E]/40 ml-2">
                    {selectedFarm.city}, {selectedFarm.state}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFarmId("");
                    setFarmSearch("");
                  }}
                  className="text-sm text-[#2E2E2E]/50 hover:text-red-500 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2E2E2E]/30" />
                <input
                  type="text"
                  placeholder="Search farms..."
                  value={farmSearch}
                  onChange={(e) => {
                    setFarmSearch(e.target.value);
                    setShowFarmDropdown(true);
                  }}
                  onFocus={() => setShowFarmDropdown(true)}
                  onBlur={() => setTimeout(() => setShowFarmDropdown(false), 200)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44]"
                />
                {showFarmDropdown && filteredFarms.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredFarms.map((farm) => (
                      <button
                        key={farm.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedFarmId(farm.id);
                          setShowFarmDropdown(false);
                          setFarmSearch("");
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#F7F6F2] transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="font-medium text-[#2E2E2E]">
                          {farm.farm_name}
                        </span>
                        <span className="text-sm text-[#2E2E2E]/40 ml-2">
                          {farm.city}, {farm.state}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-1.5">
              Category (optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat || "All categories"}
                </option>
              ))}
            </select>
          </div>

          {/* Product keyword */}
          <Input
            id="product-keyword"
            label="Product Keyword (optional)"
            placeholder='e.g. "tomatoes" or "eggs"'
            value={productKeyword}
            onChange={(e) => setProductKeyword(e.target.value)}
          />

          {/* Notification channel */}
          <fieldset>
            <legend className="block text-sm font-medium text-[#2E2E2E] mb-2">
              Notification Method
            </legend>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  channel === "email"
                    ? "border-[#3A7D44] bg-[#3A7D44]/5 text-[#3A7D44]"
                    : "border-gray-200 bg-white text-[#2E2E2E]/60 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={channel === "email"}
                  onChange={() => setChannel("email")}
                  className="sr-only"
                />
                <Mail className="w-4 h-4" />
                <span className="font-medium text-sm">Email</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  channel === "sms"
                    ? "border-[#3A7D44] bg-[#3A7D44]/5 text-[#3A7D44]"
                    : "border-gray-200 bg-white text-[#2E2E2E]/60 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value="sms"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                  className="sr-only"
                />
                <Phone className="w-4 h-4" />
                <span className="font-medium text-sm">SMS</span>
              </label>
            </div>
          </fieldset>

          <Button
            type="submit"
            loading={submitting}
            disabled={!selectedFarmId}
            className="w-full"
            size="lg"
          >
            <Bell className="w-4 h-4" />
            Subscribe
          </Button>
        </form>
      </Card>

      {/* Active subscriptions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">
          Your Subscriptions
          {subscriptions.length > 0 && (
            <span className="text-sm font-normal text-[#2E2E2E]/40 ml-2">
              {subscriptions.length}
            </span>
          )}
        </h2>

        {subscriptions.length === 0 ? (
          <Card padding="lg" className="text-center py-10">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#F7F6F2] flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-[#2E2E2E]/30" />
            </div>
            <p className="text-[#2E2E2E]/50 font-medium">
              No subscriptions yet
            </p>
            <p className="text-sm text-[#2E2E2E]/40 mt-1">
              Subscribe to a farm above to start getting notifications.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <Card
                key={sub.id}
                padding="sm"
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#2E2E2E] truncate">
                    {sub.farm?.farm_name ?? "Farm"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {sub.category && (
                      <Badge variant="success">{sub.category}</Badge>
                    )}
                    {sub.product_keyword && (
                      <Badge variant="default">{sub.product_keyword}</Badge>
                    )}
                    <Badge variant="default">
                      {sub.notification_channel === "email" ? (
                        <Mail className="w-3 h-3 mr-1 inline" />
                      ) : (
                        <Phone className="w-3 h-3 mr-1 inline" />
                      )}
                      {sub.notification_channel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingId === sub.id}
                  onClick={() => handleUnsubscribe(sub.id)}
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Unsubscribe
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
