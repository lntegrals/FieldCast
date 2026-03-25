export type DeliveryStatus = "pending" | "sending" | "sent" | "failed" | "dead_letter";
export type NotificationChannel = "email" | "sms";

export interface NotificationJob {
  id: string;
  subscriptionId: string;
  listingId: string;
  channel: NotificationChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  farmName: string;
  listingTitle: string;
  listingUrl: string;
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
}

/**
 * Channel adapter interface. Implement this for each delivery channel.
 */
export interface ChannelAdapter {
  channel: NotificationChannel;
  send(job: NotificationJob): Promise<DeliveryResult>;
}
