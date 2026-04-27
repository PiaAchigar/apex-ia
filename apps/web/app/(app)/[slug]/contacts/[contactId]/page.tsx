import { ContactDetailSidebar } from "@/components/contacts/ContactDetailSidebar";

type ContactDetailPageProps = {
  params: Promise<{ slug: string; contactId: string }>;
};

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { contactId } = await params;

  return (
    <div className="flex h-full bg-[#111827] justify-center">
      <ContactDetailSidebar contactId={contactId} />
    </div>
  );
}
