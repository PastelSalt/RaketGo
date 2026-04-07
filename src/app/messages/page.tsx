import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageBubble } from "@/components/MessageBubble";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";

type SearchParams = {
  with?: string;
  success?: string;
  error?: string;
};

export default async function MessagesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/messages");
  }

  const params = await searchParams;
  const partnerId = Number(params.with ?? 0) || 0;

  const conversations = await queryRows<
    Array<{ user_id: number; full_name: string; user_type: string; unread_count: number; last_message: string; last_sent_at: string | null }>
  >(
    "SELECT DISTINCT u.user_id, u.full_name, u.user_type, (SELECT COUNT(*) FROM messages m3 WHERE m3.sender_id = u.user_id AND m3.receiver_id = ? AND m3.is_read = 0) AS unread_count, (SELECT m2.message_content FROM messages m2 WHERE (m2.sender_id = ? AND m2.receiver_id = u.user_id) OR (m2.sender_id = u.user_id AND m2.receiver_id = ?) ORDER BY m2.sent_at DESC LIMIT 1) AS last_message, (SELECT m4.sent_at FROM messages m4 WHERE (m4.sender_id = ? AND m4.receiver_id = u.user_id) OR (m4.sender_id = u.user_id AND m4.receiver_id = ?) ORDER BY m4.sent_at DESC LIMIT 1) AS last_sent_at FROM messages m JOIN users u ON u.user_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END WHERE (m.sender_id = ? OR m.receiver_id = ?) ORDER BY last_sent_at DESC",
    [
      session.userId,
      session.userId,
      session.userId,
      session.userId,
      session.userId,
      session.userId,
      session.userId,
      session.userId
    ]
  );

  let partner: { user_id: number; full_name: string; user_type: string } | null = null;
  let messages: Array<{
    message_id: number;
    sender_id: number;
    sender_name: string;
    message_content: string;
    sent_at: string;
  }> = [];

  if (partnerId > 0) {
    const [partnerRow] = await queryRows<{ user_id: number; full_name: string; user_type: string }>(
      "SELECT user_id, full_name, user_type FROM users WHERE user_id = ? AND account_status = 'active'",
      [partnerId]
    );
    partner = partnerRow ?? null;

    if (partner) {
      messages = await queryRows<typeof messages>(
        "SELECT m.message_id, m.sender_id, s.full_name AS sender_name, m.message_content, m.sent_at FROM messages m JOIN users s ON m.sender_id = s.user_id WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?) ORDER BY m.sent_at ASC",
        [session.userId, partnerId, partnerId, session.userId]
      );

      await execute(
        "UPDATE messages SET is_read = 1, read_at = NOW() WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
        [partnerId, session.userId]
      );
    }
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title">Messages</h1>
        {params.success ? <div className="alert alert-success">{decodeURIComponent(params.success)}</div> : null}
        {params.error ? <div className="alert alert-error">{decodeURIComponent(params.error)}</div> : null}
      </section>

      <section className="message-shell">
        <aside className="card message-list">
          {conversations.length ? (
            conversations.map((item) => (
              <Link key={item.user_id} href={`/messages?with=${item.user_id}`} className="card" style={{ boxShadow: "none" }}>
                <strong>{item.full_name}</strong>
                <p className="muted">{item.user_type}</p>
                <p className="muted">{item.last_message || "No messages yet"}</p>
                {item.unread_count ? <span className="badge">{item.unread_count}</span> : null}
              </Link>
            ))
          ) : (
            <p className="muted">No conversations yet.</p>
          )}
        </aside>

        <div className="card">
          {partner ? (
            <>
              <h2>Chat with {partner.full_name}</h2>
              <div className="grid" style={{ gap: "0.6rem", marginBottom: "1rem" }}>
                {messages.length ? (
                  messages.map((message) => (
                    <MessageBubble key={message.message_id} currentUserId={session.userId} message={message} />
                  ))
                ) : (
                  <p className="muted">No messages yet.</p>
                )}
              </div>

              <form action="/api/messages" method="post" className="stack-form">
                <input type="hidden" name="receiver_id" value={partner.user_id} />
                <label>
                  Message
                  <textarea name="message_content" rows={4} required />
                </label>
                <button className="btn btn-primary" type="submit">
                  Send Message
                </button>
              </form>
            </>
          ) : (
            <p className="muted">Select a conversation from the left panel.</p>
          )}
        </div>
      </section>
    </div>
  );
}
