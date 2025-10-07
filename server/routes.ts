// Reference: javascript_log_in_with_replit, javascript_websocket blueprints
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertServiceSchema, insertQuoteSchema, insertInvoiceSchema, insertReservationSchema } from "@shared/schema";

// WebSocket clients map
const wsClients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Service routes (public read, admin write)
  app.get("/api/services", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/admin/services", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/admin/services", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.json(service);
    } catch (error: any) {
      console.error("Error creating service:", error);
      res.status(400).json({ message: error.message || "Failed to create service" });
    }
  });

  app.patch("/api/admin/services/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.updateService(id, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/admin/services/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteService(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Quote routes
  app.get("/api/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quotes = await storage.getQuotes(userId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertQuoteSchema.parse({
        ...req.body,
        clientId: userId,
        status: "pending",
      });
      const quote = await storage.createQuote(validatedData);
      
      // Send notification to admins (in a real app, you'd get admin user IDs)
      // For now, we'll skip this as we don't have a way to get all admin IDs
      
      res.json(quote);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      res.status(400).json({ message: error.message || "Failed to create quote" });
    }
  });

  app.get("/api/admin/quotes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/admin/quotes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { mediaFiles, wheelCount, diameter, priceExcludingTax, taxRate, taxAmount, productDetails, quoteAmount, ...quoteData } = req.body;
      
      // Validate minimum 6 images requirement
      if (!mediaFiles || !Array.isArray(mediaFiles)) {
        return res.status(400).json({ message: "Media files are required" });
      }
      
      const imageCount = mediaFiles.filter((f: any) => f.type.startsWith('image/')).length;
      if (imageCount < 6) {
        return res.status(400).json({ 
          message: `Au moins 6 images sont requises (${imageCount}/6 fournis)` 
        });
      }
      
      const validatedData = insertQuoteSchema.parse({
        ...quoteData,
        wheelCount: wheelCount ? parseInt(wheelCount) : null,
        diameter,
        priceExcludingTax,
        taxRate,
        taxAmount,
        productDetails,
        quoteAmount,
        status: "pending",
      });
      const quote = await storage.createQuote(validatedData);
      
      // Create media entries
      for (const file of mediaFiles) {
        await storage.createQuoteMedia({
          quoteId: quote.id,
          filePath: file.key,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          fileName: file.name,
        });
      }
      
      // Create notification for client
      await storage.createNotification({
        userId: quote.clientId,
        type: "quote",
        title: "Nouveau devis",
        message: `Un devis a été créé pour vous`,
        relatedId: quote.id,
      });

      // Send WebSocket notification
      const client = wsClients.get(quote.clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "quote_updated",
          quoteId: quote.id,
          status: quote.status,
        }));
      }
      
      res.json(quote);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      res.status(400).json({ message: error.message || "Failed to create quote" });
    }
  });

  app.patch("/api/admin/quotes/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await storage.updateQuote(id, req.body);
      
      // Create notification for client
      await storage.createNotification({
        userId: quote.clientId,
        type: "quote",
        title: "Quote Updated",
        message: `Your quote has been ${quote.status}`,
        relatedId: quote.id,
      });

      // Send WebSocket notification
      const client = wsClients.get(quote.clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "quote_updated",
          quoteId: quote.id,
          status: quote.status,
        }));
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/admin/invoices", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/admin/invoices", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { mediaFiles, ...invoiceData } = req.body;
      
      // Validate minimum 6 images requirement
      if (!mediaFiles || !Array.isArray(mediaFiles)) {
        return res.status(400).json({ message: "Media files are required" });
      }
      
      const imageCount = mediaFiles.filter((f: any) => f.type.startsWith('image/')).length;
      if (imageCount < 6) {
        return res.status(400).json({ 
          message: `Au moins 6 images sont requises (${imageCount}/6 fournis)` 
        });
      }
      
      const validatedData = insertInvoiceSchema.parse(invoiceData);
      
      // Get quote to determine payment method
      const quote = await storage.getQuote(validatedData.quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Atomically get next invoice number (handles initialization and increment)
      const paymentType = quote.paymentMethod === "cash" ? "cash" : "other";
      const counter = await storage.incrementInvoiceCounter(paymentType);
      
      // Generate invoice number: MY-INV-ESP00000001 or MY-INV-OTH00000001
      const prefix = paymentType === "cash" ? "MY-INV-ESP" : "MY-INV-OTH";
      const paddedNumber = counter.currentNumber.toString().padStart(8, "0");
      const invoiceNumber = `${prefix}${paddedNumber}`;
      
      // Create invoice with generated number
      const invoice = await storage.createInvoice({
        ...validatedData,
        invoiceNumber,
      });
      
      // Create media entries
      for (const file of mediaFiles) {
        await storage.createInvoiceMedia({
          invoiceId: invoice.id,
          filePath: file.key,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          fileName: file.name,
        });
      }

      // Create notification for client
      await storage.createNotification({
        userId: invoice.clientId,
        type: "invoice",
        title: "New Invoice",
        message: `A new invoice has been generated`,
        relatedId: invoice.id,
      });

      // Send WebSocket notification
      const client = wsClients.get(invoice.clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "invoice_created",
          invoiceId: invoice.id,
        }));
      }
      
      res.json(invoice);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: error.message || "Failed to create invoice" });
    }
  });

  // Reservation routes
  app.get("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reservations = await storage.getReservations(userId);
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.get("/api/admin/reservations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const reservations = await storage.getReservations();
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.post("/api/admin/reservations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(validatedData);

      // Create notification for client
      await storage.createNotification({
        userId: reservation.clientId,
        type: "reservation",
        title: "Reservation Confirmed",
        message: `Your reservation has been confirmed`,
        relatedId: reservation.id,
      });

      // Send WebSocket notification
      const client = wsClients.get(reservation.clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "reservation_confirmed",
          reservationId: reservation.id,
        }));
      }
      
      res.json(reservation);
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      res.status(400).json({ message: error.message || "Failed to create reservation" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Admin users route
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        role: z.enum(["client", "admin"]).optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      });
      const validatedData = updateSchema.parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: error.message || "Failed to update user" });
    }
  });

  // Object Storage routes (Reference: javascript_object_storage blueprint)
  const { ObjectStorageService, ObjectNotFoundError } = await import("./objectStorage");

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: (await import("./objectAcl")).ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/quote-media", isAuthenticated, async (req, res) => {
    if (!req.body.mediaURL) {
      return res.status(400).json({ error: "mediaURL is required" });
    }

    const userId = (req as any).user.claims.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.mediaURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting media ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup (Reference: javascript_websocket blueprint)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('WebSocket client connected');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.userId) {
          wsClients.set(data.userId, ws);
          console.log(`User ${data.userId} authenticated via WebSocket`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of wsClients.entries()) {
        if (client === ws) {
          wsClients.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return httpServer;
}
