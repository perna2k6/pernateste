import { type BullsPayTransactionResponse, type CheckoutForm } from "@shared/schema";

export interface BullsPayConfig {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
  webhookUrl: string;
}

export class BullsPayService {
  private config: BullsPayConfig;

  constructor(config: BullsPayConfig) {
    this.config = config;
  }

  async createTransaction(formData: CheckoutForm, externalId: string): Promise<BullsPayTransactionResponse> {
    const transactionData = {
      amount: formData.price,
      buyer_infos: {
        buyer_name: formData.name,
        buyer_email: formData.email,
        buyer_document: formData.document,
        buyer_phone: formData.phone
      },
      external_id: externalId,
      payment_method: "pix"
    };

    const response = await fetch(`${this.config.baseUrl}/transactions/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Public-Key': this.config.publicKey,
        'X-Private-Key': this.config.privateKey
      },
      body: JSON.stringify(transactionData)
    });

    if (!response.ok) {
      throw new Error(`Bulls Pay API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to create transaction');
    }

    return result;
  }

  async checkTransactionStatus(unicId: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/transactions/list?id=${unicId}`, {
      headers: {
        'Accept': 'application/json',
        'X-Public-Key': this.config.publicKey,
        'X-Private-Key': this.config.privateKey
      }
    });

    if (!response.ok) {
      throw new Error(`Bulls Pay API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data.transactions.length > 0) {
      return result.data.transactions[0].status;
    }

    return 'pending';
  }

  async refundTransaction(unicId: string): Promise<boolean> {
    const response = await fetch(`${this.config.baseUrl}/transactions/refund/${unicId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'X-Public-Key': this.config.publicKey,
        'X-Private-Key': this.config.privateKey
      }
    });

    if (!response.ok) {
      throw new Error(`Bulls Pay API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  }
}

// Create service instance with environment variables
export const bullsPayService = new BullsPayService({
  publicKey: process.env.BULLS_PAY_PUBLIC_KEY || 'bp_client_lT5NnJJ3pjdyNwcTLzgsdmHxLyqRoR1v',
  privateKey: process.env.BULLS_PAY_PRIVATE_KEY || 'bp_secret_OwLSnhu9mub0olvLdYSU2XjQ7UIWkg97fdB5ENJEnQzam2GKLezvO87GdbwRZUtR',
  baseUrl: process.env.BULLS_PAY_BASE_URL || 'https://api-gateway.bullspay.com.br/api',
  webhookUrl: process.env.BULLS_PAY_WEBHOOK_URL || 'http://localhost:5000/api/webhook/bullspay'
});
