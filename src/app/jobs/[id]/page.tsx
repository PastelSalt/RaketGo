import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { formatCurrency, timeAgo } from "@/lib/utils";

type Params = {
  id: string;
};

type SearchParams = {
  success?: string;
  error?: string;
};

export default async function JobDetailsPage({
  params,
  searchParams
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const jobId = Number(resolvedParams.id);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    notFound();
  }

  const session = await getSessionUser();

  const jobs = await queryRows<
    Array<{
      job_id: number;
      employer_id: number;
      job_title: string;
      job_description: string;
      location_region: string;
      location_province: string;
      location_city: string;
      specific_address: string | null;
      pay_amount: number;
      pay_type: string;
      required_skills: string | null;
      preferred_skills: string | null;
      job_category: string | null;
      slots_available: number;
      slots_filled: number;
      job_status: string;
      created_at: string;
      employer_name: string;
      employer_phone: string;
      employer_email: string | null;
      employer_trust_score: number;
    }>
  >(
    "SELECT j.job_id, j.employer_id, j.job_title, j.job_description, j.location_region, j.location_province, j.location_city, j.specific_address, j.pay_amount, j.pay_type, j.required_skills, j.preferred_skills, j.job_category, j.slots_available, j.slots_filled, j.job_status, j.created_at, u.full_name AS employer_name, u.mobile_number AS employer_phone, u.email AS employer_email, u.trust_score AS employer_trust_score FROM job_posts j JOIN users u ON j.employer_id = u.user_id WHERE j.job_id = ?",
    [jobId]
  );

  const job = jobs[0];
  if (!job) {
    notFound();
  }

  const userApplication =
    session?.userType === "worker"
      ? (
          await queryRows<
            Array<{ application_id: number; application_status: string; applied_at: string }>
          >(
            "SELECT application_id, application_status, applied_at FROM job_applications WHERE job_id = ? AND worker_id = ? LIMIT 1",
            [jobId, session.userId]
          )
        )[0]
      : null;

  const isSaved =
    session?.userType === "worker"
      ? Boolean(
          (
            await queryRows<Array<{ interaction_id: number }>>(
              "SELECT interaction_id FROM user_interactions WHERE user_id = ? AND job_id = ? AND interaction_type = 'save' LIMIT 1",
              [session.userId, jobId]
            )
          )[0]
        )
      : false;

  const applications =
    session?.userType === "employer" && session.userId === job.employer_id
      ? await queryRows<
          Array<{
            application_id: number;
            worker_id: number;
            full_name: string;
            mobile_number: string;
            trust_score: number;
            application_status: string;
            cover_letter: string | null;
            applied_at: string;
          }>
        >(
          "SELECT ja.application_id, ja.worker_id, u.full_name, u.mobile_number, u.trust_score, ja.application_status, ja.cover_letter, ja.applied_at FROM job_applications ja JOIN users u ON ja.worker_id = u.user_id WHERE ja.job_id = ? ORDER BY ja.applied_at DESC",
          [jobId]
        )
      : [];

  if (session) {
    await execute(
      "INSERT INTO user_interactions (user_id, interaction_type, job_id) VALUES (?, 'view', ?)",
      [session.userId, jobId]
    ).catch(() => undefined);
  }

  return (
    <div className="grid gap-6">
      <section className="card space-y-3">
        <h1 className="page-title">{job.job_title}</h1>
        <p className="muted">
          {job.location_city}, {job.location_province}, {job.location_region}
        </p>
        <p className="muted">
          {formatCurrency(Number(job.pay_amount))} / {job.pay_type} • {job.job_status}
        </p>
        <p className="text-sm leading-7 text-brand-ink">{job.job_description}</p>
        <p className="muted">Posted {timeAgo(job.created_at)}</p>
        <p className="muted">
          Employer: {job.employer_name} • Trust score {job.employer_trust_score}
        </p>
        <p className="muted">Contact: {job.employer_phone}</p>
        {resolvedSearch.success ? <div className="alert alert-success">{decodeURIComponent(resolvedSearch.success)}</div> : null}
        {resolvedSearch.error ? <div className="alert alert-error">{decodeURIComponent(resolvedSearch.error)}</div> : null}
      </section>

      <section className="card space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-brand-ink">Job Requirements</h2>
        <p className="text-sm text-brand-ink">
          <strong>Required skills:</strong> {job.required_skills || "Not specified"}
        </p>
        <p className="text-sm text-brand-ink">
          <strong>Preferred skills:</strong> {job.preferred_skills || "Not specified"}
        </p>
        <p className="text-sm text-brand-ink">
          <strong>Category:</strong> {job.job_category || "Uncategorized"}
        </p>
        <p className="text-sm text-brand-ink">
          <strong>Slots:</strong> {job.slots_filled} / {job.slots_available}
        </p>
      </section>

      {session?.userType === "worker" ? (
        <section className="card space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-brand-ink">Worker Actions</h2>
          {userApplication ? (
            <p className="muted">Application status: {userApplication.application_status}</p>
          ) : (
            <p className="muted">You have not applied yet.</p>
          )}

          {job.employer_id !== session.userId ? (
            <div className="grid gap-2">
              {!userApplication || userApplication.application_status === "withdrawn" ? (
                <form action="/api/applications" method="post" className="stack-form">
                  <input type="hidden" name="action" value="apply" />
                  <input type="hidden" name="job_id" value={job.job_id} />
                  <label>
                    Cover Letter
                    <textarea name="cover_letter" rows={4} placeholder="Tell the employer why you are a good fit." />
                  </label>
                  <button className="btn btn-primary" type="submit">
                    Apply
                  </button>
                </form>
              ) : null}

              {userApplication?.application_status === "pending" ? (
                <form action="/api/applications" method="post">
                  <input type="hidden" name="action" value="withdraw" />
                  <input type="hidden" name="job_id" value={job.job_id} />
                  <button className="btn btn-outline" type="submit">
                    Withdraw Application
                  </button>
                </form>
              ) : null}

              <form action="/api/applications" method="post">
                <input type="hidden" name="action" value={isSaved ? "unsave" : "save"} />
                <input type="hidden" name="job_id" value={job.job_id} />
                <button className="btn btn-outline" type="submit">
                  {isSaved ? "Remove Saved Job" : "Save Job"}
                </button>
              </form>
            </div>
          ) : (
            <p className="muted">You are the employer for this job.</p>
          )}
        </section>
      ) : null}

      {session?.userType === "employer" && session.userId === job.employer_id ? (
        <section className="card space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-brand-ink">Applicants</h2>
          <div className="grid gap-3">
            {applications.length ? (
              applications.map((item) => (
                <article key={item.application_id} className="rounded-2xl border-2 border-brand-blue bg-brand-blue p-4">
                  <h3 className="text-base font-semibold text-brand-ink">{item.full_name}</h3>
                  <p className="muted">
                    {item.mobile_number} • Trust {item.trust_score}
                  </p>
                  <p className="muted">Status: {item.application_status}</p>
                  <p className="text-sm leading-6 text-brand-ink">{item.cover_letter || "No cover letter provided."}</p>
                  {item.application_status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action="/api/applications" method="post">
                        <input type="hidden" name="action" value="approve" />
                        <input type="hidden" name="job_id" value={job.job_id} />
                        <input type="hidden" name="application_id" value={item.application_id} />
                        <button className="btn btn-primary btn-small" type="submit">
                          Approve
                        </button>
                      </form>
                      <form action="/api/applications" method="post">
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="job_id" value={job.job_id} />
                        <input type="hidden" name="application_id" value={item.application_id} />
                        <button className="btn btn-outline btn-small" type="submit">
                          Reject
                        </button>
                      </form>
                      <Link className="btn btn-outline btn-small" href={`/messages?with=${item.worker_id}`}>
                        Message Worker
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="muted">No applications yet.</p>
            )}
          </div>
        </section>
      ) : null}

      {!session ? (
        <section className="card space-y-3">
          <p className="muted">Login to apply, save jobs, and message employers.</p>
          <Link href={`/login?redirect=/jobs/${job.job_id}`} className="btn btn-primary btn-small">
            Login to Continue
          </Link>
        </section>
      ) : null}
    </div>
  );
}
