import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { channelCredentials } from "@apex-ia/database/schema/tenant";
import { channelIndex } from "@apex-ia/database/schema/public";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { encryptCredentials, decryptCredentials } from "../utils/encryption.js";
import { db } from "../db/drizzle.js";
import { logger } from "../utils/logger.js";

// Schema validation for WhatsApp Cloud API
const whatsappCloudConnectSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID required"),
  accessToken: z.string().min(1, "Access Token required"),
});

// Schema validation for Instagram/Facebook
const instagramFacebookConnectSchema = z.object({
  pageAccessToken: z.string().min(1, "Page Access Token required"),
  pageId: z.string().min(1, "Page ID required"),
});

// Schema validation for Telegram
const telegramConnectSchema = z.object({
  botToken: z.string().min(1, "Bot Token required"),
});

// Schema validation for Email
const emailConnectSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  resendApiKey: z.string().optional(),
});

// Schema validation for WebChat
const webChatConnectSchema = z.object({
  widgetId: z.string().min(1, "Widget ID required"),
});

export function createChannelsRoutes() {
  const router = new Hono<{ Bindings: Record<string, unknown> }>();

  router.use("*", authMiddleware);
  router.use("*", tenantMiddleware);

  // GET /settings/channels - List all connected channels for current tenant
  router.get("/", async (c) => {
    const tenantDb = c.get("tenantDb");
    const organizationId = c.get("organizationId");

    try {
      const channels = await tenantDb
        .select()
        .from(channelCredentials)
        .where(eq(channelCredentials.isActive, true));

      const formattedChannels = channels.map((channel) => ({
        channelType: channel.channelType,
        isActive: channel.isActive,
        connectedAt: channel.createdAt?.toISOString() || null,
      }));

      logger.debug(
        { organizationId, count: formattedChannels.length },
        "Fetched connected channels"
      );

      return c.json({ success: true, data: formattedChannels });
    } catch (error) {
      logger.error(
        { organizationId, error: (error as Error).message },
        "Failed to fetch channels"
      );
      throw error;
    }
  });

  // POST /settings/channels/:type/connect - Connect a new channel
  router.post("/:type/connect", async (c) => {
    const { type } = c.req.param();
    const organizationId = c.get("organizationId");
    const orgSlug = c.get("orgSlug");
    const tenantDb = c.get("tenantDb");

    try {
      let credentials: Record<string, unknown>;
      let externalIdentifier: string;

      // Validate and handle based on channel type
      switch (type.toLowerCase()) {
        case "whatsapp-cloud": {
          const input = c.req.valid("json");
          const schema = whatsappCloudConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid WhatsApp Cloud credentials",
                },
              },
              400
            );
          }

          const { phoneNumberId, accessToken } = schema.data;

          // Validate token with Meta API
          try {
            const response = await fetch(
              `https://graph.instagram.com/v18.0/${phoneNumberId}?access_token=${accessToken}`,
              { method: "GET" }
            );
            if (!response.ok) {
              return c.json(
                {
                  success: false,
                  error: {
                    code: "VALIDATION_FAILED",
                    message: "WhatsApp credentials validation failed",
                  },
                },
                400
              );
            }
          } catch (error) {
            logger.error(
              { organizationId, error: (error as Error).message },
              "WhatsApp API validation failed"
            );
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_FAILED",
                  message: "Could not validate WhatsApp credentials",
                },
              },
              400
            );
          }

          credentials = { phoneNumberId, accessToken };
          externalIdentifier = phoneNumberId;
          break;
        }

        case "instagram": {
          const input = c.req.valid("json");
          const schema = instagramFacebookConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid Instagram credentials",
                },
              },
              400
            );
          }

          const { pageAccessToken, pageId } = schema.data;

          // Validate token with Meta API
          try {
            const response = await fetch(
              `https://graph.instagram.com/v18.0/${pageId}?access_token=${pageAccessToken}`,
              { method: "GET" }
            );
            if (!response.ok) {
              return c.json(
                {
                  success: false,
                  error: {
                    code: "VALIDATION_FAILED",
                    message: "Instagram credentials validation failed",
                  },
                },
                400
              );
            }
          } catch (error) {
            logger.error(
              { organizationId, error: (error as Error).message },
              "Instagram API validation failed"
            );
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_FAILED",
                  message: "Could not validate Instagram credentials",
                },
              },
              400
            );
          }

          credentials = { pageAccessToken, pageId };
          externalIdentifier = pageId;
          break;
        }

        case "facebook": {
          const input = c.req.valid("json");
          const schema = instagramFacebookConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid Facebook credentials",
                },
              },
              400
            );
          }

          const { pageAccessToken, pageId } = schema.data;

          // Validate token with Meta API
          try {
            const response = await fetch(
              `https://graph.facebook.com/v18.0/${pageId}?access_token=${pageAccessToken}`,
              { method: "GET" }
            );
            if (!response.ok) {
              return c.json(
                {
                  success: false,
                  error: {
                    code: "VALIDATION_FAILED",
                    message: "Facebook credentials validation failed",
                  },
                },
                400
              );
            }
          } catch (error) {
            logger.error(
              { organizationId, error: (error as Error).message },
              "Facebook API validation failed"
            );
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_FAILED",
                  message: "Could not validate Facebook credentials",
                },
              },
              400
            );
          }

          credentials = { pageAccessToken, pageId };
          externalIdentifier = pageId;
          break;
        }

        case "telegram": {
          const input = c.req.valid("json");
          const schema = telegramConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid Telegram credentials",
                },
              },
              400
            );
          }

          const { botToken } = schema.data;

          // Validate token with Telegram API
          try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
            if (!response.ok) {
              return c.json(
                {
                  success: false,
                  error: {
                    code: "VALIDATION_FAILED",
                    message: "Telegram credentials validation failed",
                  },
                },
                400
              );
            }
          } catch (error) {
            logger.error(
              { organizationId, error: (error as Error).message },
              "Telegram API validation failed"
            );
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_FAILED",
                  message: "Could not validate Telegram credentials",
                },
              },
              400
            );
          }

          credentials = { botToken };
          externalIdentifier = botToken;
          break;
        }

        case "email": {
          const input = c.req.valid("json");
          const schema = emailConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid Email credentials",
                },
              },
              400
            );
          }

          const { smtpHost, smtpPort, smtpUser, smtpPass, resendApiKey } =
            schema.data;

          credentials = {
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            resendApiKey,
          };
          externalIdentifier = smtpUser || resendApiKey || "email";
          break;
        }

        case "webchat": {
          const input = c.req.valid("json");
          const schema = webChatConnectSchema.safeParse(input);
          if (!schema.success) {
            return c.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid WebChat credentials",
                },
              },
              400
            );
          }

          const { widgetId } = schema.data;

          credentials = { widgetId };
          externalIdentifier = widgetId;
          break;
        }

        default:
          return c.json(
            {
              success: false,
              error: {
                code: "INVALID_CHANNEL_TYPE",
                message: `Channel type '${type}' is not supported`,
              },
            },
            400
          );
      }

      // Check if channel is already connected
      const existing = await tenantDb
        .select()
        .from(channelCredentials)
        .where(eq(channelCredentials.channelType, type.toLowerCase()))
        .limit(1);

      if (existing.length > 0 && existing[0].isActive) {
        return c.json(
          {
            success: false,
            error: {
              code: "CHANNEL_ALREADY_CONNECTED",
              message: `Channel '${type}' is already connected`,
            },
          },
          409
        );
      }

      // Encrypt credentials
      const encryptedCredentials = encryptCredentials(
        JSON.stringify(credentials)
      );

      // Insert or update channel_credentials in tenant DB
      let channelId: string;
      if (existing.length > 0) {
        // Update existing (soft delete case)
        await tenantDb
          .update(channelCredentials)
          .set({
            encryptedCredentials,
            isActive: true,
          })
          .where(eq(channelCredentials.id, existing[0].id));
        channelId = existing[0].id;
      } else {
        // Insert new
        const result = await tenantDb
          .insert(channelCredentials)
          .values({
            channelType: type.toLowerCase(),
            encryptedCredentials,
            isActive: true,
          })
          .returning({ id: channelCredentials.id });
        channelId = result[0].id;
      }

      // UPSERT channel_index in MI Supabase (public schema)
      // Note: Using supabase raw query via db client since channelIndex is in public schema
      const channelIndexResult = await db
        .select()
        .from(channelIndex)
        .where(
          and(
            eq(channelIndex.organizationId, organizationId),
            eq(channelIndex.channelType, type.toLowerCase())
          )
        )
        .limit(1);

      if (channelIndexResult.length > 0) {
        await db
          .update(channelIndex)
          .set({ isActive: true, externalIdentifier })
          .where(eq(channelIndex.id, channelIndexResult[0].id));
      } else {
        await db.insert(channelIndex).values({
          organizationId,
          organizationSlug: orgSlug,
          channelType: type.toLowerCase(),
          externalIdentifier,
          isActive: true,
        });
      }

      logger.info(
        { organizationId, channelType: type, channelId },
        "Channel connected successfully"
      );

      return c.json(
        {
          success: true,
          data: {
            channelType: type.toLowerCase(),
            isActive: true,
            connectedAt: new Date().toISOString(),
          },
        },
        201
      );
    } catch (error) {
      logger.error(
        { organizationId, channelType: type, error: (error as Error).message },
        "Failed to connect channel"
      );
      throw error;
    }
  });

  // DELETE /settings/channels/:type - Disconnect a channel (soft delete)
  router.delete("/:type", async (c) => {
    const { type } = c.req.param();
    const organizationId = c.get("organizationId");
    const tenantDb = c.get("tenantDb");

    try {
      // Find channel in tenant DB
      const existing = await tenantDb
        .select()
        .from(channelCredentials)
        .where(eq(channelCredentials.channelType, type.toLowerCase()))
        .limit(1);

      if (existing.length === 0) {
        return c.json(
          {
            success: false,
            error: {
              code: "CHANNEL_NOT_FOUND",
              message: `Channel '${type}' is not connected`,
            },
          },
          404
        );
      }

      // Soft delete: mark as inactive
      await tenantDb
        .update(channelCredentials)
        .set({ isActive: false })
        .where(eq(channelCredentials.id, existing[0].id));

      // Update channel_index in MI Supabase
      const channelIndexResult = await db
        .select()
        .from(channelIndex)
        .where(
          and(
            eq(channelIndex.organizationId, organizationId),
            eq(channelIndex.channelType, type.toLowerCase())
          )
        )
        .limit(1);

      if (channelIndexResult.length > 0) {
        await db
          .update(channelIndex)
          .set({ isActive: false })
          .where(eq(channelIndex.id, channelIndexResult[0].id));
      }

      logger.info(
        { organizationId, channelType: type },
        "Channel disconnected successfully"
      );

      return c.json({
        success: true,
        data: {
          disconnected: true,
          channelType: type.toLowerCase(),
        },
      });
    } catch (error) {
      logger.error(
        { organizationId, channelType: type, error: (error as Error).message },
        "Failed to disconnect channel"
      );
      throw error;
    }
  });

  // POST /settings/channels/whatsapp-qr/connect - Initiate Baileys QR flow
  router.post("/whatsapp-qr/connect", async (c) => {
    const organizationId = c.get("organizationId");

    try {
      // TODO: Implement Baileys QR session initialization
      // This is a placeholder for Subfase 3+ implementation
      // For now, return a structure indicating this is in progress

      logger.info(
        { organizationId },
        "WhatsApp QR connect initiated (async process)"
      );

      return c.json(
        {
          success: true,
          data: {
            status: "pending",
            message: "WhatsApp QR scan initialization in progress",
            // qrCode: "data:image/png;base64,..." (populated once ready)
          },
        },
        202
      );
    } catch (error) {
      logger.error(
        { organizationId, error: (error as Error).message },
        "Failed to initiate WhatsApp QR connect"
      );
      throw error;
    }
  });

  // GET /settings/channels/whatsapp-qr/status - Check Baileys session status
  router.get("/whatsapp-qr/status", async (c) => {
    const organizationId = c.get("organizationId");

    try {
      // TODO: Check session state from cache/store
      // This is a placeholder for Subfase 3+ implementation

      return c.json({
        success: true,
        data: {
          status: "pending",
          message: "Awaiting QR code scan",
          // qrCode: "data:image/png;base64,..." (if available)
        },
      });
    } catch (error) {
      logger.error(
        { organizationId, error: (error as Error).message },
        "Failed to check WhatsApp QR status"
      );
      throw error;
    }
  });

  return router;
}
