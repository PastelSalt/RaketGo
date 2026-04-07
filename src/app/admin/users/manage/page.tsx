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
    <section className="card">
      <h1 className="page-title">Manage Users</h1>
      <div className="grid" style={{ gap: "0.6rem" }}>
        {users.map((user) => (
          <article key={user.user_id} className="card" style={{ boxShadow: "none" }}>
            <strong>{user.full_name}</strong>
            <p className="muted">
              {user.user_type} • {user.mobile_number} • {user.city} • {user.account_status}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
