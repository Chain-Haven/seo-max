/**
 * Mercury API Client for Invoicing
 * Documentation: https://docs.mercury.com/reference/invoicing
 */

const MERCURY_API_URL = "https://api.mercury.com/api/v1";

interface MercuryConfig {
  apiKey: string;
}

interface MercuryRecipient {
  id?: string;
  name: string;
  email: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

interface MercuryLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // In cents
  total?: number;
}

interface MercuryInvoice {
  id?: string;
  status?: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  recipientId: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate: string;
  lineItems: MercuryLineItem[];
  notes?: string;
  memo?: string;
  subtotal?: number;
  total?: number;
  currency?: string;
  createdAt?: string;
  paidAt?: string;
}

interface MercuryApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class MercuryClient {
  private apiKey: string;

  constructor(config: MercuryConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown
  ): Promise<MercuryApiResponse<T>> {
    try {
      const response = await fetch(`${MERCURY_API_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Mercury API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Recipients (Customers)
  async createRecipient(recipient: MercuryRecipient) {
    return this.request<MercuryRecipient>("/invoicing/recipients", "POST", recipient);
  }

  async getRecipient(recipientId: string) {
    return this.request<MercuryRecipient>(`/invoicing/recipients/${recipientId}`);
  }

  async listRecipients() {
    return this.request<MercuryRecipient[]>("/invoicing/recipients");
  }

  async updateRecipient(recipientId: string, updates: Partial<MercuryRecipient>) {
    return this.request<MercuryRecipient>(
      `/invoicing/recipients/${recipientId}`,
      "PUT",
      updates
    );
  }

  // Invoices
  async createInvoice(invoice: MercuryInvoice) {
    return this.request<MercuryInvoice>("/invoicing/invoices", "POST", invoice);
  }

  async getInvoice(invoiceId: string) {
    return this.request<MercuryInvoice>(`/invoicing/invoices/${invoiceId}`);
  }

  async listInvoices(params?: { recipientId?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.recipientId) query.set("recipientId", params.recipientId);
    if (params?.status) query.set("status", params.status);
    const queryString = query.toString();
    return this.request<MercuryInvoice[]>(
      `/invoicing/invoices${queryString ? `?${queryString}` : ""}`
    );
  }

  async sendInvoice(invoiceId: string) {
    return this.request<MercuryInvoice>(`/invoicing/invoices/${invoiceId}/send`, "POST");
  }

  async cancelInvoice(invoiceId: string) {
    return this.request<MercuryInvoice>(`/invoicing/invoices/${invoiceId}/cancel`, "POST");
  }

  async getInvoicePdf(invoiceId: string) {
    return this.request<{ url: string }>(`/invoicing/invoices/${invoiceId}/pdf`);
  }
}

// Singleton instance
let mercuryClient: MercuryClient | null = null;

export function getMercuryClient(): MercuryClient | null {
  if (!process.env.MERCURY_API_KEY) {
    console.warn("MERCURY_API_KEY not configured");
    return null;
  }

  if (!mercuryClient) {
    mercuryClient = new MercuryClient({
      apiKey: process.env.MERCURY_API_KEY,
    });
  }

  return mercuryClient;
}

export type { MercuryRecipient, MercuryInvoice, MercuryLineItem };
export { MercuryClient };
