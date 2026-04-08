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
      "SELECT full_name, city, province, trust_score FROM public.users WHERE user_id = ?",
      [session.userId]
    );

    const skills = await queryRows<{ skill_id: number; skill_name: string; proficiency_level: string; is_verified: number }>(
      "SELECT skill_id, skill_name, proficiency_level, is_verified FROM public.user_skills WHERE user_id = ? ORDER BY is_verified DESC, created_at DESC",
      [session.userId]
    );

    const applications = await queryRows<
      Array<{ application_id: number; job_title: string; application_status: string; pay_amount: number; pay_type: string; applied_at: string; employer_name: string }>
    >(
      "SELECT ja.application_id, ja.application_status, ja.applied_at, j.job_title, j.pay_amount, j.pay_type, u.full_name AS employer_name FROM public.job_applications ja JOIN public.job_posts j ON ja.job_id = j.job_id JOIN public.users u ON ja.employer_id = u.user_id WHERE ja.worker_id = ? ORDER BY ja.applied_at DESC LIMIT 10",
      [session.userId]
    );

    const savedJobs = await queryRows<{ job_id: number; job_title: string; location_city: string; pay_amount: number; pay_type: string; job_status: string }>(
      "SELECT j.job_id, j.job_title, j.location_city, j.pay_amount, j.pay_type, j.job_status FROM public.user_interactions ui JOIN public.job_posts j ON ui.job_id = j.job_id WHERE ui.user_id = ? AND ui.interaction_type = 'save' ORDER BY ui.created_at DESC LIMIT 10",
      [session.userId]
    );

    const [stats] = await queryRows<
      Array<{ total_applications: number; approved_applications: number; pending_applications: number; saved_jobs: number }>
    >(
      "SELECT (SELECT COUNT(*) FROM public.job_applications WHERE worker_id = ?) AS total_applications, (SELECT COUNT(*) FROM public.job_applications WHERE worker_id = ? AND application_status = 'approved') AS approved_applications, (SELECT COUNT(*) FROM public.job_applications WHERE worker_id = ? AND application_status = 'pending') AS pending_applications, (SELECT COUNT(*) FROM public.user_interactions WHERE user_id = ? AND interaction_type = 'save') AS saved_jobs",
      [session.userId, session.userId, session.userId, session.userId]
    );

    return (
      <div className="grid gap-6">
        <section className="card space-y-3">
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

        <section className="card space-y-3">
          <h2 className="section-title">Skills</h2>
          <div className="grid gap-2">
            {skills.length ? (
              skills.map((skill) => (
                <div
                  key={skill.skill_id}
                  className="flex items-center justify-between gap-2 rounded-2xl border-2 border-brand-red bg-brand-red px-3 py-2 text-sm font-semibold text-brand-ink"
                >
                  <span>
                    {skill.skill_name} ({skill.proficiency_level})
                  </span>
                  {skill.is_verified ? <strong className="text-xs uppercase">Verified</strong> : null}
                </div>
              ))
            ) : (
              <p className="empty-state">No skills yet.</p>
            )}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="section-title">Recent Applications</h2>
          <div className="grid gap-2">
            {applications.length ? (
              applications.map((item) => (
                <article key={item.application_id} className="sub-card">
                  <h3 className="text-base font-semibold text-brand-ink">{item.job_title}</h3>
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
              <p className="empty-state">No applications yet.</p>
            )}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="section-title">Saved Jobs</h2>
          <div className="grid gap-2">
            {savedJobs.length ? (
              savedJobs.map((job) => (
                <article key={job.job_id} className="sub-card">
                  <h3 className="text-base font-semibold text-brand-ink">
                    <Link href={`/jobs/${job.job_id}`} className="hover:text-brand-ink-soft">
                      {job.job_title}
                    </Link>
                  </h3>
                  <p className="muted">
                    {job.location_city} • {formatCurrency(Number(job.pay_amount))} / {job.pay_type}
                  </p>
                </article>
              ))
            ) : (
              <p className="empty-state">No saved jobs yet.</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  const [user] = await queryRows<{ full_name: string; city: string; province: string }>(
    "SELECT full_name, city, province FROM public.users WHERE user_id = ?",
    [session.userId]
  );

  const jobs = await queryRows<
    Array<{ job_id: number; job_title: string; job_status: string; created_at: string; application_count: number; pending_count: number }>
  >(
    "SELECT jp.job_id, jp.job_title, jp.job_status, jp.created_at, (SELECT COUNT(*) FROM public.job_applications WHERE job_id = jp.job_id) AS application_count, (SELECT COUNT(*) FROM public.job_applications WHERE job_id = jp.job_id AND application_status = 'pending') AS pending_count FROM public.job_posts jp WHERE jp.employer_id = ? ORDER BY jp.created_at DESC",
    [session.userId]
  );

  const pendingApps = await queryRows<
    Array<{ application_id: number; job_title: string; worker_name: string; trust_score: number; applied_at: string }>
  >(
    "SELECT ja.application_id, ja.applied_at, j.job_title, u.full_name AS worker_name, u.trust_score FROM public.job_applications ja JOIN public.job_posts j ON ja.job_id = j.job_id JOIN public.users u ON ja.worker_id = u.user_id WHERE ja.employer_id = ? AND ja.application_status = 'pending' ORDER BY ja.applied_at DESC LIMIT 8",
    [session.userId]
  );

  const [stats] = await queryRows<
    Array<{ total_jobs: number; active_jobs: number; total_applications: number; pending_applications: number }>
  >(
    "SELECT (SELECT COUNT(*) FROM public.job_posts WHERE employer_id = ?) AS total_jobs, (SELECT COUNT(*) FROM public.job_posts WHERE employer_id = ? AND job_status = 'active') AS active_jobs, (SELECT COUNT(*) FROM public.job_applications WHERE employer_id = ?) AS total_applications, (SELECT COUNT(*) FROM public.job_applications WHERE employer_id = ? AND application_status = 'pending') AS pending_applications",
    [session.userId, session.userId, session.userId, session.userId]
  );

  return (
    <div className="grid gap-6">
      <section className="card space-y-3">
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

      <section className="card space-y-3">
        <h2 className="section-title">Posted Jobs</h2>
        <div className="grid gap-2">
          {jobs.length ? (
            jobs.map((job) => (
              <article key={job.job_id} className="sub-card">
                <h3 className="text-base font-semibold text-brand-ink">
                  <Link href={`/jobs/${job.job_id}`} className="hover:text-brand-ink-soft">
                    {job.job_title}
                  </Link>
                </h3>
                <p className="muted">
                  Status: {job.job_status} • {job.application_count} applications ({job.pending_count} pending)
                </p>
              </article>
            ))
          ) : (
            <p className="empty-state">No jobs posted yet.</p>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Pending Applications</h2>
        <div className="grid gap-2">
          {pendingApps.length ? (
            pendingApps.map((item) => (
              <article key={item.application_id} className="sub-card">
                <h3 className="text-base font-semibold text-brand-ink">{item.worker_name}</h3>
                <p className="muted">{item.job_title}</p>
                <p className="muted">Trust: {item.trust_score}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">No pending applications.</p>
          )}
        </div>
      </section>
    </div>
  );
}
