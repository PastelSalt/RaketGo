import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";

export default async function ManageUsersPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/admin/users/manage");
  }
  if (session.userType !== "admin") {
    redirect("/");
  }

  const users = await queryRows<
    Array<{ user_id: number; full_name: string; mobile_number: string; user_type: string; city: string; account_status: string }>
  >(
    "SELECT user_id, full_name, mobile_number, user_type, city, account_status FROM users WHERE user_type != 'admin' ORDER BY created_at DESC LIMIT 100"
  );

  return (
    <section className="card space-y-4">
      <div>
        <h1 className="page-title">Manage Users</h1>
        <p className="muted">Review the most recent worker and employer accounts.</p>
      </div>
      <div className="grid gap-2">
        {users.map((user) => (
          <article key={user.user_id} className="rounded-2xl border-2 border-brand-blue bg-brand-blue p-4">
            <strong className="text-sm text-brand-ink">{user.full_name}</strong>
            <p className="muted">
              {user.user_type} • {user.mobile_number} • {user.city} • {user.account_status}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
