import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, loginUserSchema, insertUserSchema, verify2FASchema, web3LoginSchema } from "@shared/schema";
import speakeasy from "speakeasy";
import { toDataURL } from "qrcode";
import { IVerifyOptions } from "passport-local";
import { SiweMessage } from "siwe";

// Extended verification options for our 2FA flow
interface Extended2FAVerifyOptions extends IVerifyOptions {
  requires2FA?: boolean;
  userId?: number;
}

// OAuth profile types
interface OAuthProfile {
  id: string;
  displayName: string;
  username?: string;
  emails?: Array<{value: string}>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // If 2FA is enabled, don't fully authenticate yet
        if (user.is2FAEnabled) {
          const options: Extended2FAVerifyOptions = { 
            message: "2FA verification required" 
          };
          options.requires2FA = true;
          options.userId = user.id;
          return done(null, false, options);
        }
        
        // Update last login time
        await storage.updateLastLogin(user.id);
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Configure Google strategy if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/auth/google/callback",
        },
        async (accessToken: string, refreshToken: string, profile: OAuthProfile, done: Function) => {
          try {
            if (!profile.emails || profile.emails.length === 0) {
              return done(new Error("Email access is required"));
            }
            
            let user = await storage.getUserByEmail(profile.emails[0].value);
            
            if (!user) {
              // Create a new user
              user = await storage.createUser({
                username: profile.displayName.replace(/\s+/g, "") + Math.floor(Math.random() * 1000),
                email: profile.emails[0].value,
                password: await hashPassword(randomBytes(16).toString("hex")),
                firstName: profile.name?.givenName || "",
                lastName: profile.name?.familyName || "",
              });
            }
            
            // Update last login time
            await storage.updateLastLogin(user.id);
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  // Configure GitHub strategy if credentials are available
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: "/auth/github/callback",
          scope: ["user:email"],
        },
        async (accessToken: string, refreshToken: string, profile: OAuthProfile, done: Function) => {
          try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (!email) {
              return done(new Error("Email access is required"));
            }
            
            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create a new user
              const nameParts = profile.displayName ? profile.displayName.split(" ") : [profile.username || ""];
              user = await storage.createUser({
                username: profile.username || `github${Math.floor(Math.random() * 1000)}`,
                email: email,
                password: await hashPassword(randomBytes(16).toString("hex")),
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
              });
            }
            
            // Update last login time
            await storage.updateLastLogin(user.id);
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input data", errors: result.error.errors });
      }

      const { username, email } = result.data;
      
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(result.data.password);
      
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    const result = loginUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid input data", errors: result.error.errors });
    }

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: Extended2FAVerifyOptions) => {
      if (err) return next(err);
      
      if (!user) {
        if (info && info.requires2FA) {
          return res.status(200).json({ 
            requires2FA: true, 
            userId: info.userId,
            message: "2FA verification required" 
          });
        }
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = user;
        return res.status(200).json(userWithoutSensitiveInfo);
      });
    })(req, res, next);
  });
  
  // Web3 authentication route
  app.post("/api/web3-login", async (req, res, next) => {
    try {
      const result = web3LoginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input data", errors: result.error.errors });
      }
      
      const { address, signature, message } = result.data;
      
      // Verify the signature using SIWE
      try {
        const siweMessage = new SiweMessage(message);
        const result = await siweMessage.verify({ signature });
        
        if (!result.success) {
          return res.status(401).json({ message: "Invalid signature" });
        }
        
        // Check that the address matches
        const parsedMessage = new SiweMessage(message);
        if (parsedMessage.address.toLowerCase() !== address.toLowerCase()) {
          return res.status(401).json({ message: "Address mismatch" });
        }
        
        // Check if this wallet address is already registered
        let user = await storage.getUserByWalletAddress(address);
        
        if (!user) {
          // Create a new user with the wallet address
          user = await storage.createUser({
            username: `wallet_${address.slice(0, 8)}`,
            email: `${address.slice(0, 10)}@wallet.eth`, // Placeholder email
            password: await hashPassword(randomBytes(16).toString("hex")), // Random password
            walletAddress: address,
            authType: "web3"
          });
        }
        
        // Update last login time
        await storage.updateLastLogin(user.id);
        
        // Log the user in
        req.login(user, (err) => {
          if (err) return next(err);
          const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = user;
          return res.status(200).json(userWithoutSensitiveInfo);
        });
      } catch (err) {
        console.error("SIWE verification error:", err);
        return res.status(401).json({ message: "Invalid signature" });
      }
    } catch (err) {
      next(err);
    }
  });

  // Verify 2FA
  app.post("/api/verify-2fa", async (req, res, next) => {
    try {
      const result = verify2FASchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid verification code", errors: result.error.errors });
      }

      const { token, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "Invalid user or 2FA not setup" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1,
      });

      if (!verified) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Update last login time
      await storage.updateLastLogin(user.id);

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = user;
        return res.status(200).json(userWithoutSensitiveInfo);
      });
    } catch (err) {
      next(err);
    }
  });

  // 2FA Setup
  app.post("/api/user/setup-2fa", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const secret = speakeasy.generateSecret({
        name: "SecureAuth",
        issuer: "SecureAuth Platform",
      });

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Save the secret to the user record
      await storage.updateUser(user.id, {
        twoFactorSecret: secret.base32,
      });

      // Generate QR code
      const otpAuthUrl = secret.otpauth_url;
      const qrCodeUrl = await toDataURL(otpAuthUrl);

      res.json({ qrCodeUrl });
    } catch (err) {
      next(err);
    }
  });

  // Enable 2FA after verification
  app.post("/api/user/enable-2fa", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const result = verify2FASchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid verification code", errors: result.error.errors });
      }

      const { token } = result.data;
      const user = await storage.getUser(req.user.id);
      
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA not set up yet" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1,
      });

      if (!verified) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Enable 2FA for the user
      await storage.updateUser(user.id, {
        is2FAEnabled: true,
      });

      res.json({ message: "2FA enabled successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Disable 2FA
  app.post("/api/user/disable-2fa", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Disable 2FA for the user
      await storage.updateUser(req.user.id, {
        is2FAEnabled: false,
        twoFactorSecret: null,
      });

      res.json({ message: "2FA disabled successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = req.user;
    res.json(userWithoutSensitiveInfo);
  });

  // Update user profile
  app.patch("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const updatedUser = await storage.updateUser(req.user.id, req.body);
      const { password, twoFactorSecret, ...userWithoutSensitiveInfo } = updatedUser;
      res.json(userWithoutSensitiveInfo);
    } catch (err) {
      next(err);
    }
  });

  // Change password
  app.post("/api/user/change-password", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        password: hashedPassword,
      });

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Google auth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    
    app.get(
      "/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }

  // GitHub auth routes
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
    
    app.get(
      "/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/auth" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }
}
