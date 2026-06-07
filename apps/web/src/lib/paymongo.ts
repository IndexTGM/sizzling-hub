/**
 * PayMongo API client — test environment
 * https://developers.paymongo.com/reference
 */

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function getCredentials() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing PAYMONGO_SECRET_KEY environment variable.");
  }
  const encoded = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

async function paymongoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${PAYMONGO_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: getCredentials(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  const body = await res.json();

  if (!res.ok) {
    const message =
      (body.errors && body.errors[0]?.detail) ??
      body.error ??
      JSON.stringify(body);
    throw new Error(`PayMongo error ${res.status}: ${message}`);
  }

  return body as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PayMongoAmount {
  currency: string; // e.g. "PHP"
  value: number;    // in centavos (e.g. 10000 = ₱100.00)
}

export interface PayMongoSourceAttributes {
  amount: number;
  billing?: {
    address: {
      country: string;
      state: string;
      city: string;
      line1: string;
      line2: string;
      postal_code: string;
    };
    email: string;
    name: string;
    phone: string;
  };
  currency: string;
  livemode: boolean;
  redirect: {
    checkout_url: string;
    failed: string;
    success: string;
  };
  status: string;
  type: string;
}

export interface PayMongoSource {
  id: string;
  type: string;
  attributes: PayMongoSourceAttributes;
}

export interface PayMongoPaymentAttributes {
  access_url?: string;
  amount: number;
  balance_transaction_id?: string;
  billing?: Record<string, unknown>;
  currency: string;
  description?: string;
  disputed: boolean;
  external_reference_number?: string;
  fee?: number;
  foreign_fee?: number;
  livemode: boolean;
  net_amount?: number;
  origin?: string;
  payment_intent_id?: string;
  payout?: unknown;
  source: PayMongoSource;
  statement_descriptor?: string;
  status: string;
  tax_amount?: number | null;
  taxes?: unknown[];
  available_at?: number;
  created_at: number;
  paid_at?: number;
  updated_at: number;
}

export interface PayMongoPayment {
  id: string;
  type: string;
  attributes: PayMongoPaymentAttributes;
}

export interface CreateSourceParams {
  type: "gcash";
  amount: number;   // in centavos
  currency?: string; // default "PHP"
  redirect: {
    success: string;
    failed: string;
  };
  billing?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface CreatePaymentParams {
  amount: number;       // in centavos
  currency?: string;    // default "PHP"
  sourceId: string;
  description?: string;
  statementDescriptor?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Create a payment source (e.g. GCash) — returns a redirect checkout URL.
 */
export async function createSource(
  params: CreateSourceParams,
): Promise<PayMongoSource> {
  const body = {
    data: {
      attributes: {
        amount: params.amount,
        currency: params.currency ?? "PHP",
        redirect: params.redirect,
        type: params.type,
        billing: params.billing
          ? {
              name: params.billing.name,
              email: params.billing.email,
              phone: params.billing.phone,
            }
          : undefined,
      },
    },
  };

  const res = await paymongoFetch<{ data: PayMongoSource }>("/sources", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.data;
}

/**
 * Retrieve a source by ID (e.g., to check its status after redirect).
 */
export async function getSource(sourceId: string): Promise<PayMongoSource> {
  const res = await paymongoFetch<{ data: PayMongoSource }>(
    `/sources/${sourceId}`,
  );
  return res.data;
}

/**
 * Create a payment using an existing source.
 */
export async function createPayment(
  params: CreatePaymentParams,
): Promise<PayMongoPayment> {
  const body = {
    data: {
      attributes: {
        amount: params.amount,
        currency: params.currency ?? "PHP",
        source: {
          id: params.sourceId,
          type: "source",
        },
        description: params.description,
        statement_descriptor: params.statementDescriptor,
      },
    },
  };

  const res = await paymongoFetch<{ data: PayMongoPayment }>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.data;
}

export interface CreateRefundParams {
  paymentId: string;
  amount: number;   // in centavos
  reason?: string;
}

export async function refundPayment(
  params: CreateRefundParams,
): Promise<{ id: string }> {
  const body = {
    data: {
      attributes: {
        amount: params.amount,
        payment_id: params.paymentId,
        reason: params.reason || "requested_by_customer",
      },
    },
  };

  const res = await paymongoFetch<{ data: { id: string } }>("/refunds", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.data;
}

/**
 * Retrieve a payment by ID.
 */
export async function getPayment(
  paymentId: string,
): Promise<PayMongoPayment> {
  const res = await paymongoFetch<{ data: PayMongoPayment }>(
    `/payments/${paymentId}`,
  );
  return res.data;
}

/**
 * List all payments (optional filters).
 */
export async function listPayments(params?: {
  limit?: number;
  before?: string;
  after?: string;
}): Promise<PayMongoPayment[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.before) searchParams.set("before", params.before);
  if (params?.after) searchParams.set("after", params.after);

  const query = searchParams.toString();
  const path = `/payments${query ? `?${query}` : ""}`;

  const res = await paymongoFetch<{ data: PayMongoPayment[] }>(path);
  return res.data;
}