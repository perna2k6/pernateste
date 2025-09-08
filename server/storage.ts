import { type User, type InsertUser, type Transaction, type InsertTransaction, type Subscription, type InsertSubscription, type WebhookEvent, type InsertWebhookEvent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Transactions
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByUnicId(unicId: string): Promise<Transaction | undefined>;
  getTransactionByExternalId(externalId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(unicId: string, status: string, paymentData?: any): Promise<Transaction | undefined>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  // Subscriptions
  getSubscription(id: string): Promise<Subscription | undefined>;
  getUserActiveSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscriptionStatus(id: string, status: string): Promise<Subscription | undefined>;

  // Webhook Events
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getUnprocessedWebhookEvents(): Promise<WebhookEvent[]>;
  markWebhookEventProcessed(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transactions: Map<string, Transaction>;
  private subscriptions: Map<string, Subscription>;
  private webhookEvents: Map<string, WebhookEvent>;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.subscriptions = new Map();
    this.webhookEvents = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Transactions
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByUnicId(unicId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(
      (transaction) => transaction.unicId === unicId,
    );
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(
      (transaction) => transaction.externalId === externalId,
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransactionStatus(unicId: string, status: string, paymentData?: any): Promise<Transaction | undefined> {
    const transaction = await this.getTransactionByUnicId(unicId);
    if (transaction) {
      transaction.status = status;
      transaction.updatedAt = new Date();
      if (paymentData) {
        transaction.paymentData = paymentData;
      }
      this.transactions.set(transaction.id, transaction);
      return transaction;
    }
    return undefined;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );
  }

  // Subscriptions
  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const now = new Date();
    return Array.from(this.subscriptions.values()).find(
      (subscription) => 
        subscription.userId === userId && 
        subscription.status === 'active' &&
        subscription.endDate > now,
    );
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      createdAt: new Date(),
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscriptionStatus(id: string, status: string): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.status = status;
      this.subscriptions.set(id, subscription);
      return subscription;
    }
    return undefined;
  }

  // Webhook Events
  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const id = randomUUID();
    const event: WebhookEvent = {
      ...insertEvent,
      id,
      createdAt: new Date(),
    };
    this.webhookEvents.set(id, event);
    return event;
  }

  async getUnprocessedWebhookEvents(): Promise<WebhookEvent[]> {
    return Array.from(this.webhookEvents.values()).filter(
      (event) => !event.processed,
    );
  }

  async markWebhookEventProcessed(id: string): Promise<void> {
    const event = this.webhookEvents.get(id);
    if (event) {
      event.processed = true;
      this.webhookEvents.set(id, event);
    }
  }
}

export const storage = new MemStorage();
