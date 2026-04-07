import Link from "next/link";
import { getSessionUser, roleHomePath } from "@/lib/auth";

export async function Footer() {
  const user = await getSessionUser();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>RaketGo</h3>
          <p>
            Job matching platform for workers, employers, and admins with direct
            communication and recommendation feeds.
          </p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/learn">Learn</Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link href="/for-you">For You</Link>
                </li>
                <li>
                  <Link href="/messages">Messages</Link>
                </li>
                <li>
                  <Link href="/notifications">Notifications</Link>
                </li>
                <li>
                  <Link href={roleHomePath(user.userType) as React.ComponentProps<typeof Link>["href"]}>
                    {user.userType === "admin" ? "Admin Dashboard" : "Dashboard"}
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login">Login</Link>
                </li>
                <li>
                  <Link href="/signup">Sign Up</Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <p>
            Browse jobs, post opportunities, and track applications in one
            workflow. Workers can manage skills, while employers can review
            candidates from their dashboard.
          </p>
        </div>
      </div>
      <div className="footer-bottom">{new Date().getFullYear()} RaketGo by Moesoft</div>
    </footer>
  );
}
