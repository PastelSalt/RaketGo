import { timeAgo } from "@/lib/utils";

interface NotificationItemProps {
  item: {
    notification_id: number;
    title: string;
    message: string;
    notification_type: string;
    is_read: number | boolean;
    created_at: string;
    action_url: string | null;
  };
}

export function NotificationItem({ item }: NotificationItemProps) {
  return (
    <article className={`card space-y-3 ${item.is_read ? "" : "card-unread"}`}>
      <div className="notification-top">
        <h3 className="text-lg font-semibold tracking-tight text-brand-ink">{item.title}</h3>
        <span className="tag">{item.notification_type}</span>
      </div>
      <p className="text-sm leading-6 text-brand-ink">{item.message}</p>
      <p className="muted">{timeAgo(item.created_at)}</p>
      {item.action_url ? (
        <a href={item.action_url} className="btn btn-outline btn-small">
          Open
        </a>
      ) : null}
    </article>
  );
}
