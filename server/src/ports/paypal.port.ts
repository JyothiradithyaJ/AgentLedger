export interface CreateOrderResult {
  orderId: string;
  approveUrl: string;
}

export interface AuthorizeResult {
  authorizationId: string;
  status: string;
}

export interface AuthorizationDetails {
  authorizationId: string;
  status: string;
  amountCents: number;
}

export interface CaptureResult {
  captureId: string;
  status: string;
  capturedCents: number;
  feeCents?: number;
  netCents?: number;
}

export interface DisputeDetails {
  disputeId: string;
  status: string;
  allowedEvidenceTypes: string[];
  amountCents: number;
  reason?: string;
}

export interface PayPalPort {
  createOrder(amountCents: number, currency: string, customId: string): Promise<CreateOrderResult>;
  authorizeOrder(orderId: string): Promise<AuthorizeResult>;
  getAuthorization(authorizationId: string): Promise<AuthorizationDetails>;
  captureAuthorization(
    authorizationId: string,
    amountCents: number,
    currency: string,
    requestId: string,
    finalCapture: boolean
  ): Promise<CaptureResult>;
  voidAuthorization(authorizationId: string, requestId: string): Promise<{ status: string }>;
  reauthorize(
    authorizationId: string,
    amountCents: number,
    currency: string,
    requestId: string
  ): Promise<{ authorizationId: string; status: string }>;
  getDispute(disputeId: string): Promise<DisputeDetails>;
  provideDisputeEvidence(disputeId: string, evidenceType: string, notes: string): Promise<{ status: string }>;
  verifyWebhookSignature(headers: Record<string, string>, rawBody: string, webhookId: string): Promise<boolean>;
  getOrder(orderId: string): Promise<{ orderId: string; status: string }>;
}
