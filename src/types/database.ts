export type UserRole = "farmer" | "buyer";

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface Farm {
  id: string;
  owner_user_id: string;
  farm_name: string;
  description: string | null;
  city: string;
  state: string;
  pickup_instructions: string | null;
  created_at: string;
}

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

export interface VoiceNote {
  id: string;
  farm_id: string;
  audio_url: string;
  transcript_raw: string | null;
  transcript_clean: string | null;
  transcription_status: TranscriptionStatus;
  created_at: string;
}

export type DraftStatus = "draft" | "review" | "published" | "discarded";
export type FulfillmentType = "pickup" | "delivery" | "both";

export interface ListingDraft {
  id: string;
  farm_id: string;
  voice_note_id: string | null;
  title: string;
  category: string | null;
  product_name: string;
  description: string | null;
  quantity_available: number | null;
  quantity_unit: string | null;
  price_amount: number | null;
  price_unit: string | null;
  harvest_date: string | null;
  fulfillment_type: FulfillmentType | null;
  pickup_location: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  status: DraftStatus;
  ai_confidence: number | null;
  missing_fields_json: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  farm_id: string;
  draft_id: string | null;
  title: string;
  category: string | null;
  product_name: string;
  description: string | null;
  quantity_available: number | null;
  quantity_unit: string | null;
  price_amount: number | null;
  price_unit: string | null;
  harvest_date: string | null;
  fulfillment_type: FulfillmentType | null;
  pickup_location: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  farm?: Farm;
}

export type NotificationChannel = "email" | "sms";

export interface BuyerSubscription {
  id: string;
  user_id: string;
  farm_id: string;
  category: string | null;
  product_keyword: string | null;
  notification_channel: NotificationChannel;
  is_active: boolean;
  created_at: string;
  farm?: Farm;
}

export interface Notification {
  id: string;
  subscription_id: string;
  listing_id: string;
  channel: NotificationChannel;
  delivery_status: string;
  sent_at: string | null;
  created_at: string;
}
