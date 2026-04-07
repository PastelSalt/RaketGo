import Link from "next/link";
import { getSessionUser, roleHomePath } from "@/lib/auth";
import { queryRows } from "@/lib/db";

export async function Navbar() {
  const user = await getSessionUser();
  let unreadCount = 0;

  if (user) {
    try {
      const rows = await queryRows<{ count: number }>(
        "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
        [user.userId]
      );
      unreadCount = Number(rows[0]?.count ?? 0);
    } catch {
      unreadCount = 0;
    }
  }

  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Link href="/" className="brand-link">
          <span className="brand-mark">✿</span>
          <span>
            Raket<span className="brand-highlight">G</span>o
          </span>
        </Link>

        <nav className="nav-links">
          <Link href="/" className="nav-pill">
            Home
          </Link>
          <Link href="/learn" className="nav-pill">
            Learn
          </Link>
          <Link href="/about" className="nav-pill">
            About
          </Link>
          <Link href="/help" className="nav-pill">
            Help
          </Link>

          {user ? (
            <>
              <Link href="/for-you" className="nav-pill">
                For You
              </Link>
              <Link href="/messages" className="nav-pill">
                Messages
              </Link>
              <Link href="/notifications" className="nav-pill notification-link">
                Notifications
                {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
              </Link>
              <Link href={roleHomePath(user.userType) as any} className="nav-pill">
                {user.userType === "admin" ? "Admin" : "Dashboard"}
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn btn-outline btn-small">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline btn-small">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary btn-small">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
