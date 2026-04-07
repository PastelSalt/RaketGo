import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { sanitizeInput } from "@/lib/utils";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await queryRows<
    Array<{
      notification_id: number;
      notification_type: string;
      title: string;
      message: string;
      is_read: number | boolean;
      action_url: string | null;
      created_at: string;
    }>
  >(
    "SELECT notification_id, notification_type, title, message, is_read, action_url, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [session.userId]
  );

  return NextResponse.json({ data: rows });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL("/login?redirect=/notifications", request.url));
  }

  const formData = await request.formData();
  const action = sanitizeInput(formData.get("action"));

  if (action === "mark_read") {
    const notificationId = Number(formData.get("notification_id") ?? 0);
    if (notificationId > 0) {
      await execute(
        "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE notification_id = ? AND user_id = ?",
        [notificationId, session.userId]
      );
    }
  } else if (action === "mark_all_read") {
    await execute("UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE", [
      session.userId
    ]);
  }

  const url = new URL("/notifications", request.url);
  url.searchParams.set("success", "Notifications updated.");
  return NextResponse.redirect(url);
}
