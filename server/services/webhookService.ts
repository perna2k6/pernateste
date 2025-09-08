import { storage } from "../storage";
import { type BullsPayWebhookPayload } from "@shared/schema";

export class WebhookService {
  async processWebhookEvent(payload: BullsPayWebhookPayload): Promise<void> {
    try {
      // Store webhook event
      await storage.createWebhookEvent({
        eventType: payload.event_type,
        transactionId: payload.data.unic_id,
        payload: payload,
        processed: false,
      });

      // Process the event
      await this.handleTransactionEvent(payload);
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }

  private async handleTransactionEvent(payload: BullsPayWebhookPayload): Promise<void> {
    const { data } = payload;
    
    // Update transaction status
    const transaction = await storage.updateTransactionStatus(
      data.unic_id,
      data.status
    );

    if (!transaction) {
      console.error(`Transaction not found for unic_id: ${data.unic_id}`);
      return;
    }

    // If payment is successful, create or update subscription
    if (data.status === 'paid' && transaction.userId) {
      await this.createSubscription(transaction);
    }

    // If payment failed or was cancelled, handle accordingly
    if (data.status === 'failed' || data.status === 'cancelled') {
      await this.handleFailedPayment(transaction);
    }
  }

  private async createSubscription(transaction: any): Promise<void> {
    try {
      const startDate = new Date();
      let endDate = new Date();

      // Calculate end date based on plan
      switch (transaction.plan) {
        case 'premium':
        case 'basic':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'annual':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      await storage.createSubscription({
        userId: transaction.userId,
        transactionId: transaction.id,
        plan: transaction.plan,
        status: 'active',
        startDate,
        endDate,
      });

      console.log(`Subscription created for user ${transaction.userId}, plan: ${transaction.plan}`);
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  }

  private async handleFailedPayment(transaction: any): Promise<void> {
    // Handle failed payment logic
    console.log(`Payment failed for transaction ${transaction.id}`);
    
    // Could send notification emails, update user status, etc.
  }

  async processUnprocessedEvents(): Promise<void> {
    const events = await storage.getUnprocessedWebhookEvents();
    
    for (const event of events) {
      try {
        await this.handleTransactionEvent(event.payload as BullsPayWebhookPayload);
        await storage.markWebhookEventProcessed(event.id);
      } catch (error) {
        console.error(`Error processing webhook event ${event.id}:`, error);
      }
    }
  }
}

export const webhookService = new WebhookService();
