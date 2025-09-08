export interface BullsPayConfig {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
}

export interface CreateTransactionRequest {
  amount: number;
  buyer_infos: {
    buyer_name: string;
    buyer_email: string;
    buyer_document: string;
    buyer_phone: string;
  };
  external_id: string;
  payment_method: string;
}

export interface BullsPayResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TransactionData {
  unic_id: string;
  status: string;
  total_value: number;
  payment_url: string;
  qr_code_base64: string;
  qr_code_text: string;
  created_at: string;
}

export class BullsPayClient {
  private config: BullsPayConfig;

  constructor(config: BullsPayConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any
  ): Promise<BullsPayResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Public-Key': this.config.publicKey,
      'X-Private-Key': this.config.privateKey,
    };

    if (data) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Bulls Pay API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createTransaction(request: CreateTransactionRequest): Promise<BullsPayResponse<TransactionData>> {
    return this.makeRequest<TransactionData>('/transactions/create', 'POST', request);
  }

  async getTransactionStatus(unicId: string): Promise<BullsPayResponse<{ status: string }>> {
    return this.makeRequest<{ status: string }>(`/transactions/list?id=${unicId}`);
  }

  async refundTransaction(unicId: string): Promise<BullsPayResponse<any>> {
    return this.makeRequest(`/transactions/refund/${unicId}`, 'PUT');
  }
}

// Client instance for frontend usage (NOTE: In production, API calls should go through your backend)
export const bullsPayClient = new BullsPayClient({
  publicKey: import.meta.env.VITE_BULLS_PAY_PUBLIC_KEY || 'bp_client_YOUR_PUBLIC_KEY_HERE',
  privateKey: import.meta.env.VITE_BULLS_PAY_PRIVATE_KEY || 'bp_secret_YOUR_PRIVATE_KEY_HERE',
  baseUrl: import.meta.env.VITE_BULLS_PAY_BASE_URL || 'https://api-gateway.bullspay.com.br/api',
});
