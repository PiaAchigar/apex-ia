import { ImageIcon, FileAudio, FileVideo, FileIcon } from "lucide-react";
import { formatRelativeTime } from "@apex-ia/utils";

type Message = {
  id: string;
  senderType: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead: boolean;
  createdAt: string | null;
};

type InboxMessageBubbleProps = {
  message: Message;
};

export function InboxMessageBubble({ message }: InboxMessageBubbleProps) {
  const isAgent = message.senderType === "agent";
  const isBot = message.senderType === "bot";
  const isContact = message.senderType === "contact";

  const bubbleBase = "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed";
  const agentBubble = `${bubbleBase} bg-emerald-500/20 border border-emerald-500/30 text-gray-100 ml-auto rounded-br-sm`;
  const botBubble = `${bubbleBase} bg-purple-500/20 border border-purple-500/30 text-gray-100 ml-auto rounded-br-sm`;
  const contactBubble = `${bubbleBase} bg-[#1F2937] border border-[#374151] text-gray-200 mr-auto rounded-bl-sm`;

  const bubbleClass = isAgent ? agentBubble : isBot ? botBubble : contactBubble;

  const time = message.createdAt
    ? formatRelativeTime(new Date(message.createdAt))
    : "";

  return (
    <div
      className={`flex flex-col gap-1 ${isContact ? "items-start" : "items-end"} mb-3`}
    >
      {isBot && (
        <span className="text-xs text-purple-400 px-1">Bot</span>
      )}

      <div className={bubbleClass}>
        {message.mediaType && message.mediaUrl && (
          <MediaAttachment
            mediaType={message.mediaType}
            mediaUrl={message.mediaUrl}
          />
        )}
        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>

      <span className="text-xs text-gray-600 px-1">{time}</span>
    </div>
  );
}

function MediaAttachment({
  mediaType,
  mediaUrl,
}: {
  mediaType: string;
  mediaUrl: string;
}) {
  if (mediaType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl}
        alt="Imagen adjunta"
        className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
        loading="lazy"
      />
    );
  }

  if (mediaType === "audio") {
    return (
      <div className="flex items-center gap-2 mb-2">
        <FileAudio className="w-5 h-5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
        <audio src={mediaUrl} controls className="max-w-[200px]" aria-label="Mensaje de audio" />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <video
        src={mediaUrl}
        controls
        className="max-w-full rounded-lg mb-2"
        aria-label="Video adjunto"
      />
    );
  }

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors mb-2 cursor-pointer"
    >
      <FileIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm underline">Descargar archivo</span>
    </a>
  );
}
