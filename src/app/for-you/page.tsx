import Link from "next/link";
import { redirect } from "next/navigation";
import { JobCard } from "@/components/JobCard";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";

export default async function ForYouPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/for-you");
  }

  const [user] = await queryRows<{ user_id: number; user_type: string; region: string; city: string }>(
    "SELECT user_id, user_type, region, city FROM users WHERE user_id = ?",
    [session.userId]
  );

  const trendingJobs = await queryRows<
    Array<{ job_id: number; job_title: string; location_city: string; location_region: string; pay_amount: number; pay_type: string; job_status: string; employer_name: string; created_at: string; interaction_count: number }>
  >(
    "SELECT j.job_id, j.job_title, j.location_city, j.location_region, j.pay_amount, j.pay_type, j.job_status, j.created_at, u.full_name AS employer_name, COUNT(ui.interaction_id) AS interaction_count FROM job_posts j JOIN users u ON j.employer_id = u.user_id LEFT JOIN user_interactions ui ON ui.job_id = j.job_id AND ui.created_at >= NOW() - INTERVAL '7 days' WHERE j.job_status = 'active' GROUP BY j.job_id, j.job_title, j.location_city, j.location_region, j.pay_amount, j.pay_type, j.job_status, j.created_at, u.full_name ORDER BY interaction_count DESC, j.created_at DESC LIMIT 6"
  );

  if (user?.user_type === "worker") {
    const recommendedJobs = await queryRows<
      Array<{ job_id: number; job_title: string; location_city: string; location_region: string; pay_amount: number; pay_type: string; job_status: string; employer_name: string; created_at: string; match_score: number }>
    >(
      "SELECT DISTINCT j.job_id, j.job_title, j.location_city, j.location_region, j.pay_amount, j.pay_type, j.job_status, j.created_at, u.full_name AS employer_name, ((SELECT COUNT(*) FROM user_skills us WHERE us.user_id = ? AND j.required_skills LIKE ('%' || us.skill_name || '%')) * 3 + CASE WHEN j.location_region = ? THEN 2 ELSE 0 END + CASE WHEN j.location_city = ? THEN 1 ELSE 0 END + COALESCE(u.trust_score, 0)) AS match_score FROM job_posts j JOIN users u ON j.employer_id = u.user_id WHERE j.job_status = 'active' AND j.employer_id != ? AND j.job_id NOT IN (SELECT job_id FROM job_applications WHERE worker_id = ?) ORDER BY match_score DESC, j.created_at DESC LIMIT 15",
      [session.userId, user.region, user.city, session.userId, session.userId]
    );

    return (
      <div className="grid" style={{ gap: "1rem" }}>
        <section className="card">
          <h1 className="page-title">For You</h1>
          <p className="muted">Recommended jobs based on your skills and location.</p>
        </section>

        <section className="card">
          <h2>Top Matches</h2>
          <div className="grid" style={{ gap: "0.8rem" }}>
            {recommendedJobs.length ? (
              recommendedJobs.map((job) => (
                <div key={job.job_id}>
                  <JobCard job={job} />
                  <p className="muted" style={{ margin: "0.4rem 0 0" }}>
                    Match score: {Number(job.match_score).toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">No recommendations yet. Add more skills in your dashboard.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Trending Jobs</h2>
          <div className="grid" style={{ gap: "0.8rem" }}>
            {trendingJobs.map((job) => (
              <div key={job.job_id}>
                <JobCard job={job} />
                <p className="muted">Interactions this week: {job.interaction_count}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const employerJobs = await queryRows<{ required_skills: string | null }>(
    "SELECT required_skills FROM job_posts WHERE employer_id = ? AND job_status = 'active' ORDER BY created_at DESC LIMIT 5",
    [session.userId]
  );

  const allSkills = Array.from(
    new Set(
      employerJobs
        .flatMap((job) => (job.required_skills || "").split(","))
        .map((skill) => skill.trim())
        .filter(Boolean)
    )
  );

  let recommendedWorkers: Array<{
    user_id: number;
    full_name: string;
    city: string;
    province: string;
    trust_score: number;
    verified_skills_count: number;
    matched_skills: string;
  }> = [];

  if (allSkills.length) {
    const placeholders = allSkills.map(() => "?").join(",");
    recommendedWorkers = await queryRows<typeof recommendedWorkers>(
      `SELECT DISTINCT u.user_id, u.full_name, u.city, u.province, u.trust_score,
              (SELECT COUNT(*) FROM user_skills us2 WHERE us2.user_id = u.user_id AND us2.is_verified = TRUE) AS verified_skills_count,
              STRING_AGG(us.skill_name, ', ' ORDER BY us.skill_name ASC) AS matched_skills
       FROM users u
       JOIN user_skills us ON u.user_id = us.user_id
       WHERE u.user_type = 'worker' AND us.skill_name IN (${placeholders})
       GROUP BY u.user_id, u.full_name, u.city, u.province, u.trust_score
       ORDER BY verified_skills_count DESC, u.trust_score DESC
       LIMIT 12`,
      allSkills
    );
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title">For You</h1>
        <p className="muted">Recommended workers and high-traction jobs for employers.</p>
      </section>

      <section className="card">
        <h2>Suggested Workers</h2>
        <div className="grid" style={{ gap: "0.8rem" }}>
          {recommendedWorkers.length ? (
            recommendedWorkers.map((worker) => (
              <article key={worker.user_id} className="card" style={{ boxShadow: "none" }}>
                <h3>{worker.full_name}</h3>
                <p className="muted">
                  {worker.city}, {worker.province}
                </p>
                <p className="muted">Matched skills: {worker.matched_skills || "None"}</p>
                <p className="muted">Trust: {worker.trust_score}</p>
                <Link className="btn btn-outline btn-small" href={`/messages?with=${worker.user_id}`}>
                  Message Worker
                </Link>
              </article>
            ))
          ) : (
            <p className="muted">No worker recommendations yet. Post active jobs with skill requirements.</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Trending Jobs</h2>
        <div className="grid" style={{ gap: "0.8rem" }}>
          {trendingJobs.map((job) => (
            <div key={job.job_id}>
              <JobCard job={job} />
              <p className="muted">Interactions this week: {job.interaction_count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
