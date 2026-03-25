import { describe, it, expect, vi } from "vitest";
import { NotificationDispatcher } from "@/lib/notifications/dispatcher";
import type { ChannelAdapter, NotificationJob, DeliveryResult } from "@/lib/notifications/types";

// --- Mock adapter that always succeeds ---
class SuccessAdapter implements ChannelAdapter {
  channel = "email" as const;
  sendCount = 0;
  async send(): Promise<DeliveryResult> {
    this.sendCount++;
    return { success: true };
  }
}

// --- Mock adapter that fails N times then succeeds ---
class FlakeyAdapter implements ChannelAdapter {
  channel = "email" as const;
  callCount = 0;
  failCount: number;

  constructor(failCount: number) {
    this.failCount = failCount;
  }

  async send(): Promise<DeliveryResult> {
    this.callCount++;
    if (this.callCount <= this.failCount) {
      return { success: false, error: `Fail #${this.callCount}` };
    }
    return { success: true };
  }
}

// --- Mock adapter that always fails ---
class AlwaysFailAdapter implements ChannelAdapter {
  channel = "email" as const;
  callCount = 0;
  async send(): Promise<DeliveryResult> {
    this.callCount++;
    return { success: false, error: "Always fails" };
  }
}

// --- Minimal mock Supabase client ---
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const notifications: Array<{ id: string; subscription_id: string; channel: string; delivery_status: string; sent_at: string | null }> = [];
  let notifIdCounter = 0;

  return {
    from: (table: string) => {
      if (table === "buyer_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: overrides.subscriptions ?? [],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            in: () => ({
              data: overrides.users ?? [],
              error: null,
            }),
          }),
        };
      }
      if (table === "farms") {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({
                data: overrides.farm ?? { farm_name: "Test Farm" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: (records: Array<Record<string, unknown>>) => {
            const created = records.map((r) => {
              notifIdCounter++;
              const notif = {
                id: `notif-${notifIdCounter}`,
                subscription_id: r.subscription_id as string,
                channel: r.channel as string,
                delivery_status: r.delivery_status as string,
                sent_at: null,
              };
              notifications.push(notif);
              return notif;
            });
            return {
              select: () => ({
                data: created,
                error: null,
              }),
            };
          },
          update: (data: Record<string, unknown>) => ({
            eq: () => {
              const id = Object.values(data)[0]; // simplified
              const notif = notifications.find((n) => n.id === id);
              if (notif) {
                Object.assign(notif, data);
              }
              return { error: null };
            },
          }),
        };
      }
      return {};
    },
    _notifications: notifications,
  };
}

describe("NotificationDispatcher", () => {
  it("delivers to all matching subscribers", async () => {
    const adapter = new SuccessAdapter();
    const dispatcher = new NotificationDispatcher([adapter]);

    const mockDb = createMockSupabase({
      subscriptions: [
        { id: "sub-1", user_id: "user-1", notification_channel: "email", category: null, product_keyword: null },
        { id: "sub-2", user_id: "user-2", notification_channel: "email", category: null, product_keyword: null },
      ],
      users: [
        { id: "user-1", email: "buyer1@test.com", phone: null },
        { id: "user-2", email: "buyer2@test.com", phone: null },
      ],
    });

    const result = await dispatcher.publishAndNotify(
      mockDb as any,
      "listing-1",
      "farm-1",
      "Test Farm",
      "Fresh Tomatoes",
      "vegetables",
      "Tomatoes"
    );

    expect(result.notifiedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(adapter.sendCount).toBe(2);
  });

  it("filters subscriptions by category", async () => {
    const adapter = new SuccessAdapter();
    const dispatcher = new NotificationDispatcher([adapter]);

    const mockDb = createMockSupabase({
      subscriptions: [
        { id: "sub-1", user_id: "user-1", notification_channel: "email", category: "vegetables", product_keyword: null },
        { id: "sub-2", user_id: "user-2", notification_channel: "email", category: "fruits", product_keyword: null },
      ],
      users: [
        { id: "user-1", email: "buyer1@test.com", phone: null },
        { id: "user-2", email: "buyer2@test.com", phone: null },
      ],
    });

    const result = await dispatcher.publishAndNotify(
      mockDb as any,
      "listing-1",
      "farm-1",
      "Test Farm",
      "Fresh Tomatoes",
      "vegetables",
      "Tomatoes"
    );

    expect(result.notifiedCount).toBe(1); // Only sub-1 matches
    expect(adapter.sendCount).toBe(1);
  });

  it("retries on temporary failures then succeeds", async () => {
    const adapter = new FlakeyAdapter(2); // Fails twice, then succeeds
    const dispatcher = new NotificationDispatcher([adapter]);

    const mockDb = createMockSupabase({
      subscriptions: [
        { id: "sub-1", user_id: "user-1", notification_channel: "email", category: null, product_keyword: null },
      ],
      users: [
        { id: "user-1", email: "buyer1@test.com", phone: null },
      ],
    });

    const result = await dispatcher.publishAndNotify(
      mockDb as any,
      "listing-1",
      "farm-1",
      "Test Farm",
      "Test Listing",
      null,
      null
    );

    expect(result.notifiedCount).toBe(1);
    expect(adapter.callCount).toBe(3); // 2 fails + 1 success
  });

  it("dead-letters after max retries exceeded", async () => {
    const adapter = new AlwaysFailAdapter();
    const dispatcher = new NotificationDispatcher([adapter]);

    const mockDb = createMockSupabase({
      subscriptions: [
        { id: "sub-1", user_id: "user-1", notification_channel: "email", category: null, product_keyword: null },
      ],
      users: [
        { id: "user-1", email: "buyer1@test.com", phone: null },
      ],
    });

    const result = await dispatcher.publishAndNotify(
      mockDb as any,
      "listing-1",
      "farm-1",
      "Test Farm",
      "Test Listing",
      null,
      null
    );

    expect(result.notifiedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(adapter.callCount).toBe(3); // 3 attempts
  });

  it("returns zero counts when no subscriptions match", async () => {
    const adapter = new SuccessAdapter();
    const dispatcher = new NotificationDispatcher([adapter]);

    const mockDb = createMockSupabase({
      subscriptions: [],
    });

    const result = await dispatcher.publishAndNotify(
      mockDb as any,
      "listing-1",
      "farm-1",
      "Test Farm",
      "Test Listing",
      null,
      null
    );

    expect(result.notifiedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(adapter.sendCount).toBe(0);
  });
});
