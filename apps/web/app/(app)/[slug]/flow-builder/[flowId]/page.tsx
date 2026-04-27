import { FlowBuilderEditorView } from "@/components/flow-builder/FlowBuilderEditorView";

type Props = {
  params: Promise<{ slug: string; flowId: string }>;
};

export default async function FlowEditorPage({ params }: Props) {
  const { flowId } = await params;
  return (
    <div className="h-full bg-[#111827] overflow-hidden">
      <FlowBuilderEditorView flowId={flowId} />
    </div>
  );
}
