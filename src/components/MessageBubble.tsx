import { timeAgo } from "@/lib/utils";

interface MessageBubbleProps {
  currentUserId: number;
  message: {
    message_id: number;
    sender_id: number;
    sender_name: string;
    message_content: string;
    sent_at: string;
  };
}

export function MessageBubble({ currentUserId, message }: MessageBubbleProps) {
  const ownMessage = currentUserId === Number(message.sender_id);

  return (
    <div className={`message-bubble ${ownMessage ? "mine" : "theirs"}`}>
      <p>{message.message_content}</p>
      <small>
        {ownMessage ? "You" : message.sender_name} • {timeAgo(message.sent_at)}
      </small>
    </div>
  );
}
