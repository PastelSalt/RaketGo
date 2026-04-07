import { redirect } from "next/navigation";
import { NotificationItem } from "@/components/NotificationItem";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";

type SearchParams = {
  success?: string;
};

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/notifications");
  }

  const params = await searchParams;

  const notifications = await queryRows<
    Array<{
      notification_id: number;
      notification_type: string;
      title: string;
      message: string;
      is_read: number;
      action_url: string | null;
      created_at: string;
    }>
  >(
    "SELECT notification_id, notification_type, title, message, is_read, action_url, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [session.userId]
  );

  return (
    <div className="grid gap-6">
      <section className="card flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="muted">Stay on top of application and message updates.</p>
        </div>
        {params.success ? <div className="alert alert-success">{decodeURIComponent(params.success)}</div> : null}
        <form action="/api/notifications" method="post">
          <input type="hidden" name="action" value="mark_all_read" />
          <button className="btn btn-outline btn-small" type="submit">
            Mark All Read
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        {notifications.length ? (
          notifications.map((item) => (
            <div key={item.notification_id}>
              <NotificationItem item={item} />
              {!item.is_read ? (
                <form action="/api/notifications" method="post" className="mt-2">
                  <input type="hidden" name="action" value="mark_read" />
                  <input type="hidden" name="notification_id" value={item.notification_id} />
                  <button className="btn btn-outline btn-small" type="submit">
                    Mark Read
                  </button>
                </form>
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted">No notifications yet.</p>
        )}
      </section>
    </div>
  );
}
