import { pgTable, text, serial, integer, boolean, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user").notNull(),
  is2FAEnabled: boolean("is_2fa_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  isPremium: boolean("is_premium").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  lastLogin: timestamp("last_login"),
  language: text("language").default("en").notNull(),
  walletAddress: text("wallet_address"),
  authType: text("auth_type").default("email").notNull(), // "email" or "web3"
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // stored in cents
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull(),
  plan: text("plan").notNull(),
  method: text("method").notNull(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  walletAddress: true,
  authType: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const web3LoginSchema = z.object({
  address: z.string().min(1, "Wallet address is required"),
  signature: z.string().min(1, "Signature is required"),
  message: z.string().min(1, "Message is required"),
});

export const updateUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  language: true,
  is2FAEnabled: true,
}).partial();

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verify2FASchema = z.object({
  token: z.string().length(6, "Verification code must be 6 digits"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type Web3Login = z.infer<typeof web3LoginSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
export type Verify2FA = z.infer<typeof verify2FASchema>;
export type User = typeof users.$inferSelect;
export type Payment = typeof payments.$inferSelect;
