import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelAdapter, NotificationJob, DeliveryStatus } from "./types";
import { MockEmailAdapter, MockSmsAdapter } from "./adapters";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000, 5000]; // Capped backoff

/**
 * Notification dispatcher. Handles:
 * - durable job creation on publish
 * - delivery via channel adapters
 * - retry with capped backoff
 * - state machine transitions: pending -> sending -> sent | failed -> dead_letter
 */
export class NotificationDispatcher {
  private adapters: Map<string, ChannelAdapter>;

  constructor(adapters?: ChannelAdapter[]) {
    this.adapters = new Map();
    const defaultAdapters: ChannelAdapter[] = adapters ?? [
      new MockEmailAdapter(),
      new MockSmsAdapter(),
    ];
    for (const adapter of defaultAdapters) {
      this.adapters.set(adapter.channel, adapter);
    }
  }

  /**
   * Create notification records for all matching subscriptions and dispatch.
   */
  async publishAndNotify(
    serviceClient: SupabaseClient,
    listingId: string,
    farmId: string,
    farmName: string,
    listingTitle: string,
    category: string | null,
    productName: string | null
  ): Promise<{ notifiedCount: number; failedCount: number }> {
    // Find matching active subscriptions
    const { data: subscriptions } = await serviceClient
      .from("buyer_subscriptions")
      .select("id, user_id, notification_channel, category, product_keyword")
      .eq("farm_id", farmId)
      .eq("is_active", true);

    if (!subscriptions || subscriptions.length === 0) {
      return { notifiedCount: 0, failedCount: 0 };
    }

    // Filter subscriptions by category/keyword match
    const matching = subscriptions.filter((sub) => {
      if (sub.category && category && sub.category !== category) return false;
      if (
        sub.product_keyword &&
        productName &&
        !productName.toLowerCase().includes(sub.product_keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    if (matching.length === 0) {
      return { notifiedCount: 0, failedCount: 0 };
    }

    // Fetch recipient info for all matched users
    const userIds = [...new Set(matching.map((s) => s.user_id))];
    const { data: users } = await serviceClient
      .from("users")
      .select("id, email, phone")
      .in("id", userIds);

    const userMap = new Map(
      (users ?? []).map((u) => [u.id, { email: u.email, phone: u.phone }])
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fieldcast.vercel.app";
    const listingUrl = `${appUrl}/listings/${listingId}`;

    // Create notification records
    const notifRecords = matching.map((sub) => ({
      subscription_id: sub.id,
      listing_id: listingId,
      channel: sub.notification_channel,
      delivery_status: "pending" as DeliveryStatus,
    }));

    const { data: notifications, error: insertError } = await serviceClient
      .from("notifications")
      .insert(notifRecords)
      .select("id, subscription_id, channel");

    if (insertError || !notifications) {
      console.error("[Notifications] Failed to create records:", insertError);
      return { notifiedCount: 0, failedCount: matching.length };
    }

    // Build jobs and dispatch
    let notifiedCount = 0;
    let failedCount = 0;

    for (const notif of notifications) {
      const sub = matching.find((s) => s.id === notif.subscription_id);
      if (!sub) continue;

      const recipient = userMap.get(sub.user_id);
      const job: NotificationJob = {
        id: notif.id,
        subscriptionId: sub.id,
        listingId,
        channel: notif.channel,
        recipientEmail: recipient?.email,
        recipientPhone: recipient?.phone,
        farmName,
        listingTitle,
        listingUrl,
      };

      const result = await this.deliverWithRetry(serviceClient, job);
      if (result) {
        notifiedCount++;
      } else {
        failedCount++;
      }
    }

    console.log(
      `[Notifications] Dispatched: ${notifiedCount} sent, ${failedCount} failed for listing ${listingId}`
    );

    return { notifiedCount, failedCount };
  }

  /**
   * Deliver a single notification with retry and state machine transitions.
   */
  private async deliverWithRetry(
    serviceClient: SupabaseClient,
    job: NotificationJob
  ): Promise<boolean> {
    const adapter = this.adapters.get(job.channel);
    if (!adapter) {
      console.error(`[Notifications] No adapter for channel: ${job.channel}`);
      await this.updateStatus(serviceClient, job.id, "dead_letter");
      return false;
    }

    // Mark as sending
    await this.updateStatus(serviceClient, job.id, "sending");

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await adapter.send(job);

        if (result.success) {
          await this.updateStatus(serviceClient, job.id, "sent");
          return true;
        }

        console.warn(
          `[Notifications] Delivery failed (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}):`,
          result.error
        );
      } catch (err) {
        console.error(
          `[Notifications] Delivery error (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}):`,
          err
        );
      }

      // Wait before retry (unless last attempt)
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt] ?? 5000));
      }
    }

    // All retries failed → dead letter
    await this.updateStatus(serviceClient, job.id, "dead_letter");
    console.error(
      `[Notifications] Dead-lettered notification ${job.id} after ${MAX_RETRY_ATTEMPTS} attempts`
    );
    return false;
  }

  private async updateStatus(
    serviceClient: SupabaseClient,
    notificationId: string,
    status: DeliveryStatus
  ) {
    const update: Record<string, unknown> = { delivery_status: status };
    if (status === "sent") {
      update.sent_at = new Date().toISOString();
    }

    await serviceClient
      .from("notifications")
      .update(update)
      .eq("id", notificationId);
  }
}

/** Singleton dispatcher instance. */
let _dispatcher: NotificationDispatcher | null = null;

export function getDispatcher(): NotificationDispatcher {
  if (!_dispatcher) {
    _dispatcher = new NotificationDispatcher();
  }
  return _dispatcher;
}
