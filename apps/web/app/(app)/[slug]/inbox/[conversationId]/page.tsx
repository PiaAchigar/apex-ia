import { InboxView } from "@/components/inbox/InboxView";

type Props = {
  params: Promise<{ slug: string; conversationId: string }>;
};

export const metadata = { title: "Conversación" };

export default async function ConversationPage({ params }: Props) {
  const { slug, conversationId } = await params;
  return <InboxView slug={slug} initialConversationId={conversationId} />;
}
