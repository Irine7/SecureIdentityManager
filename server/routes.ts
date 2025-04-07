import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupStripe } from "./stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication and routes
  setupAuth(app);
  
  // Setup Stripe routes
  setupStripe(app);

  // Admin routes - only accessible to administrators
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive data before sending
      const sanitizedUsers = users.map(user => {
        const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = user;
        return userWithoutSensitiveInfo;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  // Admin route to update user
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    try {
      const updatedUser = await storage.updateUser(userId, req.body);
      const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = updatedUser;
      res.json(userWithoutSensitiveInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin route to get all payments
  app.get("/api/admin/payments", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve payments" });
    }
  });

  // Get user payments
  app.get("/api/payments/user/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // Regular users can only see their own payments, admins can see any user's payments
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You can only access your own payments" });
    }
    
    try {
      const payments = await storage.getUserPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve payments" });
    }
  });

  // Get user recent payments
  app.get("/api/payments/user/:id/recent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // Regular users can only see their own payments, admins can see any user's payments
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You can only access your own payments" });
    }
    
    try {
      const payments = await storage.getUserRecentPayments(userId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve payments" });
    }
  });
  
  const httpServer = createServer(app);

  return httpServer;
}
