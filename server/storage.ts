import { users, payments, sessions, type User, type InsertUser, type Payment } from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import memorystore from "memorystore";
import session from "express-session";

const MemoryStore = memorystore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateLastLogin(id: number): Promise<void>;
  
  // Payment operations
  createPayment(payment: Omit<Payment, 'id'>): Promise<Payment>;
  getUserPayments(userId: number): Promise<Payment[]>;
  getUserRecentPayments(userId: number, limit?: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;

  // Stripe-related operations
  updateStripeCustomerId(userId: number, customerId: string): Promise<User>;
  updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User>;
  updateUserStripeInfo(userId: number, data: { customerId: string, subscriptionId: string }): Promise<User>;
  updatePremiumStatus(userId: number, isPremium: boolean): Promise<User>;
  
  // Session store
  sessionStore: session.Store;
}

// In-memory storage implementation for development
export class MemStorage implements IStorage {
  private userStorage: Map<number, User>;
  private paymentStorage: Map<number, Payment>;
  public sessionStore: session.Store;
  private currentUserId: number;
  private currentPaymentId: number;

  constructor() {
    this.userStorage = new Map();
    this.paymentStorage = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    this.currentUserId = 1;
    this.currentPaymentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.userStorage.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.userStorage.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.userStorage.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      id,
      ...userData,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      role: "user",
      is2FAEnabled: false,
      isPremium: false,
      lastLogin: now,
      twoFactorSecret: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      language: "en",
    };
    this.userStorage.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser = { ...user, ...updates };
    this.userStorage.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.userStorage.values());
  }

  async updateLastLogin(id: number): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      user.lastLogin = new Date();
      this.userStorage.set(id, user);
    }
  }

  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    const id = this.currentPaymentId++;
    const payment: Payment = {
      id,
      ...paymentData,
    };
    this.paymentStorage.set(id, payment);
    return payment;
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.paymentStorage.values())
      .filter((payment) => payment.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getUserRecentPayments(userId: number, limit: number = 5): Promise<Payment[]> {
    const payments = await this.getUserPayments(userId);
    return payments.slice(0, limit);
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.paymentStorage.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    return this.updateUser(userId, { stripeSubscriptionId: subscriptionId });
  }

  async updateUserStripeInfo(userId: number, data: { customerId: string, subscriptionId: string }): Promise<User> {
    return this.updateUser(userId, {
      stripeCustomerId: data.customerId,
      stripeSubscriptionId: data.subscriptionId,
    });
  }

  async updatePremiumStatus(userId: number, isPremium: boolean): Promise<User> {
    return this.updateUser(userId, { isPremium });
  }
}

// Database storage implementation for production
export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  public sessionStore: session.Store;

  constructor() {
    neonConfig.fetchConnectionCache = true;
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
    
    // For production, use PostgreSQL session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const results = await this.db.select().from(users).where({ id }).limit(1);
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await this.db
      .select()
      .from(users)
      .where({ username })
      .limit(1);
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await this.db
      .select()
      .from(users)
      .where({ email })
      .limit(1);
    return results[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const result = await this.db
      .insert(users)
      .values({
        ...userData,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        role: "user",
        is2FAEnabled: false,
        isPremium: false,
        lastLogin: now,
        language: "en",
      })
      .returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where({ id })
      .returning();
    
    if (!result[0]) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLogin: new Date() })
      .where({ id });
  }

  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    const result = await this.db
      .insert(payments)
      .values(paymentData)
      .returning();
    return result[0];
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return await this.db
      .select()
      .from(payments)
      .where({ userId })
      .orderBy({ date: "desc" });
  }

  async getUserRecentPayments(userId: number, limit: number = 5): Promise<Payment[]> {
    return await this.db
      .select()
      .from(payments)
      .where({ userId })
      .orderBy({ date: "desc" })
      .limit(limit);
  }

  async getAllPayments(): Promise<Payment[]> {
    return await this.db
      .select()
      .from(payments)
      .orderBy({ date: "desc" });
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async updateStripeSubscriptionId(userId: number, subscriptionId: string): Promise<User> {
    return this.updateUser(userId, { stripeSubscriptionId: subscriptionId });
  }

  async updateUserStripeInfo(userId: number, data: { customerId: string, subscriptionId: string }): Promise<User> {
    return this.updateUser(userId, {
      stripeCustomerId: data.customerId,
      stripeSubscriptionId: data.subscriptionId,
    });
  }

  async updatePremiumStatus(userId: number, isPremium: boolean): Promise<User> {
    return this.updateUser(userId, { isPremium });
  }
}

// Choose storage implementation based on environment
export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();
