import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export class PayPalClient {
  private tokenCache: TokenCache | null = null;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly timeoutMs: number = 15000;

  constructor(
    clientId: string = env.PAYPAL_CLIENT_ID,
    clientSecret: string = env.PAYPAL_CLIENT_SECRET,
    baseUrl: string = env.PAYPAL_BASE_URL
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials",
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "PayPal OAuth token request failed");
        throw new Error(`PayPal OAuth failed with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + data.expires_in * 1000
      };
      return data.access_token;
    } finally {
      clearTimeout(timeout);
    }
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      requestId?: string;
    } = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    };

    if (options.requestId) {
      headers["PayPal-Request-Id"] = options.requestId;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ endpoint, status: response.status, errorText }, "PayPal API request error");
        throw new Error(`PayPal API ${endpoint} failed (${response.status}): ${errorText}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
