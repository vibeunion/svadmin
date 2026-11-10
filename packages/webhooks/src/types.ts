export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string[]; // e.g. ['order.created', 'user.*', '*']
  active: boolean;
  headers?: Record<string, string>;
  description?: string;
  createdAt?: string | Date;
}

export interface WebhookPayload<T = unknown> {
  id: string;
  event: string;
  timestamp: number;
  data: T;
  attempt?: number;
}

export interface WebhookDeliveryResult {
  subscriptionId: string;
  url: string;
  event: string;
  success: boolean;
  statusCode?: number | undefined;
  responseBody?: string | undefined;
  durationMs: number;
  attempts: number;
  error?: string | undefined;
}

export interface WebhookDispatcherOptions {
  fetchFn?: typeof fetch;
  maxRetries?: number; // default: 3
  backoffBaseMs?: number; // default: 100
  timeoutMs?: number; // default: 10000
  onDelivery?: (result: WebhookDeliveryResult) => void | Promise<void>;
}
