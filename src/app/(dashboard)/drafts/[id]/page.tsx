"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn, formatPrice, formatDate, extractTimeHHMM, formatPickupTime, normalizePickupTime } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import type { ListingDraft, FulfillmentType } from "@/types/database";
import {
  Check,
  Edit3,
  Eye,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  Send,
} from "lucide-react";

type Phase = "review" | "edit" | "publish" | "success";

const CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Herbs",
  "Dairy",
  "Eggs",
  "Meat",
  "Flowers",
  "Other",
] as const;

const FULFILLMENT_OPTIONS: { value: FulfillmentType; label: string }[] = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
  { value: "both", label: "Both" },
];

interface VoiceNoteData {
  transcript_raw: string | null;
  transcript_clean: string | null;
}

export default function DraftReviewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const draftId = params.id as string;

  const [phase, setPhase] = useState<Phase>("review");
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [voiceNote, setVoiceNote] = useState<VoiceNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    listingId: string;
    notifiedCount: number;
  } | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<ListingDraft>>({});

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  async function loadDraft() {
    setLoading(true);
    setError(null);

    try {
      const { data: draftData, error: draftErr } = await supabase
        .from("listing_drafts")
        .select("*")
        .eq("id", draftId)
        .single();

      if (draftErr || !draftData) {
        setError("Draft not found. It may have been deleted or already published.");
        setLoading(false);
        return;
      }

      setDraft(draftData as ListingDraft);
      initEditForm(draftData as ListingDraft);

      // Load voice note transcript if available
      if (draftData.voice_note_id) {
        const { data: vnData } = await supabase
          .from("voice_notes")
          .select("transcript_raw, transcript_clean")
          .eq("id", draftData.voice_note_id)
          .single();

        if (vnData) {
          setVoiceNote(vnData as VoiceNoteData);
        }
      }
    } catch {
      setError("Failed to load draft. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function initEditForm(d: ListingDraft) {
    setEditForm({
      product_name: d.product_name,
      category: d.category,
      description: d.description,
      quantity_available: d.quantity_available,
      quantity_unit: d.quantity_unit,
      price_amount: d.price_amount,
      price_unit: d.price_unit,
      harvest_date: d.harvest_date,
      fulfillment_type: d.fulfillment_type,
      pickup_location: d.pickup_location,
      pickup_start_time: extractTimeHHMM(d.pickup_start_time) || d.pickup_start_time,
      pickup_end_time: extractTimeHHMM(d.pickup_end_time) || d.pickup_end_time,
    });
  }

  function isMissingField(fieldName: string): boolean {
    if (!draft?.missing_fields_json) return false;
    return draft.missing_fields_json.includes(fieldName);
  }

  async function handleSaveEdits() {
    if (!draft) return;
    setError(null);

    try {
      const { data: updated, error: updateErr } = await supabase
        .from("listing_drafts")
        .update({
          product_name: editForm.product_name,
          title: editForm.product_name
            ? `${editForm.product_name}${editForm.quantity_available ? ` - ${editForm.quantity_available} ${editForm.quantity_unit || ""}`.trim() : ""}`
            : draft.title,
          category: editForm.category,
          description: editForm.description,
          quantity_available: editForm.quantity_available,
          quantity_unit: editForm.quantity_unit,
          price_amount: editForm.price_amount,
          price_unit: editForm.price_unit,
          harvest_date: editForm.harvest_date,
          fulfillment_type: editForm.fulfillment_type as FulfillmentType,
          pickup_location: editForm.pickup_location,
          pickup_start_time: normalizePickupTime(editForm.pickup_start_time),
          pickup_end_time: normalizePickupTime(editForm.pickup_end_time),
          missing_fields_json: [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId)
        .select()
        .single();

      if (updateErr || !updated) {
        setError("Failed to save changes. Please try again.");
        return;
      }

      setDraft(updated as ListingDraft);
      setPhase("review");
    } catch {
      setError("Failed to save changes. Please try again.");
    }
  }

  async function handleRegenerate() {
    if (!voiceNote?.transcript_clean && !voiceNote?.transcript_raw) return;

    setRegenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          transcript: voiceNote.transcript_clean || voiceNote.transcript_raw,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to regenerate");
      }

      const { draft: newDraft } = await res.json();
      setDraft(newDraft as ListingDraft);
      initEditForm(newDraft as ListingDraft);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate listing.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch("/api/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to publish listing");
      }

      const result = await res.json();
      setPublishResult(result);
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function updateField<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  // --- Field highlight wrapper ---
  function FieldRow({
    label,
    fieldName,
    children,
  }: {
    label: string;
    fieldName: string;
    children: React.ReactNode;
  }) {
    const missing = isMissingField(fieldName);
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100 last:border-b-0",
          missing && "rounded-lg border border-amber-300 bg-amber-50/50 px-3 -mx-3 mb-1"
        )}
      >
        <span className="text-sm font-medium text-[#2E2E2E]/50 sm:w-36 sm:flex-shrink-0 flex items-center gap-1.5">
          {missing && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
          {label}
        </span>
        <span className="text-sm text-[#2E2E2E] font-medium flex-1">{children}</span>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-[#3A7D44]/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-[#3A7D44] animate-spin" />
        </div>
        <p className="text-sm text-[#2E2E2E]/60">Loading draft...</p>
      </div>
    );
  }

  // --- Error / not found ---
  if (!draft) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-sm text-[#2E2E2E]/70 text-center max-w-xs">
          {error || "Draft not found."}
        </p>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // --- PHASE: SUCCESS ---
  if (phase === "success" && publishResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        {/* Animated checkmark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[#3A7D44] flex items-center justify-center animate-[scaleIn_0.4s_ease-out]">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 rounded-full bg-[#3A7D44]/20 animate-ping" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Your listing is live!</h1>
          <p className="text-[#2E2E2E]/60 text-sm">
            {publishResult.notifiedCount > 0
              ? `${publishResult.notifiedCount} buyer${publishResult.notifiedCount === 1 ? " has" : "s have"} been notified`
              : "Buyers will see your listing when they browse"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => router.push(`/listings/${publishResult.listingId}`)}
          >
            <Eye className="w-4 h-4" />
            View Listing
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => router.push("/record")}
          >
            <Sparkles className="w-4 h-4" />
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  // --- PHASE: PUBLISH confirmation ---
  if (phase === "publish") {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setPhase("review")}
          className="flex items-center gap-1.5 text-sm text-[#2E2E2E]/60 hover:text-[#2E2E2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to review
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Ready to publish?</h1>
          <p className="text-sm text-[#2E2E2E]/60">
            Review your listing one last time before going live.
          </p>
        </div>

        {/* Final preview card */}
        <Card className="overflow-hidden">
          <div className="bg-[#3A7D44]/5 px-6 py-4 border-b border-[#3A7D44]/10">
            <h2 className="text-lg font-bold text-[#2E2E2E]">{draft.title}</h2>
            {draft.category && (
              <Badge variant="success" className="mt-1">
                {draft.category}
              </Badge>
            )}
          </div>
          <div className="px-6 py-4 space-y-3">
            {draft.description && (
              <p className="text-sm text-[#2E2E2E]/70">{draft.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[#2E2E2E]/50 block">Quantity</span>
                <span className="font-semibold text-[#2E2E2E]">
                  {draft.quantity_available
                    ? `${draft.quantity_available} ${draft.quantity_unit || ""}`
                    : "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-[#2E2E2E]/50 block">Price</span>
                <span className="font-semibold text-[#2E2E2E]">
                  {formatPrice(draft.price_amount, draft.price_unit)}
                </span>
              </div>
              {draft.harvest_date && (
                <div>
                  <span className="text-[#2E2E2E]/50 block">Harvest Date</span>
                  <span className="font-semibold text-[#2E2E2E]">
                    {formatDate(draft.harvest_date)}
                  </span>
                </div>
              )}
              {draft.fulfillment_type && (
                <div>
                  <span className="text-[#2E2E2E]/50 block">Fulfillment</span>
                  <span className="font-semibold text-[#2E2E2E] capitalize">
                    {draft.fulfillment_type}
                  </span>
                </div>
              )}
            </div>
            {draft.pickup_location && (
              <div className="text-sm">
                <span className="text-[#2E2E2E]/50 block">Pickup Location</span>
                <span className="font-semibold text-[#2E2E2E]">{draft.pickup_location}</span>
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-sm text-[#2E2E2E]/50">
          Buyers will be notified instantly
        </p>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handlePublish}
          loading={publishing}
        >
          <Send className="w-4 h-4" />
          Publish Listing
        </Button>
      </div>
    );
  }

  // --- PHASE: EDIT ---
  if (phase === "edit") {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => {
            if (draft) initEditForm(draft);
            setPhase("review");
          }}
          className="flex items-center gap-1.5 text-sm text-[#2E2E2E]/60 hover:text-[#2E2E2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to review
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#2E2E2E]">Edit Listing Details</h1>
          {voiceNote && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
              loading={regenerating}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Regenerate
            </Button>
          )}
        </div>

        <Card>
          <div className="space-y-4">
            <Input
              id="product_name"
              label="Product Name"
              value={editForm.product_name || ""}
              onChange={(e) => updateField("product_name", e.target.value)}
              placeholder="e.g. Roma Tomatoes"
            />

            {/* Category select */}
            <div className="w-full">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
              >
                Category
              </label>
              <select
                id="category"
                value={editForm.category || ""}
                onChange={(e) => updateField("category", e.target.value || null)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44]"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="w-full">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={editForm.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe your produce..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44] resize-none"
              />
            </div>

            {/* Quantity row */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="quantity_available"
                label="Quantity"
                type="number"
                value={editForm.quantity_available ?? ""}
                onChange={(e) =>
                  updateField(
                    "quantity_available",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="e.g. 20"
              />
              <Input
                id="quantity_unit"
                label="Unit"
                value={editForm.quantity_unit || ""}
                onChange={(e) => updateField("quantity_unit", e.target.value)}
                placeholder="e.g. lbs"
              />
            </div>

            {/* Price row */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="price_amount"
                label="Price"
                type="number"
                step="0.01"
                value={editForm.price_amount ?? ""}
                onChange={(e) =>
                  updateField("price_amount", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 3.00"
              />
              <Input
                id="price_unit"
                label="Per"
                value={editForm.price_unit || ""}
                onChange={(e) => updateField("price_unit", e.target.value)}
                placeholder="e.g. lb"
              />
            </div>

            {/* Harvest date */}
            <Input
              id="harvest_date"
              label="Harvest Date"
              type="date"
              value={editForm.harvest_date?.split("T")[0] || ""}
              onChange={(e) =>
                updateField("harvest_date", e.target.value ? e.target.value : null)
              }
            />

            {/* Fulfillment type */}
            <div className="w-full">
              <label
                htmlFor="fulfillment_type"
                className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
              >
                Fulfillment Type
              </label>
              <select
                id="fulfillment_type"
                value={editForm.fulfillment_type || ""}
                onChange={(e) =>
                  updateField("fulfillment_type", (e.target.value || null) as FulfillmentType | null)
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F7F6F2]/50 text-[#2E2E2E] transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44]"
              >
                <option value="">Select type</option>
                {FULFILLMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pickup location */}
            <Input
              id="pickup_location"
              label="Pickup Location"
              value={editForm.pickup_location || ""}
              onChange={(e) => updateField("pickup_location", e.target.value)}
              placeholder="e.g. Farm gate, 123 Rural Rd"
            />

            {/* Pickup time window */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="pickup_start_time"
                label="Pickup Start"
                type="time"
                value={editForm.pickup_start_time || ""}
                onChange={(e) => updateField("pickup_start_time", e.target.value || null)}
              />
              <Input
                id="pickup_end_time"
                label="Pickup End"
                type="time"
                value={editForm.pickup_end_time || ""}
                onChange={(e) => updateField("pickup_end_time", e.target.value || null)}
              />
            </div>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              if (draft) initEditForm(draft);
              setPhase("review");
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSaveEdits}>
            <Check className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  // --- PHASE: REVIEW (default) ---
  const confidence = draft.ai_confidence ?? 0;
  const confidencePercent = Math.round(confidence * 100);
  const hasMissingFields =
    draft.missing_fields_json && draft.missing_fields_json.length > 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#2E2E2E]/60 hover:text-[#2E2E2E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#DFAF2B]" />
          <h1 className="text-xl font-bold text-[#2E2E2E]">AI-Generated Listing</h1>
        </div>
        <p className="text-sm text-[#2E2E2E]/60">
          Review the details below. Edit anything that looks off before publishing.
        </p>
      </div>

      {/* AI Confidence indicator */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#2E2E2E]/50">AI Confidence</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              confidencePercent >= 80
                ? "bg-[#3A7D44]"
                : confidencePercent >= 50
                  ? "bg-[#DFAF2B]"
                  : "bg-red-400"
            )}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            confidencePercent >= 80
              ? "text-[#3A7D44]"
              : confidencePercent >= 50
                ? "text-[#DFAF2B]"
                : "text-red-500"
          )}
        >
          {confidencePercent}%
        </span>
      </div>

      {/* Missing fields warning */}
      {hasMissingFields && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Some fields need your attention
            </p>
            <p className="text-xs text-amber-700/70 mt-0.5">
              Fields highlighted in yellow could not be confidently extracted from your
              voice note.
            </p>
          </div>
        </div>
      )}

      {/* Listing preview card */}
      <Card padding="none">
        {/* Card header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#2E2E2E]">{draft.title}</h2>
          {draft.category && (
            <Badge variant="success" className="mt-1.5">
              {draft.category}
            </Badge>
          )}
        </div>

        {/* Fields */}
        <div className="px-6 py-4">
          <FieldRow label="Product Name" fieldName="product_name">
            {draft.product_name}
          </FieldRow>

          <FieldRow label="Category" fieldName="category">
            {draft.category ? (
              <span className="capitalize">{draft.category}</span>
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Quantity" fieldName="quantity_available">
            {draft.quantity_available ? (
              `${draft.quantity_available} ${draft.quantity_unit || ""}`
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Price" fieldName="price_amount">
            {draft.price_amount ? (
              formatPrice(draft.price_amount, draft.price_unit)
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Harvest Date" fieldName="harvest_date">
            {draft.harvest_date ? (
              formatDate(draft.harvest_date)
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Fulfillment" fieldName="fulfillment_type">
            {draft.fulfillment_type ? (
              <span className="capitalize">{draft.fulfillment_type}</span>
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Pickup Location" fieldName="pickup_location">
            {draft.pickup_location || (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Pickup Times" fieldName="pickup_start_time">
            {draft.pickup_start_time && draft.pickup_end_time ? (
              `${formatPickupTime(draft.pickup_start_time)} - ${formatPickupTime(draft.pickup_end_time)}`
            ) : draft.pickup_start_time ? (
              `From ${formatPickupTime(draft.pickup_start_time)}`
            ) : (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>

          <FieldRow label="Description" fieldName="description">
            {draft.description || (
              <span className="text-[#2E2E2E]/30 italic">Not specified</span>
            )}
          </FieldRow>
        </div>
      </Card>

      {/* Original transcript (collapsible) */}
      {voiceNote && (voiceNote.transcript_raw || voiceNote.transcript_clean) && (
        <Card padding="none">
          <button
            onClick={() => setTranscriptOpen(!transcriptOpen)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/50 transition-colors"
          >
            <span className="text-sm font-medium text-[#2E2E2E]/70">
              Original Transcript
            </span>
            {transcriptOpen ? (
              <ChevronUp className="w-4 h-4 text-[#2E2E2E]/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#2E2E2E]/40" />
            )}
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              transcriptOpen ? "max-h-96" : "max-h-0"
            )}
          >
            <div className="px-6 pb-4">
              <p className="text-sm text-[#2E2E2E]/60 leading-relaxed bg-[#F7F6F2] rounded-lg p-4 italic">
                &ldquo;{voiceNote.transcript_clean || voiceNote.transcript_raw}&rdquo;
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => setPhase("edit")}
        >
          <Edit3 className="w-4 h-4" />
          Edit Details
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={() => setPhase("publish")}
        >
          <Send className="w-4 h-4" />
          Publish Listing
        </Button>
      </div>
    </div>
  );
}
