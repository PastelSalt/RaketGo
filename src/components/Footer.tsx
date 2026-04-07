import Link from "next/link";
import { getSessionUser, roleHomePath } from "@/lib/auth";

export async function Footer() {
  const user = await getSessionUser();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-brand-ink">RaketGo</h3>
          <p className="muted leading-6">
            Job matching platform for workers, employers, and admins with direct
            communication and recommendation feeds.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-ink">Quick Links</h4>
          <ul>
            <li>
              <Link href="/" className="footer-link">
                Home
              </Link>
            </li>
            <li>
              <Link href="/learn" className="footer-link">
                Learn
              </Link>
            </li>
            <li>
              <Link href="/about" className="footer-link">
                About
              </Link>
            </li>
            <li>
              <Link href="/help" className="footer-link">
                Help Tutorial
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link href="/for-you" className="footer-link">
                    For You
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="footer-link">
                    Messages
                  </Link>
                </li>
                <li>
                  <Link href="/notifications" className="footer-link">
                    Notifications
                  </Link>
                </li>
                <li>
                  <Link
                    href={roleHomePath(user.userType) as React.ComponentProps<typeof Link>["href"]}
                    className="footer-link"
                  >
                    {user.userType === "admin" ? "Admin Dashboard" : "Dashboard"}
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className="footer-link">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="footer-link">
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-ink">Help</h4>
          <ul>
            <li>
              <Link href="/help" className="footer-link">
                Getting Started Guide
              </Link>
            </li>
            <li>
              <Link href="/help" className="footer-link">
                Worker Tutorial
              </Link>
            </li>
            <li>
              <Link href="/help" className="footer-link">
                Employer Tutorial
              </Link>
            </li>
            <li>
              <Link href="/about" className="footer-link">
                About Moesoft
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">{new Date().getFullYear()} RaketGo by Moesoft</div>
    </footer>
  );
}
