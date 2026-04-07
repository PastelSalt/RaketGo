import Link from "next/link";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/StatCard";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { formatCurrency, timeAgo } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  if (session.userType === "admin") {
    redirect("/admin/dashboard");
  }

  if (session.userType === "worker") {
    const [user] = await queryRows<{ full_name: string; city: string; province: string; trust_score: number }>(
      "SELECT full_name, city, province, trust_score FROM users WHERE user_id = ?",
      [session.userId]
    );

    const skills = await queryRows<{ skill_id: number; skill_name: string; proficiency_level: string; is_verified: number }>(
      "SELECT skill_id, skill_name, proficiency_level, is_verified FROM user_skills WHERE user_id = ? ORDER BY is_verified DESC, created_at DESC",
      [session.userId]
    );

    const applications = await queryRows<
      Array<{ application_id: number; job_title: string; application_status: string; pay_amount: number; pay_type: string; applied_at: string; employer_name: string }>
    >(
      "SELECT ja.application_id, ja.application_status, ja.applied_at, j.job_title, j.pay_amount, j.pay_type, u.full_name AS employer_name FROM job_applications ja JOIN job_posts j ON ja.job_id = j.job_id JOIN users u ON ja.employer_id = u.user_id WHERE ja.worker_id = ? ORDER BY ja.applied_at DESC LIMIT 10",
      [session.userId]
    );

    const savedJobs = await queryRows<{ job_id: number; job_title: string; location_city: string; pay_amount: number; pay_type: string; job_status: string }>(
      "SELECT j.job_id, j.job_title, j.location_city, j.pay_amount, j.pay_type, j.job_status FROM user_interactions ui JOIN job_posts j ON ui.job_id = j.job_id WHERE ui.user_id = ? AND ui.interaction_type = 'save' ORDER BY ui.created_at DESC LIMIT 10",
      [session.userId]
    );

    const [stats] = await queryRows<
      Array<{ total_applications: number; approved_applications: number; pending_applications: number; saved_jobs: number }>
    >(
      "SELECT (SELECT COUNT(*) FROM job_applications WHERE worker_id = ?) AS total_applications, (SELECT COUNT(*) FROM job_applications WHERE worker_id = ? AND application_status = 'approved') AS approved_applications, (SELECT COUNT(*) FROM job_applications WHERE worker_id = ? AND application_status = 'pending') AS pending_applications, (SELECT COUNT(*) FROM user_interactions WHERE user_id = ? AND interaction_type = 'save') AS saved_jobs",
      [session.userId, session.userId, session.userId, session.userId]
    );

    return (
      <div className="grid" style={{ gap: "1rem" }}>
        <section className="card">
          <h1 className="page-title">Worker Dashboard</h1>
          <p className="muted">
            {user?.full_name} • {user?.city}, {user?.province}
          </p>
        </section>

        <section className="grid grid-2">
          <StatCard label="Total Applications" value={stats?.total_applications ?? 0} />
          <StatCard label="Approved Applications" value={stats?.approved_applications ?? 0} />
          <StatCard label="Pending Applications" value={stats?.pending_applications ?? 0} />
          <StatCard label="Saved Jobs" value={stats?.saved_jobs ?? 0} />
        </section>

        <section className="card">
          <h2>Skills</h2>
          <div className="grid" style={{ gap: "0.6rem" }}>
            {skills.length ? (
              skills.map((skill) => (
                <div key={skill.skill_id} className="tag" style={{ justifyContent: "space-between" }}>
                  <span>
                    {skill.skill_name} ({skill.proficiency_level})
                  </span>
                  {skill.is_verified ? <strong>Verified</strong> : null}
                </div>
              ))
            ) : (
              <p className="muted">No skills yet.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Recent Applications</h2>
          <div className="grid" style={{ gap: "0.6rem" }}>
            {applications.length ? (
              applications.map((item) => (
                <article key={item.application_id} className="card" style={{ boxShadow: "none" }}>
                  <h3>{item.job_title}</h3>
                  <p className="muted">Employer: {item.employer_name}</p>
                  <p className="muted">
                    {formatCurrency(Number(item.pay_amount))} / {item.pay_type}
                  </p>
                  <p className="muted">
                    Status: {item.application_status} • Applied {timeAgo(item.applied_at)}
                  </p>
                </article>
              ))
            ) : (
              <p className="muted">No applications yet.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Saved Jobs</h2>
          <div className="grid" style={{ gap: "0.6rem" }}>
            {savedJobs.length ? (
              savedJobs.map((job) => (
                <article key={job.job_id} className="card" style={{ boxShadow: "none" }}>
                  <h3>
                    <Link href={`/jobs/${job.job_id}`}>{job.job_title}</Link>
                  </h3>
                  <p className="muted">
                    {job.location_city} • {formatCurrency(Number(job.pay_amount))} / {job.pay_type}
                  </p>
                </article>
              ))
            ) : (
              <p className="muted">No saved jobs yet.</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  const [user] = await queryRows<{ full_name: string; city: string; province: string }>(
    "SELECT full_name, city, province FROM users WHERE user_id = ?",
    [session.userId]
  );

  const jobs = await queryRows<
    Array<{ job_id: number; job_title: string; job_status: string; created_at: string; application_count: number; pending_count: number }>
  >(
    "SELECT jp.job_id, jp.job_title, jp.job_status, jp.created_at, (SELECT COUNT(*) FROM job_applications WHERE job_id = jp.job_id) AS application_count, (SELECT COUNT(*) FROM job_applications WHERE job_id = jp.job_id AND application_status = 'pending') AS pending_count FROM job_posts jp WHERE jp.employer_id = ? ORDER BY jp.created_at DESC",
    [session.userId]
  );

  const pendingApps = await queryRows<
    Array<{ application_id: number; job_title: string; worker_name: string; trust_score: number; applied_at: string }>
  >(
    "SELECT ja.application_id, ja.applied_at, j.job_title, u.full_name AS worker_name, u.trust_score FROM job_applications ja JOIN job_posts j ON ja.job_id = j.job_id JOIN users u ON ja.worker_id = u.user_id WHERE ja.employer_id = ? AND ja.application_status = 'pending' ORDER BY ja.applied_at DESC LIMIT 8",
    [session.userId]
  );

  const [stats] = await queryRows<
    Array<{ total_jobs: number; active_jobs: number; total_applications: number; pending_applications: number }>
  >(
    "SELECT (SELECT COUNT(*) FROM job_posts WHERE employer_id = ?) AS total_jobs, (SELECT COUNT(*) FROM job_posts WHERE employer_id = ? AND job_status = 'active') AS active_jobs, (SELECT COUNT(*) FROM job_applications WHERE employer_id = ?) AS total_applications, (SELECT COUNT(*) FROM job_applications WHERE employer_id = ? AND application_status = 'pending') AS pending_applications",
    [session.userId, session.userId, session.userId, session.userId]
  );

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title">Employer Dashboard</h1>
        <p className="muted">
          {user?.full_name} • {user?.city}, {user?.province}
        </p>
        <Link className="btn btn-primary btn-small" href="/jobs/post">
          Post New Job
        </Link>
      </section>

      <section className="grid grid-2">
        <StatCard label="Total Jobs" value={stats?.total_jobs ?? 0} />
        <StatCard label="Active Jobs" value={stats?.active_jobs ?? 0} />
        <StatCard label="Total Applications" value={stats?.total_applications ?? 0} />
        <StatCard label="Pending Applications" value={stats?.pending_applications ?? 0} />
      </section>

      <section className="card">
        <h2>Posted Jobs</h2>
        <div className="grid" style={{ gap: "0.6rem" }}>
          {jobs.length ? (
            jobs.map((job) => (
              <article key={job.job_id} className="card" style={{ boxShadow: "none" }}>
                <h3>
                  <Link href={`/jobs/${job.job_id}`}>{job.job_title}</Link>
                </h3>
                <p className="muted">
                  Status: {job.job_status} • {job.application_count} applications ({job.pending_count} pending)
                </p>
              </article>
            ))
          ) : (
            <p className="muted">No jobs posted yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Pending Applications</h2>
        <div className="grid" style={{ gap: "0.6rem" }}>
          {pendingApps.length ? (
            pendingApps.map((item) => (
              <article key={item.application_id} className="card" style={{ boxShadow: "none" }}>
                <h3>{item.worker_name}</h3>
                <p className="muted">{item.job_title}</p>
                <p className="muted">Trust: {item.trust_score}</p>
              </article>
            ))
          ) : (
            <p className="muted">No pending applications.</p>
          )}
        </div>
      </section>
    </div>
  );
}
