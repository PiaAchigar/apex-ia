import { InboxView } from "@/components/inbox/InboxView";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Inbox" };

export default async function InboxPage({ params }: Props) {
  const { slug } = await params;
  return <InboxView slug={slug} />;
}
