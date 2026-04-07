import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/StatCard";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/admin/dashboard");
  }
  if (session.userType !== "admin") {
    redirect("/");
  }

  const [userStats] = await queryRows<{ workers: number; employers: number; total: number }>(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN user_type = 'worker' THEN 1 ELSE 0 END) AS workers, SUM(CASE WHEN user_type = 'employer' THEN 1 ELSE 0 END) AS employers FROM users"
  );

  const [jobStats] = await queryRows<{ total_jobs: number; active_jobs: number; in_progress_jobs: number }>(
    "SELECT COUNT(*) AS total_jobs, SUM(CASE WHEN job_status = 'active' THEN 1 ELSE 0 END) AS active_jobs, SUM(CASE WHEN job_status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_jobs FROM job_posts"
  );

  const [appStats] = await queryRows<{ total_apps: number; approved_apps: number; pending_apps: number }>(
    "SELECT COUNT(*) AS total_apps, SUM(CASE WHEN application_status = 'approved' THEN 1 ELSE 0 END) AS approved_apps, SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending_apps FROM job_applications"
  );

  const [skillPosts] = await queryRows<{ total_posts: number }>(
    "SELECT COUNT(*) AS total_posts FROM skill_posts"
  );

  const recentUsers = await queryRows<{ user_id: number; full_name: string; user_type: string; city: string; created_at: string }>(
    "SELECT user_id, full_name, user_type, city, created_at FROM users WHERE user_type != 'admin' ORDER BY created_at DESC LIMIT 5"
  );

  const recentJobs = await queryRows<{ job_id: number; job_title: string; job_status: string; employer_name: string }>(
    "SELECT j.job_id, j.job_title, j.job_status, u.full_name AS employer_name FROM job_posts j JOIN users u ON j.employer_id = u.user_id ORDER BY j.created_at DESC LIMIT 5"
  );

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title">Admin Dashboard</h1>
        <div className="grid grid-3">
          <StatCard label="Users" value={userStats?.total ?? 0} />
          <StatCard label="Workers" value={userStats?.workers ?? 0} />
          <StatCard label="Employers" value={userStats?.employers ?? 0} />
          <StatCard label="Jobs" value={jobStats?.total_jobs ?? 0} />
          <StatCard label="Applications" value={appStats?.total_apps ?? 0} />
          <StatCard label="Skill Posts" value={skillPosts?.total_posts ?? 0} />
        </div>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Recent Users</h2>
          {recentUsers.map((item) => (
            <p key={item.user_id} className="muted">
              {item.full_name} ({item.user_type}) • {item.city}
            </p>
          ))}
          <Link href="/admin/users/manage" className="btn btn-outline btn-small">
            Manage Users
          </Link>
        </article>

        <article className="card">
          <h2>Recent Jobs</h2>
          {recentJobs.map((item) => (
            <p key={item.job_id} className="muted">
              {item.job_title} • {item.employer_name} • {item.job_status}
            </p>
          ))}
          <Link href="/admin/skills/create" className="btn btn-outline btn-small">
            Add Skill Post
          </Link>
        </article>
      </section>
    </div>
  );
}
