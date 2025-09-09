import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  document: text("document").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unicId: text("unic_id").notNull().unique(), // Bulls Pay transaction ID
  externalId: text("external_id").notNull(),
  userId: varchar("user_id").references(() => users.id),
  amount: integer("amount").notNull(), // Amount in cents
  status: text("status").notNull(), // pending, paid, failed, cancelled, refunded
  paymentMethod: text("payment_method").notNull(),
  plan: text("plan").notNull(), // premium, basic, annual
  planTitle: text("plan_title").notNull(),
  buyerInfo: jsonb("buyer_info").notNull(),
  paymentData: jsonb("payment_data"), // QR code, PIX code, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  transactionId: varchar("transaction_id").references(() => transactions.id).notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull(), // active, expired, cancelled
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  transactionId: text("transaction_id").notNull(),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

// Checkout form schema
export const checkoutFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Digite um e-mail válido"),
  document: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  plan: z.string(),
  price: z.number(),
  title: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

export type CheckoutForm = z.infer<typeof checkoutFormSchema>;

// Bulls Pay response types
export type BullsPayTransactionResponse = {
  success: boolean;
  message?: string;
  data: {
    payment_data: {
      id: string;
      amount: number;
      external_id: string;
      acquirer_transaction_id: string;
      postback_url?: string;
      buyer_infos: {
        buyer_name: string;
        buyer_email: string;
        buyer_document: string;
        buyer_phone: string;
      };
      total_to_receiver: number;
      total_platform_tax: number;
    };
    pix_data: {
      qrcode: string;
    };
  };
};

export type BullsPayWebhookPayload = {
  event_type: string;
  data: {
    unic_id: string;
    external_id: string;
    status: string;
    total_value: number;
    total_to_receiver: number;
    created_at: string;
  };
};
