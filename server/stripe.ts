import { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_your_key", {
  apiVersion: "2023-10-16",
});

const PREMIUM_PRICE_ID = process.env.STRIPE_PRICE_ID || "price_your_price_id";

export function setupStripe(app: Express) {
  // Create or retrieve a subscription for the user
  app.post("/api/get-or-create-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;

    // If user already has a subscription, retrieve it
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

        // Check if subscription has a payment intent
        if (subscription.status === "active") {
          return res.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            message: "Subscription is already active",
          });
        }

        // If subscription has a pending payment, retrieve client secret
        if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string') {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            subscription.latest_invoice.payment_intent as string
          );
          
          return res.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent.client_secret,
          });
        }
      } catch (error) {
        console.error("Error retrieving subscription:", error);
      }
    }

    try {
      // Create a customer if the user doesn't have one
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
          metadata: {
            userId: user.id.toString(),
          },
        });
        
        customerId = customer.id;
        await storage.updateStripeCustomerId(user.id, customer.id);
      }

      // Create a subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: PREMIUM_PRICE_ID,
          }
        ],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      });

      // Save subscription ID to user
      await storage.updateStripeSubscriptionId(user.id, subscription.id);
      
      // Get the client secret to complete the payment
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Cancel a subscription
  app.post("/api/cancel-subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    try {
      // Cancel at period end to allow user to use subscription until end of billing period
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ message: "Subscription will be canceled at the end of the billing period" });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Webhook to handle subscription updates
  app.post("/api/webhook", async (req, res) => {
    const signature = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // Verify webhook signature
    if (endpointSecret) {
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret
        );
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // For testing without signature verification
      event = req.body;
    }

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by Stripe customer ID
        const users = await storage.getAllUsers();
        const user = users.find(u => u.stripeCustomerId === customerId);
        
        if (user) {
          // Update subscription status based on Stripe status
          const isActive = subscription.status === "active";
          await storage.updatePremiumStatus(user.id, isActive);
          
          // Create a payment record if active and we have the latest invoice
          if (isActive && subscription.latest_invoice) {
            try {
              const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
              
              if (invoice.paid) {
                await storage.createPayment({
                  userId: user.id,
                  amount: invoice.amount_paid,
                  date: new Date(invoice.created * 1000),
                  status: "completed",
                  plan: "premium-monthly",
                  method: "card",
                });
              }
            } catch (err) {
              console.error("Error retrieving invoice:", err);
            }
          }
        }
        break;
        
      case "customer.subscription.deleted":
        const canceledSubscription = event.data.object as Stripe.Subscription;
        const canceledCustomerId = canceledSubscription.customer as string;
        
        // Find user by Stripe customer ID
        const allUsers = await storage.getAllUsers();
        const subscribedUser = allUsers.find(u => u.stripeCustomerId === canceledCustomerId);
        
        if (subscribedUser) {
          // Update premium status to false
          await storage.updatePremiumStatus(subscribedUser.id, false);
        }
        break;
        
      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceCustomerId = invoice.customer as string;
        
        // Find user by Stripe customer ID
        const customerUsers = await storage.getAllUsers();
        const customerUser = customerUsers.find(u => u.stripeCustomerId === invoiceCustomerId);
        
        if (customerUser) {
          // Create a successful payment record
          await storage.createPayment({
            userId: customerUser.id,
            amount: invoice.amount_paid,
            date: new Date(invoice.created * 1000),
            status: "completed",
            plan: "premium-monthly",
            method: "card",
          });
          
          // Update premium status to true
          await storage.updatePremiumStatus(customerUser.id, true);
        }
        break;
        
      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        const failedCustomerId = failedInvoice.customer as string;
        
        // Find user by Stripe customer ID
        const failedUsers = await storage.getAllUsers();
        const failedUser = failedUsers.find(u => u.stripeCustomerId === failedCustomerId);
        
        if (failedUser) {
          // Create a failed payment record
          await storage.createPayment({
            userId: failedUser.id,
            amount: failedInvoice.amount_due,
            date: new Date(failedInvoice.created * 1000),
            status: "failed",
            plan: "premium-monthly",
            method: "card",
          });
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  });
}
