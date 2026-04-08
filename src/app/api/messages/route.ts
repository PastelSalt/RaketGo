import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { messageSchema } from "@/lib/validators";
import { sanitizeInput } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const partnerId = Number(url.searchParams.get("with") ?? 0);

  if (!partnerId) {
    const conversations = await queryRows<
      Array<{ user_id: number; full_name: string; user_type: string; unread_count: number; last_message: string | null; last_sent_at: string | null }>
    >(
      "SELECT DISTINCT u.user_id, u.full_name, u.user_type, (SELECT COUNT(*) FROM public.messages m3 WHERE m3.sender_id = u.user_id AND m3.receiver_id = ? AND m3.is_read = FALSE) AS unread_count, (SELECT m2.message_content FROM public.messages m2 WHERE (m2.sender_id = ? AND m2.receiver_id = u.user_id) OR (m2.sender_id = u.user_id AND m2.receiver_id = ?) ORDER BY m2.sent_at DESC LIMIT 1) AS last_message, (SELECT m4.sent_at FROM public.messages m4 WHERE (m4.sender_id = ? AND m4.receiver_id = u.user_id) OR (m4.sender_id = u.user_id AND m4.receiver_id = ?) ORDER BY m4.sent_at DESC LIMIT 1) AS last_sent_at FROM public.messages m JOIN public.users u ON u.user_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END WHERE (m.sender_id = ? OR m.receiver_id = ?) ORDER BY last_sent_at DESC",
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

    return NextResponse.json({ data: conversations });
  }

  const messages = await queryRows<
    Array<{ message_id: number; sender_id: number; receiver_id: number; message_content: string; sent_at: string }>
  >(
    "SELECT message_id, sender_id, receiver_id, message_content, sent_at FROM public.messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC",
    [session.userId, partnerId, partnerId, session.userId]
  );

  return NextResponse.json({ data: messages });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL("/login?redirect=/messages", request.url));
  }

  const formData = await request.formData();
  const parsed = messageSchema.safeParse({
    receiver_id: Number(formData.get("receiver_id") ?? 0),
    message_content: sanitizeInput(formData.get("message_content"))
  });

  const destination = parsed.success ? `/messages?with=${parsed.data.receiver_id}` : "/messages";

  if (!parsed.success) {
    const errorUrl = new URL(destination, request.url);
    errorUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid message payload.");
    return NextResponse.redirect(errorUrl);
  }

  if (parsed.data.receiver_id === session.userId) {
    const errorUrl = new URL(destination, request.url);
    errorUrl.searchParams.set("error", "Cannot message yourself.");
    return NextResponse.redirect(errorUrl);
  }

  const [receiver] = await queryRows<{ user_id: number }>(
    "SELECT user_id FROM public.users WHERE user_id = ? AND account_status = 'active' LIMIT 1",
    [parsed.data.receiver_id]
  );

  if (!receiver) {
    const errorUrl = new URL(destination, request.url);
    errorUrl.searchParams.set("error", "Recipient not found.");
    return NextResponse.redirect(errorUrl);
  }

  await execute("INSERT INTO public.messages (sender_id, receiver_id, message_content) VALUES (?, ?, ?)", [
    session.userId,
    parsed.data.receiver_id,
    parsed.data.message_content
  ]);

  await execute(
    "INSERT INTO public.notifications (user_id, notification_type, title, message, related_id, related_type, action_url) VALUES (?, 'message', 'New Message', ?, ?, 'message', ?)",
    [
      parsed.data.receiver_id,
      `${session.fullName} sent you a message.`,
      session.userId,
      `/messages?with=${session.userId}`
    ]
  );

  const successUrl = new URL(destination, request.url);
  successUrl.searchParams.set("success", "Message sent.");
  return NextResponse.redirect(successUrl);
}
