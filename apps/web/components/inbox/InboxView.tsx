"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInboxStore } from "@/stores/inboxStore";
import { useInboxConversations } from "@/hooks/useInboxConversations";
import { InboxConversationList } from "./InboxConversationList";
import { InboxConversationDetailPanel } from "./InboxConversationDetailPanel";

type InboxViewProps = {
  slug: string;
  initialConversationId?: string;
};

export function InboxView({ slug, initialConversationId }: InboxViewProps) {
  const router = useRouter();
  const { selectedConversationId, selectConversation, filters } = useInboxStore();
  const { data: conversations } = useInboxConversations(filters);

  useEffect(() => {
    if (initialConversationId && !selectedConversationId) {
      selectConversation(initialConversationId);
    }
  }, [initialConversationId, selectedConversationId, selectConversation]);

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    router.push(`/${slug}/inbox/${id}`, { scroll: false });
  };

  const selectedConversation =
    conversations?.find((c) => c.id === selectedConversationId) ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <InboxConversationList onSelectConversation={handleSelectConversation} />
      <InboxConversationDetailPanel
        conversation={selectedConversation}
        orgSlug={slug}
      />
    </div>
  );
}
