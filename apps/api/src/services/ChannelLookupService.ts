import { eq, and } from "drizzle-orm";
import { channelIndex } from "@apex-ia/database/schema/public";
import { db } from "../db/drizzle.js";
import { databaseProvider } from "../db/database-provider.js";
import { InboxService } from "./InboxService.js";
import { ConversationService } from "./ConversationService.js";
import type { ChannelType } from "@apex-ia/types";

export class ChannelLookupService {
  async findTenantByChannelIdentifier(
    channelType: ChannelType | string,
    externalIdentifier: string
  ) {
    const rows = await db
      .select({
        organizationId: channelIndex.organizationId,
        organizationSlug: channelIndex.organizationSlug,
      })
      .from(channelIndex)
      .where(
        and(
          eq(channelIndex.channelType, channelType),
          eq(channelIndex.externalIdentifier, externalIdentifier),
          eq(channelIndex.isActive, true)
        )
      )
      .limit(1);

    if (!rows[0]) return null;

    return rows[0];
  }

  async createServicesForTenant(organizationId: string) {
    const tenantDb = await databaseProvider.getClientDrizzle(organizationId);
    const inboxService = new InboxService(tenantDb);
    const conversationService = new ConversationService(tenantDb);
    return { inboxService, conversationService, tenantDb };
  }
}
