import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bullsPayService } from "./services/bullsPayService";
import { webhookService } from "./services/webhookService";
import { checkoutFormSchema, type BullsPayWebhookPayload } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create transaction and initiate payment
  app.post("/api/transactions/create", async (req, res) => {
    try {
      const validatedData = checkoutFormSchema.parse(req.body);
      
      // Generate unique external ID
      const externalId = `subscription_${Date.now()}_${randomUUID().slice(0, 8)}`;

      // Create transaction with BullsPay
      const bullsPayResponse = await bullsPayService.createTransaction(validatedData, externalId);

      // Store transaction in our database
      const transaction = await storage.createTransaction({
        unicId: bullsPayResponse.data.payment_data.id,
        externalId: externalId,
        userId: null, // Could be linked to user if authenticated
        amount: validatedData.price,
        status: 'pending',
        paymentMethod: 'pix',
        plan: validatedData.plan,
        planTitle: validatedData.title,
        buyerInfo: {
          name: validatedData.name,
          email: validatedData.email,
          document: validatedData.document,
          phone: validatedData.phone,
        },
        paymentData: {
          qrCodeBase64: null, // BullsPay doesn't provide base64 QR
          qrCodeText: bullsPayResponse.data.pix_data.qrcode,
          paymentUrl: null,
        },
      });

      
      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          unicId: bullsPayResponse.data.payment_data.id,
          status: 'pending',
          qrCodeBase64: null, // BullsPay doesn't provide base64 QR
          qrCodeText: bullsPayResponse.data.pix_data.qrcode,
          paymentUrl: null,
        },
      });
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create transaction",
      });
    }
  });

  // Check transaction status
  app.get("/api/transactions/:unicId/status", async (req, res) => {
    try {
      const { unicId } = req.params;
      
      // Check status with BullsPay
      const status = await bullsPayService.checkTransactionStatus(unicId);
      
      // Update our local transaction
      await storage.updateTransactionStatus(unicId, status);
      
      res.json({
        success: true,
        data: { status },
      });
    } catch (error) {
      console.error("Error checking transaction status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check transaction status",
      });
    }
  });

  // Get transaction details
  app.get("/api/transactions/:unicId", async (req, res) => {
    try {
      const { unicId } = req.params;
      const transaction = await storage.getTransactionByUnicId(unicId);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Error getting transaction:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transaction",
      });
    }
  });

  // Bulls Pay webhook endpoint
  app.post("/api/webhook/bullspay", async (req, res) => {
    try {
      const payload: BullsPayWebhookPayload = req.body;
      
      // Process webhook event
      await webhookService.processWebhookEvent(payload);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process webhook",
      });
    }
  });

  // Refund transaction
  app.post("/api/transactions/:unicId/refund", async (req, res) => {
    try {
      const { unicId } = req.params;
      
      // Refund with BullsPay
      const success = await bullsPayService.refundTransaction(unicId);
      
      if (success) {
        // Update local transaction status
        await storage.updateTransactionStatus(unicId, 'refunded');
      }
      
      res.json({
        success,
        message: success ? "Transaction refunded successfully" : "Failed to refund transaction",
      });
    } catch (error) {
      console.error("Error refunding transaction:", error);
      res.status(500).json({
        success: false,
        message: "Failed to refund transaction",
      });
    }
  });

  // Get user subscriptions (if authenticated)
  app.get("/api/subscriptions", async (req, res) => {
    try {
      // In a real app, you'd get the user ID from authentication
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID required",
        });
      }

      const subscription = await storage.getUserActiveSubscription(userId);
      
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error("Error getting subscriptions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get subscriptions",
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "API is running",
      timestamp: new Date().toISOString(),
    });
  });

  const httpServer = createServer(app);

  // Process unprocessed webhook events on startup
  setTimeout(async () => {
    try {
      await webhookService.processUnprocessedEvents();
    } catch (error) {
      console.error("Error processing unprocessed webhook events:", error);
    }
  }, 5000);

  return httpServer;
}
