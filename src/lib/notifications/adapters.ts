import type { ChannelAdapter, NotificationJob, DeliveryResult } from "./types";

/**
 * Mock email adapter — logs instead of sending.
 * Replace with real provider (SendGrid, Resend, etc.) for production.
 */
export class MockEmailAdapter implements ChannelAdapter {
  channel = "email" as const;

  async send(job: NotificationJob): Promise<DeliveryResult> {
    console.log(
      `[Notification:Email] To: ${job.recipientEmail} | Farm: ${job.farmName} | Listing: ${job.listingTitle} | URL: ${job.listingUrl}`
    );
    // Simulate occasional failure for testing
    return { success: true };
  }
}

/**
 * Mock SMS adapter — logs instead of sending.
 * Replace with real provider (Twilio, etc.) for production.
 */
export class MockSmsAdapter implements ChannelAdapter {
  channel = "sms" as const;

  async send(job: NotificationJob): Promise<DeliveryResult> {
    console.log(
      `[Notification:SMS] To: ${job.recipientPhone} | Farm: ${job.farmName} | Listing: ${job.listingTitle} | URL: ${job.listingUrl}`
    );
    return { success: true };
  }
}
