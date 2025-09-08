import { type CheckoutForm } from "@shared/schema";

export interface SourcePayConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
  webhookUrl: string;
}

export interface SourcePayTransactionData {
  id: string;
  status: string;
  amount: number;
  paymentMethod: string;
  qrCode?: string;
  qrCodeImage?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SourcePayResponse {
  success: boolean;
  data: SourcePayTransactionData;
  message?: string;
}

export class SourcePayService {
  private config: SourcePayConfig;

  constructor(config: SourcePayConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.publicKey}:${this.config.secretKey}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  async createTransaction(formData: CheckoutForm, externalRef: string): Promise<SourcePayResponse> {
    const transactionData = {
      amount: formData.price, // SourcePay espera valor em centavos
      currency: "BRL",
      paymentMethod: "pix",
      pix: {
        expiresInMinutes: 30
      },
      items: [
        {
          title: formData.title,
          quantity: 1,
          unitPrice: formData.price,
          description: `Assinatura ${formData.plan}`,
          tangible: false
        }
      ],
      customer: {
        name: formData.name,
        email: formData.email,
        document: {
          type: "cpf",
          number: formData.document
        },
        phone: formData.phone
      },
      postbackUrl: this.config.webhookUrl,
      externalRef: externalRef,
      metadata: `Plan: ${formData.plan}`
    };

    const response = await fetch(`${this.config.baseUrl}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SourcePay API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success && result.success !== undefined) {
      throw new Error(result.message || 'Failed to create transaction');
    }

    // Buscar detalhes da transação para obter o código PIX
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
      const detailsResponse = await fetch(`${this.config.baseUrl}/v1/transactions/${result.id}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json'
        }
      });
      
      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        
        // Atualizar result com os dados do PIX se disponíveis
        if (details.pix && details.pix.qrcode) {
          result.qrCode = details.pix.qrcode;
          result.pixCode = details.pix.qrcode; // fallback
        }
      }
    } catch (error) {
      // Silently handle error - transaction will work without PIX code
    }

    return {
      success: true,
      data: result,
      message: result.message
    };
  }

  async checkTransactionStatus(transactionId: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/transactions/${transactionId}`, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SourcePay API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Mapear status do SourcePay para nossos status
      const status = result.data.status?.toLowerCase();
      switch (status) {
        case 'paid':
        case 'approved':
          return 'paid';
        case 'pending':
        case 'waiting_payment':
          return 'pending';
        case 'failed':
        case 'cancelled':
        case 'expired':
          return 'failed';
        default:
          return 'pending';
      }
    }

    return 'pending';
  }

  async refundTransaction(transactionId: string): Promise<boolean> {
    const response = await fetch(`${this.config.baseUrl}/v1/transactions/${transactionId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SourcePay API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  }
}

// Create service instance with environment variables
export const sourcePayService = new SourcePayService({
  publicKey: process.env.SOURCEPAY_PUBLIC_KEY || '',
  secretKey: process.env.SOURCEPAY_SECRET_KEY || '',
  baseUrl: process.env.SOURCEPAY_BASE_URL || 'https://api.sourcepay.com.br',
  webhookUrl: process.env.SOURCEPAY_WEBHOOK_URL || 'http://localhost:5000/api/webhook/sourcepay'
});